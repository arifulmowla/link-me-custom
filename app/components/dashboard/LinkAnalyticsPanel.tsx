"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AdvancedAnalyticsResponse } from "@/lib/dashboard-types";

type LinkAnalyticsPanelProps = {
  plan: "FREE" | "PRO";
  linkId: string;
};

const windowOptions = [
  { label: "7D", value: "7" },
  { label: "30D", value: "30" },
  { label: "90D", value: "90" },
  { label: "All", value: "all" },
];

type AnalyticsState =
  | { status: "locked" }
  | { status: "loading" }
  | { status: "ready"; data: AdvancedAnalyticsResponse }
  | { status: "error"; message: string };

function formatDateLabel(date: string) {
  const value = new Date(date);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(value);
}

export function LinkAnalyticsPanel({ plan, linkId }: LinkAnalyticsPanelProps) {
  const [windowValue, setWindowValue] = useState("30");
  const [state, setState] = useState<AnalyticsState>(() =>
    plan === "PRO" ? { status: "loading" } : { status: "locked" },
  );

  useEffect(() => {
    if (plan !== "PRO") return;
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/analytics/link/${linkId}?window=${windowValue}`);
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          if (error?.error === "pro_required") {
            if (!cancelled) setState({ status: "locked" });
            return;
          }
          throw new Error("Failed to load analytics.");
        }
        const data = (await response.json()) as AdvancedAnalyticsResponse;
        if (!cancelled) setState({ status: "ready", data });
      } catch (err) {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Failed to load analytics.",
          });
        }
      }
    }

    setState({ status: "loading" });
    load();
    return () => {
      cancelled = true;
    };
  }, [plan, linkId, windowValue]);

  const series = useMemo(() => {
    if (state.status !== "ready") return [];
    const points = state.data.timeSeries.slice(-10);
    const max = Math.max(1, ...points.map((point) => point.clicks));
    return points.map((point) => ({
      ...point,
      percent: Math.round((point.clicks / max) * 100),
    }));
  }, [state]);

  return (
    <div className="mt-4 rounded-2xl border border-[var(--stroke)]/25 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Link analytics</p>
        <span className="rounded-full border border-[var(--stroke)]/30 bg-[var(--bg-hero)] px-3 py-1 text-[10px] font-semibold text-[var(--text-primary)]">
          {plan === "PRO" ? "Pro" : "Pro only"}
        </span>
      </div>

      {plan === "PRO" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {windowOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setWindowValue(option.value)}
              className={`focus-ring rounded-full border px-3 py-1 text-[11px] font-semibold ${
                windowValue === option.value
                  ? "border-[var(--stroke)] bg-[var(--bg-hero)] text-[var(--text-primary)]"
                  : "border-[var(--stroke)]/30 bg-white text-[var(--text-muted)]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {state.status === "locked" && (
        <div className="mt-3 rounded-2xl border border-[var(--stroke)]/30 bg-[#f8f8f4] p-3 text-sm text-[var(--text-muted)]">
          Upgrade to Pro to view per-link analytics.
          <Link href="/dashboard/billing" className="ml-2 font-semibold underline underline-offset-2">
            Upgrade
          </Link>
        </div>
      )}

      {state.status === "loading" && (
        <div className="mt-3 space-y-3">
          <div className="h-3 w-1/3 rounded-full bg-[#ecebe3]" />
          <div className="h-16 rounded-2xl bg-[#f3f2ea]" />
          <div className="h-16 rounded-2xl bg-[#f3f2ea]" />
        </div>
      )}

      {state.status === "error" && (
        <p className="mt-3 text-sm font-medium text-red-700">{state.message}</p>
      )}

      {state.status === "ready" && (
        <div className="mt-3 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--stroke)]/25 bg-[#fbfaf6] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Unique visitors
              </p>
              <p className="mt-1 text-xl font-bold">{state.data.uniqueVisitors}</p>
            </div>
            <div className="rounded-2xl border border-[var(--stroke)]/25 bg-[#fbfaf6] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Top device
              </p>
              <p className="mt-1 text-sm font-semibold">
                {state.data.topDevices[0]?.name ?? "Unknown"}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--stroke)]/25 bg-[#fbfaf6] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Top country
              </p>
              <p className="mt-1 text-sm font-semibold">
                {state.data.topCountries[0]?.name ?? "Unknown"}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--stroke)]/25 bg-[#fbfaf6] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Clicks trend
            </p>
            {series.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">No clicks yet.</p>
            ) : (
              <div className="mt-3 flex items-end gap-2">
                {series.map((point) => (
                  <div key={point.date} className="flex flex-col items-center">
                    <div className="h-12 w-2 rounded-full bg-[#edeade]">
                      <div
                        className="w-2 rounded-full bg-[var(--accent)]"
                        style={{ height: `${point.percent}%` }}
                        aria-hidden
                      />
                    </div>
                    <span className="mt-1 text-[10px] text-[var(--text-muted)]">
                      {formatDateLabel(point.date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--stroke)]/25 bg-white p-3">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Referrers
              </h4>
              <ul className="mt-2 space-y-1 text-sm">
                {state.data.topReferrers.slice(0, 3).map((item) => (
                  <li key={item.name} className="flex items-center justify-between">
                    <span className="truncate">{item.name}</span>
                    <span className="font-semibold">{item.clicks}</span>
                  </li>
                ))}
                {state.data.topReferrers.length === 0 && (
                  <li className="text-[var(--text-muted)]">No data yet.</li>
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-[var(--stroke)]/25 bg-white p-3">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Countries
              </h4>
              <ul className="mt-2 space-y-1 text-sm">
                {state.data.topCountries.slice(0, 3).map((item) => (
                  <li key={item.name} className="flex items-center justify-between">
                    <span className="truncate">{item.name}</span>
                    <span className="font-semibold">{item.clicks}</span>
                  </li>
                ))}
                {state.data.topCountries.length === 0 && (
                  <li className="text-[var(--text-muted)]">No data yet.</li>
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-[var(--stroke)]/25 bg-white p-3">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Devices
              </h4>
              <ul className="mt-2 space-y-1 text-sm">
                {state.data.topDevices.slice(0, 3).map((item) => (
                  <li key={item.name} className="flex items-center justify-between">
                    <span className="truncate">{item.name}</span>
                    <span className="font-semibold">{item.clicks}</span>
                  </li>
                ))}
                {state.data.topDevices.length === 0 && (
                  <li className="text-[var(--text-muted)]">No data yet.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
