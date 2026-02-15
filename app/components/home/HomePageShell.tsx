import { FeatureGrid } from "@/app/components/home/FeatureGrid";
import { FooterCta } from "@/app/components/home/FooterCta";
import { HeroSection } from "@/app/components/home/HeroSection";
import { MainNav } from "@/app/components/home/MainNav";
import { TrustStats } from "@/app/components/home/TrustStats";

export function HomePageShell() {
  return (
    <div className="min-h-screen bg-transparent text-[var(--text-primary)]">
      <header className="px-4 pt-6 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl motion-fade-up">
          <MainNav />
        </div>
      </header>

      <main className="px-4 pb-10 pt-4 sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:gap-10">
          <HeroSection />
          <FeatureGrid />
          <TrustStats />
        </div>
      </main>

      <footer className="px-4 pb-10 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl motion-fade-up motion-delay-3">
          <FooterCta />
        </div>
      </footer>
    </div>
  );
}
