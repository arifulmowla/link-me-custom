"use client";

import Link from "next/link";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
      <section
        role="alert"
        className="surface-card w-full max-w-lg rounded-[32px] bg-white p-6 text-center sm:p-8"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Something went wrong
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">We hit an unexpected error.</h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Please try again or return to the homepage.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="focus-ring hover-lift rounded-full border border-[var(--stroke)] bg-[var(--text-primary)] px-5 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="focus-ring rounded-full border border-[var(--stroke)]/35 bg-white px-5 py-2 text-sm font-semibold text-[var(--text-primary)]"
          >
            Reload
          </button>
          <Link
            href="/"
            className="focus-ring rounded-full border border-[var(--stroke)]/35 bg-white px-5 py-2 text-sm font-semibold text-[var(--text-primary)]"
          >
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
