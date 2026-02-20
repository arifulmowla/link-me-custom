"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import type { DashboardUsage } from "@/lib/dashboard-types";

type CreateLinkCardProps = {
  plan: "FREE" | "PRO";
  usage: DashboardUsage;
  onCreated: (payload: { id: string; code: string; targetUrl: string; expiresAt: string | null }) => void;
};

export function CreateLinkCard({ plan, usage, onCreated }: CreateLinkCardProps) {
  const isPro = plan === "PRO";
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          alias: alias.trim() || undefined,
          expiresAt: expiresAt || undefined,
        }),
      });

      const data = (await response.json()) as
        | { id: string; code: string; targetUrl: string; expiresAt: string | null }
        | { error: string };

      if (!response.ok) {
        const errorCode = "error" in data ? data.error : "server_error";
        if (errorCode === "invalid_url") {
          setError("Please enter a valid URL.");
        } else if (errorCode === "pro_required") {
          setError("This feature requires Pro. Upgrade from the billing page.");
        } else if (errorCode === "free_limit_reached") {
          setError("Free plan active-link limit reached. Upgrade to Pro to continue.");
        } else if (errorCode === "invalid_alias") {
          setError("Alias must be alphanumeric and not a reserved path.");
        } else if (errorCode === "alias_taken") {
          setError("This alias is already in use.");
        } else if (errorCode === "invalid_expires_at") {
          setError("Expiry must be a future date/time.");
        } else {
          setError("Failed to create link.");
        }
        return;
      }

      if (!("id" in data) || !("code" in data) || !("targetUrl" in data) || !("expiresAt" in data)) {
        setError("Unexpected response.");
        return;
      }

      onCreated({
        id: data.id,
        code: data.code,
        targetUrl: data.targetUrl,
        expiresAt: data.expiresAt,
      });
      setUrl("");
      setAlias("");
      setExpiresAt("");
    } catch {
      setError("Network issue. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="create-link" className="surface-card rounded-[28px] bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        Create link
      </p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight">Shorten a new URL</h2>

      <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
        <label htmlFor="dashboard-url" className="sr-only">
          URL to shorten
        </label>
        <input
          id="dashboard-url"
          type="text"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com/very-long-url"
          className="focus-ring h-12 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 text-sm sm:col-span-2"
        />
        <label htmlFor="dashboard-alias" className="sr-only">
          Custom alias
        </label>
        <input
          id="dashboard-alias"
          type="text"
          value={alias}
          onChange={(event) => setAlias(event.target.value)}
          placeholder={isPro ? "Custom alias (optional)" : "Custom alias (Pro)"}
          disabled={!isPro}
          className="focus-ring h-11 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 text-sm disabled:cursor-not-allowed disabled:bg-[#f1f1ec]"
        />
        <label htmlFor="dashboard-expiry" className="sr-only">
          Expiry date
        </label>
        <input
          id="dashboard-expiry"
          type="datetime-local"
          value={expiresAt}
          onChange={(event) => setExpiresAt(event.target.value)}
          disabled={!isPro}
          className="focus-ring h-11 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 text-sm disabled:cursor-not-allowed disabled:bg-[#f1f1ec]"
        />
        <button
          type="submit"
          disabled={isSubmitting || !url.trim()}
          className="focus-ring hover-lift h-12 rounded-2xl border border-[var(--stroke)] bg-[var(--bg-hero)] px-5 text-sm font-semibold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-70 sm:col-span-2"
        >
          {isSubmitting ? "Creating..." : "Create Link"}
        </button>
      </form>

      {!isPro && (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Alias and expiry are Pro-only.{" "}
          <Link href="/dashboard/billing" className="font-semibold underline underline-offset-2">
            Upgrade here
          </Link>
          .
        </p>
      )}

      {usage.activeLinksLimit !== null && (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Active links usage: {usage.activeLinks}/{usage.activeLinksLimit}
        </p>
      )}

      {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
    </section>
  );
}
