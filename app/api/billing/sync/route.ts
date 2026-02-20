import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { syncUserPlanFromStripe } from "@/lib/billing";

const syncSchema = z.object({
  sessionId: z.string().min(1).optional(),
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

  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const result = await syncUserPlanFromStripe({
      userId,
      sessionId: parsed.data.sessionId,
    });
    return NextResponse.json({
      plan: result.plan,
      subscriptionStatus: result.subscriptionStatus,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_session") {
      return NextResponse.json({ error: "invalid_session" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "user_not_found") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }
}
