"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AdvancedAnalyticsResponse } from "@/lib/dashboard-types";

type AnalyticsCardProps = {
  plan: "FREE" | "PRO";
};

type AnalyticsState =
  | { status: "locked" }
  | { status: "loading" }
  | { status: "ready"; data: AdvancedAnalyticsResponse }
  | { status: "error"; message: string };

const windowOptions = [
  { label: "7D", value: "7" },
  { label: "30D", value: "30" },
  { label: "90D", value: "90" },
  { label: "All", value: "all" },
];

function formatDateLabel(date: string) {
  const value = new Date(date);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(value);
}

export function AnalyticsCard({ plan }: AnalyticsCardProps) {
  const [state, setState] = useState<AnalyticsState>(() =>
    plan === "PRO" ? { status: "loading" } : { status: "locked" },
  );
  const [windowValue, setWindowValue] = useState("30");

  useEffect(() => {
    if (plan !== "PRO") return;
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/analytics/advanced?window=${windowValue}`);
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

    load();
    return () => {
      cancelled = true;
    };
  }, [plan, windowValue]);

  const series = useMemo(() => {
    if (state.status !== "ready") return [];
    const points = state.data.timeSeries.slice(-14);
    const max = Math.max(1, ...points.map((point) => point.clicks));
    return points.map((point) => ({
      ...point,
      percent: Math.round((point.clicks / max) * 100),
    }));
  }, [state]);

  return (
    <section className="surface-card rounded-[28px] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Advanced analytics
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Traffic overview</h2>
        </div>
        <span className="rounded-full border border-[var(--stroke)]/30 bg-[var(--bg-hero)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
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
              className={`focus-ring rounded-full border px-3 py-1 text-xs font-semibold ${
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
        <div className="mt-4 rounded-2xl border border-[var(--stroke)]/30 bg-[#f8f8f4] p-4">
          <p className="text-sm text-[var(--text-muted)]">
            Unlock referrer and country insights, plus time-series click trends.
          </p>
          <Link
            href="/dashboard/billing"
            className="focus-ring hover-lift mt-3 inline-flex rounded-full border border-[var(--stroke)] bg-[var(--text-primary)] px-4 py-2 text-xs font-semibold text-white"
          >
            Upgrade to Pro
          </Link>
        </div>
      )}

      {state.status === "loading" && (
        <div className="mt-4 space-y-3">
          <div className="h-3 w-1/3 rounded-full bg-[#ecebe3]" />
          <div className="h-24 rounded-2xl bg-[#f3f2ea]" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-24 rounded-2xl bg-[#f3f2ea]" />
            <div className="h-24 rounded-2xl bg-[#f3f2ea]" />
          </div>
        </div>
      )}

      {state.status === "error" && (
        <p className="mt-4 text-sm font-medium text-red-700">{state.message}</p>
      )}

      {state.status === "ready" && (
        <div className="mt-4 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--stroke)]/25 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Unique visitors
              </p>
              <p className="mt-2 text-3xl font-bold">{state.data.uniqueVisitors}</p>
            </div>
            <div className="rounded-2xl border border-[var(--stroke)]/25 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Top device
              </p>
              <p className="mt-2 text-lg font-semibold">
                {state.data.topDevices[0]?.name ?? "Unknown"}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--stroke)]/25 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Top country
              </p>
              <p className="mt-2 text-lg font-semibold">
                {state.data.topCountries[0]?.name ?? "Unknown"}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--stroke)]/25 bg-[#fbfaf6] p-4">
            <div className="flex items-end justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--text-muted)]">Clicks over time</p>
              <p className="text-xs text-[var(--text-muted)]">{series.length} days</p>
            </div>
            {series.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--text-muted)]">No clicks yet.</p>
            ) : (
              <div className="mt-4 grid grid-cols-7 gap-2 sm:grid-cols-14">
                {series.map((point) => (
                  <div key={point.date} className="flex flex-col items-center gap-2">
                    <div className="h-16 w-2 rounded-full bg-[#edeade]">
                      <div
                        className="w-2 rounded-full bg-[var(--accent)]"
                        style={{ height: `${point.percent}%` }}
                        aria-hidden
                      />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {formatDateLabel(point.date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--stroke)]/25 bg-white p-4">
              <h3 className="text-sm font-semibold text-[var(--text-muted)]">Top referrers</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {state.data.topReferrers.length === 0 && (
                  <li className="text-[var(--text-muted)]">No referrers yet.</li>
                )}
                {state.data.topReferrers.map((item) => (
                  <li key={item.name} className="flex items-center justify-between">
                    <span className="truncate text-[var(--text-primary)]">{item.name}</span>
                    <span className="font-semibold text-[var(--text-primary)]">{item.clicks}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[var(--stroke)]/25 bg-white p-4">
              <h3 className="text-sm font-semibold text-[var(--text-muted)]">Top countries</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {state.data.topCountries.length === 0 && (
                  <li className="text-[var(--text-muted)]">No country data yet.</li>
                )}
                {state.data.topCountries.map((item) => (
                  <li key={item.name} className="flex items-center justify-between">
                    <span className="truncate text-[var(--text-primary)]">{item.name}</span>
                    <span className="font-semibold text-[var(--text-primary)]">{item.clicks}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[var(--stroke)]/25 bg-white p-4">
              <h3 className="text-sm font-semibold text-[var(--text-muted)]">Top regions</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {state.data.topRegions.length === 0 && (
                  <li className="text-[var(--text-muted)]">No region data yet.</li>
                )}
                {state.data.topRegions.map((item) => (
                  <li key={item.name} className="flex items-center justify-between">
                    <span className="truncate text-[var(--text-primary)]">{item.name}</span>
                    <span className="font-semibold text-[var(--text-primary)]">{item.clicks}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[var(--stroke)]/25 bg-white p-4">
              <h3 className="text-sm font-semibold text-[var(--text-muted)]">Top cities</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {state.data.topCities.length === 0 && (
                  <li className="text-[var(--text-muted)]">No city data yet.</li>
                )}
                {state.data.topCities.map((item) => (
                  <li key={item.name} className="flex items-center justify-between">
                    <span className="truncate text-[var(--text-primary)]">{item.name}</span>
                    <span className="font-semibold text-[var(--text-primary)]">{item.clicks}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[var(--stroke)]/25 bg-white p-4 sm:col-span-2">
              <h3 className="text-sm font-semibold text-[var(--text-muted)]">Top devices</h3>
              <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {state.data.topDevices.length === 0 && (
                  <li className="text-[var(--text-muted)]">No device data yet.</li>
                )}
                {state.data.topDevices.map((item) => (
                  <li key={item.name} className="flex items-center justify-between">
                    <span className="truncate text-[var(--text-primary)]">{item.name}</span>
                    <span className="font-semibold text-[var(--text-primary)]">{item.clicks}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
