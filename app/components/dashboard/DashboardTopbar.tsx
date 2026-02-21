import Link from "next/link";
import { signOut } from "@/auth";
import { ProfileMenu } from "@/app/components/dashboard/ProfileMenu";

type DashboardTopbarProps = {
  name?: string | null;
  email?: string | null;
};

function userInitial(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "U";
  return source[0]?.toUpperCase() ?? "U";
}

export function DashboardTopbar({ name, email }: DashboardTopbarProps) {
  const initial = userInitial(name, email);

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <header className="motion-fade-up">
      <nav
        aria-label="Dashboard"
        className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-[28px] px-4 py-4 sm:px-6"
      >
        <Link
        className="focus-ring rounded-full border border-transparent px-3 py-2 text-lg font-bold tracking-tight"
        href="/"
      >
        url<span className="text-[var(--bg-hero)]">sy.co</span>
      </Link>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <a
            href="/dashboard#create-link"
            className="focus-ring hover-lift rounded-full border border-[var(--stroke)] bg-[var(--bg-hero)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
          >
            New Link
          </a>
          <Link
            href="/dashboard/billing"
            className="focus-ring rounded-full border border-[var(--stroke)]/35 bg-white px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
          >
            Billing
          </Link>

          {/* <input
            type="text"
            placeholder="Search links"
            aria-label="Search links"
            className="focus-ring h-10 w-full rounded-full border border-[var(--stroke)]/35 bg-white px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] sm:max-w-48"
          /> */}

          <ProfileMenu name={name} email={email} initial={initial} signOutAction={handleSignOut} />
        </div>
      </nav>
    </header>
  );
}
