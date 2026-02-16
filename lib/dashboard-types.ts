export type DashboardKpis = {
  totalLinks: number;
  totalClicks: number;
  clicksLast7d: number;
};

export type DashboardLinkItem = {
  id: string;
  code: string;
  targetUrl: string;
  createdAt: string;
  clickCount: number;
};

export type DashboardLinksResponse = {
  kpis: DashboardKpis;
  links: DashboardLinkItem[];
};
