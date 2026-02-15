const featureItems = [
  {
    id: "01",
    title: "Fast redirects",
    description: "Low-latency links that open instantly across regions.",
  },
  {
    id: "02",
    title: "Custom aliases (Pro)",
    description: "Use readable short slugs for campaigns and sharing.",
  },
  {
    id: "03",
    title: "Analytics",
    description: "Track clicks, sources, and trends in one clean dashboard.",
  },
  {
    id: "04",
    title: "QR codes",
    description: "Generate downloadable QR codes for digital and print use.",
  },
  {
    id: "05",
    title: "Expiry links (Pro)",
    description: "Set links to expire automatically when campaigns end.",
  },
  {
    id: "06",
    title: "Secure filtering",
    description: "URL validation and abuse checks before links go live.",
  },
];

const howItWorks = [
  { step: "Paste", detail: "Insert your long URL into the hero input." },
  { step: "Shorten", detail: "Get a clean short link in one click." },
  { step: "Track", detail: "Monitor clicks and performance over time." },
];

const delayClassByIndex = ["", "motion-delay-1", "motion-delay-2", "motion-delay-3"];

export function FeatureGrid() {
  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="surface-card rounded-[32px] p-5 sm:p-7"
    >
      <div className="motion-fade-up motion-delay-1">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Features
        </p>
        <h2 id="features-title" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Built for speed and clean sharing
        </h2>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featureItems.map((item, index) => (
          <article
            key={item.id}
            className={`hover-lift rounded-3xl border border-[var(--stroke)]/20 bg-[#f8f8f4] p-4 motion-fade-up ${delayClassByIndex[Math.min(
              index + 1,
              3,
            )]}`}
          >
            <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--accent)]">
              {item.id}
            </p>
            <h3 className="mt-2 text-lg font-bold">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{item.description}</p>
          </article>
        ))}
      </div>

      <div id="how-it-works" className="mt-8 rounded-3xl border border-[var(--stroke)] bg-white p-5">
        <h3 className="text-2xl font-bold tracking-tight">How it works</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {howItWorks.map((item, index) => (
            <div
              key={item.step}
              className={`rounded-2xl bg-[#f6f6f3] p-4 motion-fade-up ${delayClassByIndex[index + 1]}`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Step {index + 1}</p>
              <p className="mt-1 text-lg font-bold">{item.step}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
