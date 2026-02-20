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
        stripePriceId: true,
      },
    }),
  ]);

  const activeStatuses = new Set(["active", "trialing", "past_due"]);
  const monthlyPriceId = process.env.STRIPE_PRICE_PRO_MONTHLY_USD ?? "";
  const yearlyPriceId = process.env.STRIPE_PRICE_PRO_YEARLY_USD ?? "";
  const isActive = subscription?.status ? activeStatuses.has(subscription.status) : false;
  const isActiveMonthly = Boolean(isActive && subscription?.stripePriceId === monthlyPriceId);
  const isActiveYearly = Boolean(isActive && subscription?.stripePriceId === yearlyPriceId);

  return (
    <DashboardShell name={session.user?.name} email={session.user?.email}>
      <BillingPlanCard
        currentPlan={user?.planTier ?? "FREE"}
        subscriptionStatus={subscription?.status ?? null}
        currentPeriodEnd={subscription?.currentPeriodEnd?.toISOString() ?? null}
        isActiveMonthly={isActiveMonthly}
        isActiveYearly={isActiveYearly}
      />
    </DashboardShell>
  );
}
