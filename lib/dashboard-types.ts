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
};
