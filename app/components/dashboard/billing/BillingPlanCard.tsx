"use client";

import { useMemo, useState } from "react";

type BillingPlanCardProps = {
  currentPlan: "FREE" | "PRO";
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
};

type BillingInterval = "month" | "year";

function formatDate(dateIso: string | null) {
  if (!dateIso) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateIso));
}

export function BillingPlanCard({
  currentPlan,
  subscriptionStatus,
  currentPeriodEnd,
}: BillingPlanCardProps) {
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [error, setError] = useState("");

  const priceLabel = useMemo(() => {
    if (interval === "month") return "$5 / month";
    return "$48 / year";
  }, [interval]);

  async function handleUpgrade() {
    setError("");
    setIsLoadingCheckout(true);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setError("Unable to start checkout. Verify Stripe config and try again.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Unable to start checkout. Please try again.");
    } finally {
      setIsLoadingCheckout(false);
    }
  }

  async function handlePortal() {
    setError("");
    setIsLoadingPortal(true);
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setError("Unable to open billing portal.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Unable to open billing portal.");
    } finally {
      setIsLoadingPortal(false);
    }
  }

  const periodEndLabel = formatDate(currentPeriodEnd);

  return (
    <section className="surface-card rounded-[32px] bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Billing
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Plan and subscription</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Current plan: <span className="font-semibold text-[var(--text-primary)]">{currentPlan}</span>
            {subscriptionStatus ? ` (${subscriptionStatus})` : ""}
            {periodEndLabel ? ` · Renews on ${periodEndLabel}` : ""}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-bold ${
            currentPlan === "PRO"
              ? "border-[var(--stroke)] bg-[var(--text-primary)] text-white"
              : "border-[var(--stroke)] bg-[var(--bg-hero)] text-[var(--text-primary)]"
          }`}
        >
          {currentPlan}
        </span>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--stroke)]/25 bg-[#f8f8f4] p-4">
        <p className="text-sm font-semibold">Pro plan pricing</p>
        <div className="mt-3 inline-flex rounded-full border border-[var(--stroke)]/40 bg-white p-1">
          <button
            type="button"
            onClick={() => setInterval("month")}
            className={`focus-ring rounded-full px-3 py-1 text-sm font-semibold ${
              interval === "month" ? "bg-[var(--bg-hero)] text-[var(--text-primary)]" : "text-[var(--text-muted)]"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval("year")}
            className={`focus-ring rounded-full px-3 py-1 text-sm font-semibold ${
              interval === "year" ? "bg-[var(--bg-hero)] text-[var(--text-primary)]" : "text-[var(--text-muted)]"
            }`}
          >
            Yearly
          </button>
        </div>

        <p className="mt-3 text-xl font-bold tracking-tight">{priceLabel}</p>
        <p className="text-sm text-[var(--text-muted)]">
          Includes alias, expiry links, and advanced analytics.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={isLoadingCheckout}
            className="focus-ring hover-lift rounded-full border border-[var(--stroke)] bg-[var(--text-primary)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isLoadingCheckout ? "Redirecting..." : currentPlan === "PRO" ? "Change Plan" : "Upgrade to Pro"}
          </button>
          <button
            type="button"
            onClick={handlePortal}
            disabled={isLoadingPortal}
            className="focus-ring rounded-full border border-[var(--stroke)] bg-white px-5 py-2 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-60"
          >
            {isLoadingPortal ? "Opening..." : "Manage Billing"}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
    </section>
  );
}
