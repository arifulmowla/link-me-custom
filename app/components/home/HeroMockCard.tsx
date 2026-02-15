const mockLinks = [
  { label: "youtube.com/@tumbercook", clicks: "14.2k" },
  { label: "shop.linkme.app/new-drop", clicks: "9.7k" },
  { label: "newsletter.linkme.app/win", clicks: "5.1k" },
];

export function HeroMockCard() {
  return (
    <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
      <div className="surface-card rounded-[28px] bg-white px-5 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Creator page
            </p>
            <h3 className="mt-1 text-xl font-bold">Tumber Cook</h3>
          </div>
          <div className="rounded-full border-[1.5px] border-[var(--stroke)] bg-[var(--bg-hero)] px-3 py-1 text-xs font-semibold">
            Pro
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {mockLinks.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-2xl border border-[var(--stroke)]/30 bg-[#f9f9f7] px-3 py-3"
            >
              <p className="truncate text-sm font-medium">{item.label}</p>
              <span className="ml-3 text-xs font-bold text-[var(--success)]">{item.clicks}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="surface-card absolute -left-8 -top-6 rounded-2xl bg-white px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Reach
        </p>
        <p className="mt-1 text-2xl font-extrabold">234k</p>
        <p className="text-xs text-[var(--text-muted)]">Last 7 days</p>
      </div>
    </div>
  );
}
