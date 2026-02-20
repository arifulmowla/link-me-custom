import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripeClient, upsertSubscriptionFromStripeSubscription } from "@/lib/billing";

export const runtime = "nodejs";

async function processStripeEvent(event: Stripe.Event) {
  const stripe = getStripeClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id;
      const userId = session.client_reference_id ?? session.metadata?.userId;

      if (userId && customerId) {
        await db.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customerId },
        });
      }

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (subscriptionId && customerId) {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertSubscriptionFromStripeSubscription(stripeSubscription, customerId);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;

      if (customerId) {
        await upsertSubscriptionFromStripeSubscription(subscription, customerId);
      }
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceSubscription = invoice.parent?.subscription_details?.subscription;
      const subscriptionId =
        typeof invoiceSubscription === "string"
          ? invoiceSubscription
          : invoiceSubscription?.id;
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

      if (subscriptionId && customerId) {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertSubscriptionFromStripeSubscription(stripeSubscription, customerId);
      }
      break;
    }
    default:
      break;
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 500 });
  }

  const stripe = getStripeClient();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return NextResponse.json(
      { error: "invalid_signature", message: error instanceof Error ? error.message : "unknown" },
      { status: 400 },
    );
  }

  const existing = await db.stripeEvent.findUnique({
    where: { id: event.id },
    select: { status: true },
  });

  if (existing?.status === "processed") {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  await db.stripeEvent.upsert({
    where: { id: event.id },
    create: {
      id: event.id,
      type: event.type,
      status: "received",
    },
    update: {
      type: event.type,
      status: "received",
      errorMessage: null,
      processedAt: null,
    },
  });

  try {
    await processStripeEvent(event);
    await db.stripeEvent.update({
      where: { id: event.id },
      data: {
        status: "processed",
        processedAt: new Date(),
      },
    });
  } catch (error) {
    await db.stripeEvent.update({
      where: { id: event.id },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "unknown_error",
      },
    });
    throw error;
  }

  return NextResponse.json({ ok: true });
}
