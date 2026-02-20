import type { AdvancedAnalyticsBreakdown, AdvancedAnalyticsResponse } from "@/lib/dashboard-types";

type ClickRow = {
  clickedAt: Date;
  ipHash: string;
  referrer: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  deviceType: string | null;
};

function referrerLabel(referrer: string | null) {
  if (!referrer) return "direct";
  try {
    return new URL(referrer).hostname || "direct";
  } catch {
    return "direct";
  }
}

function topList(map: Map<string, number>, limit = 5): AdvancedAnalyticsBreakdown[] {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, clicks]) => ({ name, clicks }));
}

export function buildAnalyticsResponse(clicks: ClickRow[]): AdvancedAnalyticsResponse {
  const seriesMap = new Map<string, number>();
  const referrerMap = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const regionMap = new Map<string, number>();
  const cityMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();
  const visitorSet = new Set<string>();

  for (const click of clicks) {
    const dateKey = click.clickedAt.toISOString().slice(0, 10);
    seriesMap.set(dateKey, (seriesMap.get(dateKey) ?? 0) + 1);

    const ref = referrerLabel(click.referrer);
    referrerMap.set(ref, (referrerMap.get(ref) ?? 0) + 1);

    const country = click.country || "unknown";
    countryMap.set(country, (countryMap.get(country) ?? 0) + 1);

    const region = click.region || "unknown";
    regionMap.set(region, (regionMap.get(region) ?? 0) + 1);

    const city = click.city || "unknown";
    cityMap.set(city, (cityMap.get(city) ?? 0) + 1);

    const device = click.deviceType || "unknown";
    deviceMap.set(device, (deviceMap.get(device) ?? 0) + 1);

    visitorSet.add(click.ipHash);
  }

  const timeSeries = Array.from(seriesMap.entries()).map(([date, clicksCount]) => ({
    date,
    clicks: clicksCount,
  }));

  return {
    timeSeries,
    uniqueVisitors: visitorSet.size,
    topReferrers: topList(referrerMap),
    topCountries: topList(countryMap),
    topRegions: topList(regionMap),
    topCities: topList(cityMap),
    topDevices: topList(deviceMap),
  };
}
