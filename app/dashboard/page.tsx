import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { DashboardShell } from "@/app/components/dashboard/DashboardShell";
import { DashboardClient } from "@/app/components/dashboard/DashboardClient";
import type { DashboardKpis, DashboardLinkItem, DashboardUsage } from "@/lib/dashboard-types";
import { activeLinksLimitForPlan, monthStartUtc, trackedClicksLimitForPlan } from "@/lib/plans";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const monthStart = monthStartUtc();
  const now = new Date();

  const [user, linksRaw, totalClicks, clicksLast7d, usageMonth, activeLinks] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { planTier: true },
    }),
    db.link.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        targetUrl: true,
        createdAt: true,
        expiresAt: true,
        _count: {
          select: {
            clicks: true,
          },
        },
      },
    }),
    db.linkClick.count({
      where: {
        link: { ownerUserId: userId },
      },
    }),
    db.linkClick.count({
      where: {
        clickedAt: { gte: sevenDaysAgo },
        link: { ownerUserId: userId },
      },
    }),
    db.usageMonthly.findUnique({
      where: {
        userId_monthStart: {
          userId,
          monthStart,
        },
      },
      select: {
        trackedClicks: true,
      },
    }),
    db.link.count({
      where: {
        ownerUserId: userId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
  ]);

  const plan = user?.planTier ?? "FREE";
  const links: DashboardLinkItem[] = linksRaw.map((link) => ({
    id: link.id,
    code: link.code,
    targetUrl: link.targetUrl,
    createdAt: link.createdAt.toISOString(),
    expiresAt: link.expiresAt?.toISOString() ?? null,
    clickCount: link._count.clicks,
  }));

  const kpis: DashboardKpis = {
    totalLinks: links.length,
    totalClicks,
    clicksLast7d,
  };

  const usage: DashboardUsage = {
    activeLinks,
    activeLinksLimit: activeLinksLimitForPlan(plan),
    trackedClicksThisMonth: usageMonth?.trackedClicks ?? 0,
    trackedClicksLimit: trackedClicksLimitForPlan(plan),
  };

  return (
    <DashboardShell name={session.user?.name} email={session.user?.email}>
      <DashboardClient initialPlan={plan} initialUsage={usage} initialKpis={kpis} initialLinks={links} />
    </DashboardShell>
  );
}
