import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  ensureStripeCustomer,
  getAppUrl,
  getPriceIdForInterval,
  getStripeClient,
  type BillingInterval,
} from "@/lib/billing";

const checkoutSchema = z.object({
  interval: z.enum(["month", "year"]),
});

export const runtime = "nodejs";

function mapCheckoutError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "resource_missing"
  ) {
    return { error: "billing_resource_missing", status: 400 };
  }

  return { error: "billing_provider_error", status: 500 };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 500 });
  }
  const stripe = getStripeClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const interval = parsed.data.interval as BillingInterval;
  const priceId = getPriceIdForInterval(interval);
  if (!priceId) {
    return NextResponse.json({ error: "price_not_configured" }, { status: 500 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      stripeCustomerId: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const subscription = await db.subscription.findUnique({
    where: { userId },
    select: { status: true, stripePriceId: true },
  });
  const activeStatuses = new Set(["active", "trialing", "past_due"]);
  const isActive = subscription?.status ? activeStatuses.has(subscription.status) : false;
  const monthlyPriceId = process.env.STRIPE_PRICE_PRO_MONTHLY_USD ?? "";
  const yearlyPriceId = process.env.STRIPE_PRICE_PRO_YEARLY_USD ?? "";
  const isActiveMonthly = Boolean(isActive && subscription?.stripePriceId === monthlyPriceId);
  const isActiveYearly = Boolean(isActive && subscription?.stripePriceId === yearlyPriceId);

  if (interval === "month" && isActiveMonthly) {
    return NextResponse.json({ error: "already_subscribed_monthly" }, { status: 409 });
  }

  if (interval === "year" && isActiveMonthly) {
    return NextResponse.json(
      { error: "already_on_monthly_use_upgrade_endpoint" },
      { status: 409 },
    );
  }

  if (interval === "month" && isActiveYearly) {
    return NextResponse.json({ error: "already_subscribed_yearly" }, { status: 409 });
  }

  let customerId: string;
  try {
    customerId = await ensureStripeCustomer(user);
  } catch (error) {
    const mapped = mapCheckoutError(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
  const appUrl = getAppUrl(request.nextUrl.origin);

  let checkoutSession: Stripe.Checkout.Session;
  try {
    checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/billing?status=cancel`,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        interval,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          interval,
        },
      },
      allow_promotion_codes: false,
    });
  } catch (error) {
    const mapped = mapCheckoutError(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }

  if (!checkoutSession.url) {
    return NextResponse.json({ error: "checkout_url_missing" }, { status: 500 });
  }

  return NextResponse.json({ url: checkoutSession.url });
}
