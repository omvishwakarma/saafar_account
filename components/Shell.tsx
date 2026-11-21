import { company } from "@/lib/company";
import { SideNav } from "./SideNav";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col bg-pine text-sand md:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="font-display text-[1.7rem] leading-none tracking-tight">Safar Books</div>
          <div className="mt-1 text-xs text-sand/60">Travel accounting</div>
        </div>
        <SideNav />
        <div className="border-t border-white/10 px-5 py-4 text-xs text-sand/55">
          <div className="font-medium text-sand/80">{company.short}</div>
          <div>{company.city} · books in {company.base}</div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="border-b border-line bg-pine text-sand md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="font-display text-2xl leading-none">Safar Books</div>
            <div className="text-xs uppercase tracking-[0.14em] text-sand/70">{company.base}</div>
          </div>
          <SideNav compact />
        </div>
        <header className="no-print sticky top-0 z-20 hidden h-14 items-center justify-between border-b border-line/80 bg-sand/85 px-6 backdrop-blur md:flex">
          <div className="text-sm text-muted">{company.name}</div>
          <div className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">Base {company.base}</div>
        </header>
        <main className="px-4 py-5 md:px-8 md:py-7">{children}</main>
      </div>
    </div>
  );
}
