import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripeClient, upsertSubscriptionFromStripeSubscription } from "@/lib/billing";

export const runtime = "nodejs";

type ProcessResult = {
  customerId: string | null;
  subscriptionId: string | null;
  userId: string | null;
  result: "processed" | "ignored" | "user_unmapped";
};

function logWebhook(details: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      route: "/api/stripe/webhook",
      ...details,
    }),
  );
}

async function processStripeEvent(event: Stripe.Event): Promise<ProcessResult> {
  const stripe = getStripeClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
      const userId = session.client_reference_id ?? session.metadata?.userId ?? null;

      if (userId && customerId) {
        await db.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customerId },
        });
      }

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? null;

      if (subscriptionId && customerId) {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        const syncResult = await upsertSubscriptionFromStripeSubscription(stripeSubscription, customerId, {
          userIdHint: userId,
        });
        return {
          customerId,
          subscriptionId,
          userId,
          result: syncResult ? "processed" : "user_unmapped",
        };
      }

      return {
        customerId,
        subscriptionId,
        userId,
        result: "ignored",
      };
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id ?? null;
      const userId = subscription.metadata?.userId ?? null;

      if (customerId) {
        const syncResult = await upsertSubscriptionFromStripeSubscription(subscription, customerId, {
          userIdHint: userId,
        });
        return {
          customerId,
          subscriptionId: subscription.id,
          userId,
          result: syncResult ? "processed" : "user_unmapped",
        };
      }

      return {
        customerId,
        subscriptionId: subscription.id,
        userId,
        result: "ignored",
      };
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceSubscription = invoice.parent?.subscription_details?.subscription;
      const subscriptionId =
        typeof invoiceSubscription === "string"
          ? invoiceSubscription
          : invoiceSubscription?.id ?? null;
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
      const userId = invoice.parent?.subscription_details?.metadata?.userId ?? null;

      if (subscriptionId && customerId) {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        const syncResult = await upsertSubscriptionFromStripeSubscription(stripeSubscription, customerId, {
          userIdHint: userId,
        });
        return {
          customerId,
          subscriptionId,
          userId,
          result: syncResult ? "processed" : "user_unmapped",
        };
      }

      return {
        customerId,
        subscriptionId,
        userId,
        result: "ignored",
      };
    }
    default:
      return {
        customerId: null,
        subscriptionId: null,
        userId: null,
        result: "ignored",
      };
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
    logWebhook({
      event: "stripe_webhook_duplicate",
      stripeEventId: event.id,
      stripeEventType: event.type,
    });
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
    const result = await processStripeEvent(event);
    await db.stripeEvent.update({
      where: { id: event.id },
      data: {
        status: "processed",
        processedAt: new Date(),
      },
    });
    logWebhook({
      event: "stripe_webhook_processed",
      stripeEventId: event.id,
      stripeEventType: event.type,
      customerId: result.customerId,
      subscriptionId: result.subscriptionId,
      userId: result.userId,
      result: result.result,
    });
  } catch (error) {
    await db.stripeEvent.update({
      where: { id: event.id },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "unknown_error",
      },
    });
    logWebhook({
      event: "stripe_webhook_failed",
      stripeEventId: event.id,
      stripeEventType: event.type,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.json({ error: "webhook_processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
