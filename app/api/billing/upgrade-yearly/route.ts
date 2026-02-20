import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { scheduleYearlyUpgrade } from "@/lib/billing";

const upgradeSchema = z.object({
  fromPlan: z.literal("monthly").optional(),
});

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 500 });
  }

  let body: unknown = {};
  try {
    const rawBody = await request.text();
    body = rawBody ? (JSON.parse(rawBody) as unknown) : {};
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = upgradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const subscription = await db.subscription.findUnique({
    where: { userId },
    select: {
      status: true,
      stripePriceId: true,
      stripeSubscriptionId: true,
    },
  });

  if (!subscription?.stripeSubscriptionId || !subscription.stripePriceId) {
    return NextResponse.json({ error: "not_on_monthly" }, { status: 400 });
  }

  const activeStatuses = new Set(["active", "trialing", "past_due"]);
  const isActive = activeStatuses.has(subscription.status);
  const monthlyPriceId = process.env.STRIPE_PRICE_PRO_MONTHLY_USD ?? "";
  const yearlyPriceId = process.env.STRIPE_PRICE_PRO_YEARLY_USD ?? "";

  if (!isActive || subscription.stripePriceId !== monthlyPriceId) {
    return NextResponse.json({ error: "not_on_monthly" }, { status: 400 });
  }

  try {
    const result = await scheduleYearlyUpgrade({
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      monthlyPriceId,
      yearlyPriceId,
    });
    return NextResponse.json({
      status: "scheduled",
      effectiveAt: result.effectiveAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "already_yearly") {
        return NextResponse.json({ error: "already_yearly" }, { status: 409 });
      }
      if (error.message === "not_on_monthly") {
        return NextResponse.json({ error: "not_on_monthly" }, { status: 400 });
      }
      if (error.message === "period_already_ended") {
        return NextResponse.json({ error: "period_already_ended" }, { status: 409 });
      }
      if (error.message === "missing_period") {
        return NextResponse.json({ error: "missing_period" }, { status: 500 });
      }
      if (error.message === "subscription_missing_price") {
        return NextResponse.json({ error: "subscription_missing_price" }, { status: 500 });
      }
      console.error("billing_upgrade_yearly_failed", {
        userId,
        reason: error.message,
      });
      return NextResponse.json({ error: "schedule_failed" }, { status: 500 });
    }
    return NextResponse.json({ error: "schedule_failed" }, { status: 500 });
  }
}
