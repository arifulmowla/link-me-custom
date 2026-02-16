import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { DashboardShell } from "@/app/components/dashboard/DashboardShell";
import { DashboardClient } from "@/app/components/dashboard/DashboardClient";
import type { DashboardKpis, DashboardLinkItem } from "@/lib/dashboard-types";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

  const [linksRaw, totalClicks, clicksLast7d] = await Promise.all([
    db.link.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        targetUrl: true,
        createdAt: true,
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
  ]);

  const links: DashboardLinkItem[] = linksRaw.map((link) => ({
    id: link.id,
    code: link.code,
    targetUrl: link.targetUrl,
    createdAt: link.createdAt.toISOString(),
    clickCount: link._count.clicks,
  }));

  const kpis: DashboardKpis = {
    totalLinks: links.length,
    totalClicks,
    clicksLast7d,
  };

  return (
    <DashboardShell name={session.user?.name} email={session.user?.email}>
      <DashboardClient initialKpis={kpis} initialLinks={links} />
    </DashboardShell>
  );
}
