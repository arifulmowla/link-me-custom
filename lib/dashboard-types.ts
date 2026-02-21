export type DashboardKpis = {
  totalLinks: number;
  totalClicks: number;
  clicksLast7d: number;
};

export type DashboardUsage = {
  activeLinks: number;
  activeLinksLimit: number | null;
  trackedClicksThisMonth: number;
  trackedClicksLimit: number | null;
};

export type DashboardLinkItem = {
  id: string;
  code: string;
  targetUrl: string;
  createdAt: string;
  expiresAt: string | null;
  clickCount: number;
};

export type DashboardLinksResponse = {
  plan: "FREE" | "PRO";
  usage: DashboardUsage;
  kpis: DashboardKpis;
  links: DashboardLinkItem[];
  nextCursor?: string | null;
};

export type AdvancedAnalyticsSeriesPoint = {
  date: string;
  clicks: number;
};

export type AdvancedAnalyticsBreakdown = {
  name: string;
  clicks: number;
};

export type AdvancedAnalyticsResponse = {
  timeSeries: AdvancedAnalyticsSeriesPoint[];
  uniqueVisitors: number;
  topReferrers: AdvancedAnalyticsBreakdown[];
  topCountries: AdvancedAnalyticsBreakdown[];
  topRegions: AdvancedAnalyticsBreakdown[];
  topCities: AdvancedAnalyticsBreakdown[];
  topDevices: AdvancedAnalyticsBreakdown[];
};
