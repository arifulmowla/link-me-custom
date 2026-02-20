"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type BillingPlanCardProps = {
  currentPlan: "FREE" | "PRO";
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  isActiveMonthly: boolean;
  isActiveYearly: boolean;
};

type BillingInterval = "month" | "year";
type BillingSyncResponse = {
  plan?: "FREE" | "PRO";
  subscriptionStatus?: string;
  syncedAt?: string;
  error?: string;
};
type UpgradeYearlyResponse = {
  status?: "scheduled";
  effectiveAt?: string;
  error?: string;
};

function formatDate(dateIso: string | null) {
  if (!dateIso) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateIso));
}

function mapCheckoutError(errorCode?: string) {
  switch (errorCode) {
    case "billing_not_configured":
      return "Billing is not configured. Add Stripe environment values and restart dev server.";
    case "price_not_configured":
      return "Pro price IDs are missing or invalid.";
    case "billing_resource_missing":
      return "Stripe customer or price was not found for this account.";
    case "billing_provider_error":
      return "Stripe checkout failed. Confirm keys and price IDs are from the same Stripe account.";
    case "already_subscribed_monthly":
      return "You are already on the monthly plan. Use billing portal to manage it.";
    case "already_on_monthly_use_upgrade_endpoint":
      return "Monthly plan detected. Use the Yearly upgrade to schedule the change.";
    case "already_subscribed_yearly":
      return "You are already on the yearly plan.";
    case "unauthorized":
      return "Your session expired. Please sign in again.";
    default:
      return "Unable to start checkout. Verify Stripe config and try again.";
  }
}

function mapSyncError(errorCode?: string) {
  switch (errorCode) {
    case "invalid_session":
      return "Checkout session is invalid or does not belong to this account.";
    case "sync_failed":
      return "Unable to confirm subscription yet. Retry in a few seconds.";
    case "billing_not_configured":
      return "Billing is not configured on the server.";
    default:
      return "Sync failed. Please retry.";
  }
}

function mapUpgradeError(errorCode?: string) {
  switch (errorCode) {
    case "not_on_monthly":
      return "Yearly upgrade is only available when you are on an active monthly plan.";
    case "period_already_ended":
      return "The current billing period already ended. Refresh and try again.";
    case "already_yearly":
      return "You are already on the yearly plan.";
    default:
      return "Unable to schedule yearly upgrade.";
  }
}

