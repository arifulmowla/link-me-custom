import Stripe from "stripe";
import type { PlanTier, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type BillingInterval = "month" | "year";
export type SyncUserPlanInput = {
  userId: string;
  sessionId?: string;
};
export type SyncUserPlanResult = {
  plan: PlanTier;
  subscriptionStatus: string;
};
export type ScheduleUpgradeResult = {
  scheduleId: string;
  effectiveAt: Date;
};

const PRO_STATUS_SET = new Set(["active", "trialing", "past_due"]);
let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("billing_not_configured");
  }

  stripeClient = new Stripe(secretKey);
  return stripeClient;
}

function isResourceMissingError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "resource_missing"
  );
}

function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  const periodStart = item?.current_period_start
    ? new Date(item.current_period_start * 1000)
    : null;
  const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000) : null;
  return { periodStart, periodEnd };
}

export function getAppUrl(fallbackOrigin?: string) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_BASE_URL ??
    fallbackOrigin ??
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

export function getPriceIdForInterval(interval: BillingInterval) {
  if (interval === "month") return process.env.STRIPE_PRICE_PRO_MONTHLY_USD ?? "";
  return process.env.STRIPE_PRICE_PRO_YEARLY_USD ?? "";
}

export async function ensureStripeCustomer(user: {
  id: string;
  email: string | null;
  name: string | null;
  stripeCustomerId: string | null;
}) {
  const stripe = getStripeClient();

  if (user.stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      if (!("deleted" in customer && customer.deleted)) {
        return customer.id;
      }
    } catch (error) {
      if (!isResourceMissingError(error)) {
        throw error;
      }
    }
  }

  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  });

  await db.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

function derivePlanTier(subscription: Stripe.Subscription): PlanTier {
  const status = subscription.status;
  if (!PRO_STATUS_SET.has(status)) return "FREE";

  const { periodEnd } = getSubscriptionPeriod(subscription);
  if (subscription.cancel_at_period_end && periodEnd) {
    const endAt = periodEnd.getTime();
    if (Date.now() > endAt) return "FREE";
  }

  return "PRO";
}

function subscriptionRank(status: string) {
  if (status === "active") return 100;
  if (status === "trialing") return 90;
  if (status === "past_due") return 80;
  if (status === "incomplete") return 70;
  if (status === "paused") return 60;
  if (status === "unpaid") return 50;
  if (status === "canceled") return 10;
  return 0;
}

function selectBestSubscription(subscriptions: Stripe.Subscription[]) {
  if (subscriptions.length === 0) return null;
  return subscriptions
    .slice()
    .sort((a, b) => {
      const rankDiff = subscriptionRank(b.status) - subscriptionRank(a.status);
      if (rankDiff !== 0) return rankDiff;

      const aCreated = typeof a.created === "number" ? a.created : 0;
      const bCreated = typeof b.created === "number" ? b.created : 0;
      return bCreated - aCreated;
    })[0];
}

async function resolveUserIdForCustomer(stripeCustomerId: string, userIdHint?: string | null) {
  const linkedUser = await db.user.findFirst({
    where: { stripeCustomerId },
    select: { id: true },
  });
  if (linkedUser) {
    return linkedUser.id;
  }

  if (!userIdHint) {
    return null;
  }

  const hintedUser = await db.user.findUnique({
    where: { id: userIdHint },
    select: { id: true },
  });
  if (!hintedUser) {
    return null;
  }

  await db.user.update({
    where: { id: hintedUser.id },
    data: { stripeCustomerId },
  });

  return hintedUser.id;
}

export async function upsertSubscriptionFromStripeSubscription(
  stripeSubscription: Stripe.Subscription,
  stripeCustomerId: string,
  options?: { userIdHint?: string | null },
) {
  const userId = await resolveUserIdForCustomer(stripeCustomerId, options?.userIdHint);
  if (!userId) {
    return null;
  }

  const { periodStart, periodEnd } = getSubscriptionPeriod(stripeSubscription);

  const planTier = derivePlanTier(stripeSubscription);
  const stripePriceId = stripeSubscription.items.data[0]?.price?.id ?? null;

  const subscriptionData: Prisma.SubscriptionUncheckedCreateInput = {
    userId,
    planTier,
    status: stripeSubscription.status,
    stripeCustomerId,
    stripeSubscriptionId: stripeSubscription.id,
    stripePriceId,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: Boolean(stripeSubscription.cancel_at_period_end),
  };

  await db.subscription.upsert({
    where: { userId },
    create: subscriptionData,
    update: subscriptionData,
  });

  await db.user.update({
    where: { id: userId },
    data: { planTier },
  });

  return { userId, planTier };
}

