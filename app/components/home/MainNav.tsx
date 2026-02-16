import Link from "next/link";
import { auth } from "@/auth";

const navItems = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#about", label: "About" },
];

export async function MainNav() {
  const session = await auth();
  const dashboardHref = session?.user ? "/dashboard" : "/login";

  return (
    <nav
      aria-label="Primary"
      className="surface-card flex flex-wrap items-center justify-between gap-4 rounded-[28px] px-5 py-4 sm:px-7"
    >
      <Link
        className="focus-ring hover-lift rounded-full border border-transparent px-3 py-2 text-lg font-bold tracking-tight"
        href="/"
      >
        Linkme
      </Link>

      <ul className="hidden items-center gap-6 text-sm font-semibold text-[var(--text-muted)] md:flex">
        {navItems.map((item) => (
          <li key={item.href}>
            <a
              className="focus-ring rounded-full px-3 py-2 hover:text-[var(--text-primary)]"
              href={item.href}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          className="focus-ring rounded-full px-4 py-2 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          href="/login"
        >
          {session?.user ? "Account" : "Login"}
        </Link>
        <Link
          className="focus-ring hover-lift rounded-full border border-[var(--stroke)] bg-[var(--text-primary)] px-4 py-2 text-sm font-semibold text-white"
          href={dashboardHref}
        >
          {session?.user ? "Dashboard" : "Get Started"}
        </Link>
      </div>
    </nav>
  );
}