export function BillingPlanCard({
  currentPlan,
  subscriptionStatus,
  currentPeriodEnd,
  isActiveMonthly,
  isActiveYearly,
}: BillingPlanCardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [error, setError] = useState("");
  const attemptedSyncKey = useRef<string | null>(null);

  const priceLabel = useMemo(() => {
    if (interval === "month") return "$5 / month";
    return "$48 / year";
  }, [interval]);

  const runBillingSync = useCallback(
    async (sessionId?: string) => {
      setError("");
      setIsSyncing(true);
      setSyncState("syncing");
      setSyncMessage("Processing your upgrade...");

      try {
        const response = await fetch("/api/billing/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sessionId ? { sessionId } : {}),
        });
        const data = (await response.json().catch(() => ({}))) as BillingSyncResponse;

        if (!response.ok) {
          setSyncState("error");
          setSyncMessage(mapSyncError(data.error));
          return;
        }

        if (data.plan === "PRO") {
          setSyncState("success");
          setSyncMessage("Upgrade active: Pro unlocked.");
        } else {
          setSyncState("error");
          setSyncMessage("Checkout completed but plan is still FREE. Retry sync in a moment.");
        }

        const params = new URLSearchParams(searchParams.toString());
        params.delete("session_id");
        if (params.get("status") === "success") {
          params.set("status", "synced");
        }
        const nextQuery = params.toString();
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
        router.refresh();
      } catch {
        setSyncState("error");
        setSyncMessage("Sync failed. Please retry.");
      } finally {
        setIsSyncing(false);
      }
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const status = searchParams.get("status");
    const sessionId = searchParams.get("session_id") ?? undefined;

    if (status === "success") {
      const attemptKey = `success:${sessionId ?? ""}`;
      if (attemptedSyncKey.current !== attemptKey) {
        attemptedSyncKey.current = attemptKey;
        void runBillingSync(sessionId);
      }
      return;
    }

    if (status === "cancel") {
      setSyncState("idle");
      setSyncMessage("Checkout was canceled.");
      return;
    }

    if (status === "synced" && syncState !== "success") {
      setSyncState("success");
      setSyncMessage("Billing sync completed.");
    }
  }, [runBillingSync, searchParams, syncState]);

  useEffect(() => {
    if (isActiveMonthly && interval === "month") {
      setInterval("year");
    }
  }, [interval, isActiveMonthly]);

  async function handleUpgrade() {
    setError("");
    setIsLoadingCheckout(true);
    try {
      if (isActiveMonthly && interval === "year") {
        setIsLoadingCheckout(false);
        void handleYearlyUpgrade();
        return;
      }
      if (isActiveMonthly && interval === "month") {
        setIsLoadingCheckout(false);
        void handlePortal();
        return;
      }
      if (isActiveYearly) {
        setIsLoadingCheckout(false);
        void handlePortal();
        return;
      }

      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        if (data.error === "already_subscribed_monthly") {
          void handlePortal();
          return;
        }
        if (data.error === "already_on_monthly_use_upgrade_endpoint") {
          void handleYearlyUpgrade();
          return;
        }
        if (data.error === "already_subscribed_yearly") {
          void handlePortal();
          return;
        }
        setError(mapCheckoutError(data.error));
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
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        if (data.error === "no_billing_customer") {
          setError("No Stripe customer found yet. Complete checkout first.");
        } else {
          setError("Unable to open billing portal.");
        }
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Unable to open billing portal.");
    } finally {
      setIsLoadingPortal(false);
    }
  }

  async function handleYearlyUpgrade() {
    setError("");
    setIsScheduling(true);
    setScheduledAt(null);
    try {
      const response = await fetch("/api/billing/upgrade-yearly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromPlan: "monthly" }),
      });
      const data = (await response.json().catch(() => ({}))) as UpgradeYearlyResponse;
      if (!response.ok || !data.effectiveAt) {
        setError(mapUpgradeError(data.error));
        return;
      }
      setScheduledAt(data.effectiveAt);
      setSyncState("success");
      setSyncMessage("Yearly upgrade scheduled.");
      router.refresh();
    } catch {
      setError("Unable to schedule yearly upgrade.");
    } finally {
      setIsScheduling(false);
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
            disabled={isActiveMonthly}
            className={`focus-ring rounded-full px-3 py-1 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
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
            disabled={isLoadingCheckout || isScheduling}
            className="focus-ring hover-lift rounded-full border border-[var(--stroke)] bg-[var(--text-primary)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isLoadingCheckout
              ? "Redirecting..."
              : isScheduling
                ? "Scheduling..."
                : currentPlan === "PRO"
                  ? "Change Plan"
                  : "Upgrade to Pro"}
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

      {syncState === "syncing" && (
        <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{syncMessage}</p>
      )}
      {syncState === "success" && (
        <p className="mt-3 text-sm font-medium text-[var(--success)]">{syncMessage}</p>
      )}
      {syncState === "error" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-red-700">{syncMessage}</p>
          <button
            type="button"
            onClick={() => {
              const sessionId = searchParams.get("session_id") ?? undefined;
              void runBillingSync(sessionId);
            }}
            disabled={isSyncing}
            className="focus-ring rounded-full border border-[var(--stroke)] bg-white px-3 py-1 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-60"
          >
            {isSyncing ? "Retrying..." : "Retry sync"}
          </button>
        </div>
      )}
      {scheduledAt && (
        <p className="mt-3 text-sm font-medium text-[var(--text-muted)]">
          Your yearly plan will start on {formatDate(scheduledAt)} after the current monthly period ends.
        </p>
      )}
      {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
    </section>
  );
}
