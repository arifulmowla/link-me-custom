import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildAnalyticsResponse } from "@/lib/analytics";
import { getUserIdFromRequest } from "@/lib/auth-user";
import { canUseAdvancedAnalytics } from "@/lib/plans";

export const runtime = "nodejs";

type WindowKey = "7" | "30" | "90" | "all";

function parseWindow(value: string | null): WindowKey {
  if (value === "7" || value === "30" || value === "90" || value === "all") return value;
  return "30";
}

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
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
      ...(since ? { clickedAt: { gte: since } } : {}),
      link: { ownerUserId: userId },
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

  const analytics = buildAnalyticsResponse(clicks);

  return NextResponse.json(analytics, {
    headers: {
      "Cache-Control": "private, max-age=60",
    },
  });
}
