import { HeroMockCard } from "@/app/components/home/HeroMockCard";
import { HeroShortenForm } from "@/app/components/home/HeroShortenForm";

export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden rounded-[32px] border-[1.5px] border-[var(--stroke)] bg-[var(--bg-hero)] px-5 py-8 shadow-[var(--shadow-soft)] sm:px-8 sm:py-10 lg:px-10"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 bottom-8 h-44 w-44 rounded-full bg-[var(--accent)]/35 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-12 top-4 h-28 w-28 rounded-full bg-white/35 blur-2xl"
      />

      <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <div className="motion-fade-up">
          <span className="inline-flex rounded-full border-[1.5px] border-[var(--stroke)] bg-[var(--accent)]/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-primary)]">
            Minimal Link Management for Creators
          </span>
          <h1
            id="hero-title"
            className="mt-4 max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.5rem]"
          >
            Shorten links.
            <br />
            Share cleanly.
            <br />
            Track what matters.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--text-muted)] sm:text-lg">
            Turn long URLs into branded short links and monitor clicks with a fast,
            clean dashboard.
          </p>

          <HeroShortenForm />

          <a
            className="focus-ring mt-5 inline-flex rounded-full px-1 py-1 text-sm font-semibold text-[var(--text-primary)] underline decoration-[var(--accent)] decoration-2 underline-offset-4 hover:text-[var(--text-muted)]"
            href="#how-it-works"
          >
            See how it works
          </a>
        </div>

        <div className="motion-fade-up motion-delay-1">
          <HeroMockCard />
        </div>
      </div>
    </section>
  );
}
