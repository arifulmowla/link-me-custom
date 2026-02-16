import { ReactNode } from "react";
import { DashboardTopbar } from "@/app/components/dashboard/DashboardTopbar";

type DashboardShellProps = {
  name?: string | null;
  email?: string | null;
  children: ReactNode;
};

export function DashboardShell({ name, email, children }: DashboardShellProps) {
  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <DashboardTopbar name={name} email={email} />
        <main className="flex flex-col gap-6">{children}</main>
      </div>
    </div>
  );
}
