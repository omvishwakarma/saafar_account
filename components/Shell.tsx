import { company } from "@/lib/company";
import type { SessionUser } from "@/lib/session";
import { Logo } from "./Logo";
import { SideNav } from "./SideNav";
import { SignOut } from "./SignOut";

export function Shell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col bg-pine text-sand md:flex">
        <div className="border-b border-white/10 px-5 py-4">
          <Logo className="h-16 w-auto rounded-md bg-white px-2 py-1.5" />
        </div>
        <SideNav admin={user.role === "admin"} />
        <div className="border-t border-white/10 px-5 py-4 text-xs text-sand/55">
          <div className="font-medium text-sand/80">{user.name}</div>
          <div>{user.role === "admin" ? "Admin" : "Consultant"} · {user.username}</div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="border-b border-line bg-pine text-sand md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Logo className="h-11 w-auto rounded-md bg-white px-1.5 py-1" />
            <div className="flex items-center gap-3">
              <div className="text-xs uppercase tracking-[0.14em] text-sand/70">{company.base}</div>
              <SignOut light />
            </div>
          </div>
          <SideNav compact admin={user.role === "admin"} />
        </div>
        <header className="no-print sticky top-0 z-20 hidden h-14 items-center justify-between border-b border-line/80 bg-sand/85 px-6 backdrop-blur md:flex">
          <Logo className="h-10 w-auto" />
          <div className="flex items-center gap-4">
            <div className="text-sm text-ink">{user.name}</div>
            <div className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">Base {company.base}</div>
            <SignOut />
          </div>
        </header>
        <main className="px-4 py-5 md:px-8 md:py-7">{children}</main>
      </div>
    </div>
  );
}
