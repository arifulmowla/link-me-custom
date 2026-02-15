export function FooterCta() {
  return (
    <section className="surface-card flex flex-col items-start justify-between gap-4 rounded-[28px] bg-[var(--text-primary)] px-5 py-6 text-white sm:flex-row sm:items-center sm:px-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
          Ready to start
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Create and share your first short link in minutes
        </h2>
      </div>
      <a
        className="focus-ring hover-lift rounded-full border border-white bg-white px-5 py-3 text-sm font-bold text-[var(--text-primary)]"
        href="#"
      >
        Create free account
      </a>
    </section>
  );
}