export async function syncUserPlanFromStripe({
  userId,
  sessionId,
}: SyncUserPlanInput): Promise<SyncUserPlanResult> {
  const stripe = getStripeClient();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, stripeCustomerId: true },
  });

  if (!user) {
    throw new Error("user_not_found");
  }

  let customerId = user.stripeCustomerId;
  let subscription: Stripe.Subscription | null = null;

  if (sessionId) {
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["customer", "subscription"],
      });
    } catch (error) {
      if (isResourceMissingError(error)) {
        throw new Error("invalid_session");
      }
      throw error;
    }

    const sessionUserId = session.client_reference_id ?? session.metadata?.userId ?? null;
    if (sessionUserId && sessionUserId !== userId) {
      throw new Error("invalid_session");
    }

    const sessionCustomerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;
    if (!sessionCustomerId) {
      throw new Error("invalid_session");
    }

    customerId = sessionCustomerId;
    if (sessionCustomerId !== user.stripeCustomerId) {
      await db.user.update({
        where: { id: userId },
        data: { stripeCustomerId: sessionCustomerId },
      });
    }

    const sessionSubscription = session.subscription;
    if (typeof sessionSubscription === "string") {
      subscription = await stripe.subscriptions.retrieve(sessionSubscription);
    } else if (sessionSubscription) {
      subscription = sessionSubscription;
    }
  }

  if (!subscription && customerId) {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 10,
      });
      subscription = selectBestSubscription(subscriptions.data);
    } catch (error) {
      if (isResourceMissingError(error)) {
        customerId = null;
      } else {
        throw error;
      }
    }
  }

  if (subscription && customerId) {
    const synced = await upsertSubscriptionFromStripeSubscription(subscription, customerId, {
      userIdHint: userId,
    });
    if (!synced) {
      throw new Error("sync_failed");
    }
    return {
      plan: synced.planTier,
      subscriptionStatus: subscription.status,
    };
  }

  const freeStatus = "none";
  if (customerId) {
    await db.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planTier: "FREE",
        status: freeStatus,
        stripeCustomerId: customerId,
      },
      update: {
        planTier: "FREE",
        status: freeStatus,
        stripeCustomerId: customerId,
        stripeSubscriptionId: null,
        stripePriceId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    });
  }

  await db.user.update({
    where: { id: userId },
    data: {
      planTier: "FREE",
      ...(customerId ? { stripeCustomerId: customerId } : {}),
    },
  });

  return {
    plan: "FREE",
    subscriptionStatus: freeStatus,
  };
}

export async function scheduleYearlyUpgrade(args: {
  stripeSubscriptionId: string;
  monthlyPriceId: string;
  yearlyPriceId: string;
}): Promise<ScheduleUpgradeResult> {
  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(args.stripeSubscriptionId, {
    expand: ["schedule"],
  });

  const currentItem = subscription.items.data[0];
  const currentPriceId = currentItem?.price?.id ?? null;
  if (!currentPriceId) {
    throw new Error("subscription_missing_price");
  }

  if (currentPriceId === args.yearlyPriceId) {
    throw new Error("already_yearly");
  }

  if (currentPriceId !== args.monthlyPriceId) {
    throw new Error("not_on_monthly");
  }

  const periodEnd = currentItem?.current_period_end;

  if (!periodEnd) {
    throw new Error("missing_period");
  }

  const now = Math.floor(Date.now() / 1000);
  if (periodEnd <= now) {
    throw new Error("period_already_ended");
  }

  let scheduleId: string;
  let phaseStart: number | "now" = "now";
  if (subscription.schedule) {
    const schedule =
      typeof subscription.schedule === "string"
        ? await stripe.subscriptionSchedules.retrieve(subscription.schedule)
        : subscription.schedule;

    phaseStart = schedule.current_phase?.start_date ?? schedule.phases[0]?.start_date ?? "now";

    if (schedule.status === "released" || schedule.status === "canceled" || schedule.status === "completed") {
      const created = await stripe.subscriptionSchedules.create({
        from_subscription: subscription.id,
      });
      scheduleId = created.id;
      phaseStart = "now";
    } else {
      scheduleId = schedule.id;
    }
  } else {
    const created = await stripe.subscriptionSchedules.create({
      from_subscription: subscription.id,
    });
    scheduleId = created.id;
    phaseStart = "now";
  }

  await stripe.subscriptionSchedules.update(scheduleId, {
    end_behavior: "release",
    phases: [
      {
        start_date: phaseStart,
        end_date: periodEnd,
        items: [{ price: args.monthlyPriceId, quantity: 1 }],
        proration_behavior: "none",
      },
      {
        start_date: periodEnd,
        items: [{ price: args.yearlyPriceId, quantity: 1 }],
        proration_behavior: "none",
      },
    ],
  });

  return { scheduleId, effectiveAt: new Date(periodEnd * 1000) };
}
