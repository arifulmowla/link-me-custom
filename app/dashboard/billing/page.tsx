import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { DashboardShell } from "@/app/components/dashboard/DashboardShell";
import { BillingPlanCard } from "@/app/components/dashboard/billing/BillingPlanCard";

export default async function BillingPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const [user, subscription] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        planTier: true,
      },
    }),
    db.subscription.findUnique({
      where: { userId },
      select: {
        status: true,
        currentPeriodEnd: true,
      },
    }),
  ]);

  return (
    <DashboardShell name={session.user?.name} email={session.user?.email}>
      <BillingPlanCard
        currentPlan={user?.planTier ?? "FREE"}
        subscriptionStatus={subscription?.status ?? null}
        currentPeriodEnd={subscription?.currentPeriodEnd?.toISOString() ?? null}
      />
    </DashboardShell>
  );
}
