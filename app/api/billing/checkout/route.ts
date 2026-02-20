import { NextRequest, NextResponse } from "next/server";
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

  const customerId = await ensureStripeCustomer(user);
  const appUrl = getAppUrl(request.nextUrl.origin);

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/billing?status=success`,
    cancel_url: `${appUrl}/dashboard/billing?status=cancel`,
    client_reference_id: user.id,
    metadata: {
      userId: user.id,
      interval,
    },
    allow_promotion_codes: false,
  });

  if (!checkoutSession.url) {
    return NextResponse.json({ error: "checkout_url_missing" }, { status: 500 });
  }

  return NextResponse.json({ url: checkoutSession.url });
}
