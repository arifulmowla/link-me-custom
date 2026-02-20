import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { canUseAdvancedAnalytics } from "@/lib/plans";

export const runtime = "nodejs";

function referrerLabel(referrer: string | null) {
  if (!referrer) return "direct";
  try {
    return new URL(referrer).hostname || "direct";
  } catch {
    return "direct";
  }
}

export async function GET() {
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

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);

  const clicks = await db.linkClick.findMany({
    where: {
      clickedAt: { gte: since },
      link: { ownerUserId: userId },
    },
    select: {
      clickedAt: true,
      referrer: true,
      country: true,
    },
    orderBy: {
      clickedAt: "asc",
    },
  });

  const seriesMap = new Map<string, number>();
  const referrerMap = new Map<string, number>();
  const countryMap = new Map<string, number>();

  for (const click of clicks) {
    const dateKey = click.clickedAt.toISOString().slice(0, 10);
    seriesMap.set(dateKey, (seriesMap.get(dateKey) ?? 0) + 1);

    const ref = referrerLabel(click.referrer);
    referrerMap.set(ref, (referrerMap.get(ref) ?? 0) + 1);

    const country = click.country || "unknown";
    countryMap.set(country, (countryMap.get(country) ?? 0) + 1);
  }

  const timeSeries = Array.from(seriesMap.entries()).map(([date, clicksCount]) => ({
    date,
    clicks: clicksCount,
  }));

  const topReferrers = Array.from(referrerMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, clicksCount]) => ({ name, clicks: clicksCount }));

  const topCountries = Array.from(countryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, clicksCount]) => ({ name, clicks: clicksCount }));

  return NextResponse.json({
    timeSeries,
    topReferrers,
    topCountries,
  });
}
