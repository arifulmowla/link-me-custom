type LoginCardProps = {
  googleConfigured: boolean;
  onGoogleSignIn: () => Promise<void>;
};

export function LoginCard({ googleConfigured, onGoogleSignIn }: LoginCardProps) {
  return (
    <section className="surface-card motion-fade-up w-full max-w-md rounded-[32px] bg-white p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        Welcome back
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Sign in to urlsy.co</h1>
      <p className="mt-3 text-sm text-[var(--text-muted)]">
        Continue with your Google account to access your dashboard, links, and analytics.
      </p>

      <form action={onGoogleSignIn} className="mt-6">
        <button
          type="submit"
          disabled={!googleConfigured}
          className="focus-ring hover-lift flex h-12 w-full items-center justify-center gap-3 rounded-2xl border-[1.5px] border-[var(--stroke)] bg-[var(--text-primary)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-[var(--text-primary)]"
          >
            G
          </span>
          Sign in with Google
        </button>
      </form>

      {!googleConfigured && (
        <p className="mt-3 text-xs text-red-700">
          Google auth is not configured. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
        </p>
      )}
    </section>
  );
}
