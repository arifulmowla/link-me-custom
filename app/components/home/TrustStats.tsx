const stats = [
  { label: "Links shortened", value: "1.8M+" },
  { label: "Monthly clicks", value: "27M+" },
  { label: "Uptime", value: "99.98%" },
];

const trustItems = ["Creators", "Startups", "Agencies", "E-commerce teams"];
const delayClassByIndex = ["motion-delay-1", "motion-delay-2", "motion-delay-3"];

export function TrustStats() {
  return (
    <section
      id="about"
      aria-labelledby="about-title"
      className="surface-card rounded-[32px] p-5 sm:p-7"
    >
      <div className="motion-fade-up motion-delay-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Trust and reliability
        </p>
        <h2 id="about-title" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Reliable links for public sharing
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
          Linkme is designed for creators and teams that need fast links, stable redirects,
          and clear performance reporting.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {stats.map((item, index) => (
          <div
            key={item.label}
            className={`hover-lift rounded-3xl border border-[var(--stroke)]/25 bg-[#fafaf8] p-5 motion-fade-up ${delayClassByIndex[index]}`}
          >
            <p className="text-sm font-semibold text-[var(--text-muted)]">{item.label}</p>
            <p className="mt-2 text-4xl font-black tracking-tight">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {trustItems.map((item) => (
          <span
            key={item}
            className="rounded-full border border-[var(--stroke)]/35 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
