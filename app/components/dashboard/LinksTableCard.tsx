"use client";

import { Fragment, useState } from "react";
import { EmptyLinksState } from "@/app/components/dashboard/EmptyLinksState";
import { LinkAnalyticsPanel } from "@/app/components/dashboard/LinkAnalyticsPanel";
import type { DashboardLinkItem } from "@/lib/dashboard-types";

type LinksTableCardProps = {
  plan: "FREE" | "PRO";
  links: DashboardLinkItem[];
  pendingDeleteId: string;
  copiedCode: string;
  onDelete: (id: string) => void;
  onCopy: (code: string) => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function LinksTableCard({
  plan,
  links,
  pendingDeleteId,
  copiedCode,
  onDelete,
  onCopy,
}: LinksTableCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleAnalytics(linkId: string) {
    setExpandedId((prev) => (prev === linkId ? null : linkId));
  }

  if (links.length === 0) {
    return (
      <section className="surface-card rounded-[28px] bg-white p-5 sm:p-6">
        <EmptyLinksState
          onCreateClick={() => {
            const el = document.getElementById("create-link");
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />
      </section>
    );
  }

  return (
    <section className="surface-card rounded-[28px] bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Your links</h2>
        <p className="text-sm text-[var(--text-muted)]">{links.length} total</p>
      </div>

      <div className="mt-4 grid gap-3 md:hidden">
        {links.map((link) => (
          <div
            key={link.id}
            className="rounded-2xl border border-[var(--stroke)]/25 bg-[#f8f8f4] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Short link
                </p>
                <p className="mt-1 text-sm font-semibold">{link.code}</p>
              </div>
              <button
                type="button"
                onClick={() => onCopy(link.code)}
                className="focus-ring rounded-full border border-[var(--stroke)] px-3 py-1 text-xs font-semibold"
              >
                {copiedCode === link.code ? "Copied" : "Copy"}
              </button>
            </div>

            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Target
            </p>
            <p className="mt-1 truncate text-sm text-[var(--text-muted)]">{link.targetUrl}</p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Clicks
                </p>
                <p className="mt-1 font-semibold">{link.clickCount}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Expiry
                </p>
                <p className="mt-1 text-[var(--text-muted)]">
                  {link.expiresAt ? formatDate(link.expiresAt) : "Never"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Created
                </p>
                <p className="mt-1 text-[var(--text-muted)]">{formatDate(link.createdAt)}</p>
              </div>
              <div className="flex items-end justify-end">
                <button
                  type="button"
                  onClick={() => onDelete(link.id)}
                  disabled={pendingDeleteId === link.id}
                  className="focus-ring rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 disabled:opacity-60"
                >
                  {pendingDeleteId === link.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => toggleAnalytics(link.id)}
                className="focus-ring rounded-full border border-[var(--stroke)] px-3 py-1 text-xs font-semibold"
              >
                {expandedId === link.id ? "Hide analytics" : "View analytics"}
              </button>
              {plan === "FREE" && (
                <span className="rounded-full border border-[var(--stroke)]/30 bg-[var(--bg-hero)] px-2 py-1 text-[10px] font-semibold text-[var(--text-primary)]">
                  Pro
                </span>
              )}
            </div>

            {expandedId === link.id && <LinkAnalyticsPanel plan={plan} linkId={link.id} />}
          </div>
        ))}
      </div>

      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              <th className="px-3 py-2">Short</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Clicks</th>
              <th className="px-3 py-2">Expiry</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <Fragment key={link.id}>
                <tr className="rounded-2xl bg-[#f8f8f4] text-sm">
                  <td className="rounded-l-2xl px-3 py-3 font-semibold">{link.code}</td>
                  <td className="max-w-xs truncate px-3 py-3 text-[var(--text-muted)]">
                    {link.targetUrl}
                  </td>
                  <td className="px-3 py-3 font-semibold">{link.clickCount}</td>
                  <td className="px-3 py-3 text-[var(--text-muted)]">
                    {link.expiresAt ? formatDate(link.expiresAt) : "Never"}
                  </td>
                  <td className="px-3 py-3 text-[var(--text-muted)]">{formatDate(link.createdAt)}</td>
                  <td className="rounded-r-2xl px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onCopy(link.code)}
                        className="focus-ring rounded-full border border-[var(--stroke)] px-3 py-1 text-xs font-semibold"
                      >
                        {copiedCode === link.code ? "Copied" : "Copy"}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleAnalytics(link.id)}
                        className="focus-ring rounded-full border border-[var(--stroke)] px-3 py-1 text-xs font-semibold"
                      >
                        {expandedId === link.id ? "Hide analytics" : "Analytics"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(link.id)}
                        disabled={pendingDeleteId === link.id}
                        className="focus-ring rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 disabled:opacity-60"
                      >
                        {pendingDeleteId === link.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === link.id && (
                  <tr className="text-sm">
                    <td colSpan={6} className="px-3 pb-3">
                      <LinkAnalyticsPanel plan={plan} linkId={link.id} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
