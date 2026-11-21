import { company } from "@/lib/company";
import { inputClass } from "./ui";

export function AsOfForm({ asOf, from, to, extra }: { asOf?: string; from?: string; to?: string; extra?: Record<string, string> }) {
  return (
    <form className="no-print mb-4 flex flex-wrap items-end gap-3">
      {extra && Object.entries(extra).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      {from !== undefined && (
        <label className="text-sm">
          <span className="mb-1 block text-[11px] uppercase tracking-[0.14em] text-muted">From</span>
          <input className={inputClass} type="date" name="from" defaultValue={from} />
        </label>
      )}
      {to !== undefined && (
        <label className="text-sm">
          <span className="mb-1 block text-[11px] uppercase tracking-[0.14em] text-muted">To</span>
          <input className={inputClass} type="date" name="to" defaultValue={to} />
        </label>
      )}
      {asOf !== undefined && (
        <label className="text-sm">
          <span className="mb-1 block text-[11px] uppercase tracking-[0.14em] text-muted">As of</span>
          <input className={inputClass} type="date" name="asOf" defaultValue={asOf} />
        </label>
      )}
      <button className="rounded-md border border-line bg-paper px-3 py-2 text-sm font-semibold">Update</button>
    </form>
  );
}

export function ReportSheet({
  title,
  subtitle,
  wide = false,
  children,
}: {
  title: string;
  subtitle: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <article className={`${wide ? "max-w-none" : "mx-auto max-w-4xl"} rounded-2xl border border-line bg-paper px-6 py-8 shadow-card print:border-0 print:shadow-none md:px-10`}>
      <header className="mb-6 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{company.name}</div>
        <h1 className="mt-1 font-display text-4xl">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </header>
      {children}
    </article>
  );
}
