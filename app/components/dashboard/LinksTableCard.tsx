"use client";

import { EmptyLinksState } from "@/app/components/dashboard/EmptyLinksState";
import type { DashboardLinkItem } from "@/lib/dashboard-types";

type LinksTableCardProps = {
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
  links,
  pendingDeleteId,
  copiedCode,
  onDelete,
  onCopy,
}: LinksTableCardProps) {
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

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              <th className="px-3 py-2">Short</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Clicks</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id} className="rounded-2xl bg-[#f8f8f4] text-sm">
                <td className="rounded-l-2xl px-3 py-3 font-semibold">{link.code}</td>
                <td className="max-w-xs truncate px-3 py-3 text-[var(--text-muted)]">{link.targetUrl}</td>
                <td className="px-3 py-3 font-semibold">{link.clickCount}</td>
                <td className="px-3 py-3 text-[var(--text-muted)]">{formatDate(link.createdAt)}</td>
                <td className="rounded-r-2xl px-3 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onCopy(link.code)}
                      className="focus-ring rounded-full border border-[var(--stroke)] px-3 py-1 text-xs font-semibold"
                    >
                      {copiedCode === link.code ? "Copied" : "Copy"}
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
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
