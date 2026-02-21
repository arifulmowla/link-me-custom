"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
      <section className="surface-card w-full max-w-lg rounded-[32px] bg-white p-6 text-center sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          404 error
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          The page you are looking for doesn’t exist or was moved.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="focus-ring hover-lift rounded-full border border-[var(--stroke)] bg-[var(--text-primary)] px-5 py-2 text-sm font-semibold text-white"
          >
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
