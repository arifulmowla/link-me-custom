import Stripe from "stripe";
import type { PlanTier, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type BillingInterval = "month" | "year";

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
    return user.stripeCustomerId;
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

export async function upsertSubscriptionFromStripeSubscription(
  stripeSubscription: Stripe.Subscription,
  stripeCustomerId: string,
) {
  const user = await db.user.findFirst({
    where: { stripeCustomerId },
    select: { id: true },
  });

  if (!user) {
    return null;
  }

  const { periodStart, periodEnd } = getSubscriptionPeriod(stripeSubscription);

  const planTier = derivePlanTier(stripeSubscription);
  const stripePriceId = stripeSubscription.items.data[0]?.price?.id ?? null;

  const subscriptionData: Prisma.SubscriptionUncheckedCreateInput = {
    userId: user.id,
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
    where: { userId: user.id },
    create: subscriptionData,
    update: subscriptionData,
  });

  await db.user.update({
    where: { id: user.id },
    data: { planTier },
  });

  return { userId: user.id, planTier };
}
