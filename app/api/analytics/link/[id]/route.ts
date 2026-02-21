import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { buildAnalyticsResponse } from "@/lib/analytics";
import { canUseAdvancedAnalytics } from "@/lib/plans";

export const runtime = "nodejs";

type WindowKey = "7" | "30" | "90" | "all";

function parseWindow(value: string | null): WindowKey {
  if (value === "7" || value === "30" || value === "90" || value === "all") return value;
  return "30";
}

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { planTier: true },
  });

  const plan = user?.planTier ?? "FREE";
  if (!canUseAdvancedAnalytics(plan)) {
    return NextResponse.json({ error: "pro_required" }, { status: 402 });
  }

  const { id } = await Promise.resolve(context.params);

  const link = await db.link.findFirst({
    where: { id, ownerUserId: userId },
    select: { id: true },
  });

  if (!link) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const windowParam = parseWindow(request.nextUrl.searchParams.get("window"));
  const since =
    windowParam === "all"
      ? null
      : (() => {
          const start = new Date();
          start.setUTCDate(start.getUTCDate() - Number(windowParam));
          return start;
        })();

  const clicks = await db.linkClick.findMany({
    where: {
      linkId: link.id,
      ...(since ? { clickedAt: { gte: since } } : {}),
    },
    select: {
      clickedAt: true,
      ipHash: true,
      referrer: true,
      country: true,
      region: true,
      city: true,
      deviceType: true,
    },
    orderBy: {
      clickedAt: "asc",
    },
  });

  return NextResponse.json(buildAnalyticsResponse(clicks), {
    headers: {
      "Cache-Control": "private, max-age=60",
    },
  });
}
