"use client";

import { FormEvent, useState } from "react";

type CreateLinkCardProps = {
  onCreated: (payload: { id: string; code: string; targetUrl: string }) => void;
};

export function CreateLinkCard({ onCreated }: CreateLinkCardProps) {
  const [url, setUrl] = useState("");
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
        body: JSON.stringify({ url }),
      });

      const data = (await response.json()) as
        | { id: string; code: string; targetUrl: string }
        | { error: string };

      if (!response.ok) {
        const errorCode = "error" in data ? data.error : "server_error";
        setError(errorCode === "invalid_url" ? "Please enter a valid URL." : "Failed to create link.");
        return;
      }

      if (!("id" in data) || !("code" in data) || !("targetUrl" in data)) {
        setError("Unexpected response.");
        return;
      }

      onCreated({
        id: data.id,
        code: data.code,
        targetUrl: data.targetUrl,
      });
      setUrl("");
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

      <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
        <label htmlFor="dashboard-url" className="sr-only">
          URL to shorten
        </label>
        <input
          id="dashboard-url"
          type="text"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com/very-long-url"
          className="focus-ring h-12 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 text-sm"
        />
        <button
          type="submit"
          disabled={isSubmitting || !url.trim()}
          className="focus-ring hover-lift h-12 rounded-2xl border border-[var(--stroke)] bg-[var(--bg-hero)] px-5 text-sm font-semibold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Creating..." : "Create Link"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
    </section>
  );
}
