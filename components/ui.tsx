import Link from "next/link";
import { formatDate, formatMoney } from "@/lib/money";

export const inputClass =
  "w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-brass focus:ring-2 focus:ring-brass/20";
export const labelClass = "mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export function Button({
  children,
  href,
  variant = "primary",
  type = "button",
  disabled,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50 ${
    variant === "primary"
      ? "bg-brass text-white hover:bg-[#9c4218]"
      : variant === "danger"
        ? "border border-red-200 bg-white text-red-800 hover:bg-red-50"
        : "border border-line bg-paper text-ink hover:bg-sand"
  } ${className}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function PageHeader({
  eyebrow,
  title,
  sub,
  action,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{eyebrow}</div>}
        <h1 className="font-display text-3xl tracking-tight text-ink">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-sm text-muted">{sub}</p>}
      </div>
      {action && <div className="no-print flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

const tones: Record<string, string> = {
  draft: "bg-stone-100 text-stone-600",
  posted: "bg-teal-50 text-teal-900",
  confirmed: "bg-teal-50 text-teal-900",
  partial: "bg-amber-50 text-amber-900",
  paid: "bg-emerald-50 text-emerald-900",
  late: "bg-red-50 text-red-800",
  receive: "bg-emerald-50 text-emerald-900",
  send: "bg-orange-50 text-orange-900",
};

export function Status({ value, late }: { value: string; late?: boolean }) {
  const key = late ? "late" : value;
  const label = late ? "Late" : value === "receive" ? "Receive" : value === "send" ? "Send" : value[0].toUpperCase() + value.slice(1);
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${tones[key] || tones.draft}`}>{label}</span>;
}

export function Money({ amount, currency = "KWD", className = "" }: { amount: number; currency?: string; className?: string }) {
  const negative = amount < 0;
  return <span className={`tabular-nums ${negative ? "text-red-800" : ""} ${className}`}>{formatMoney(amount, currency)}</span>;
}

export function When({ value }: { value: string }) {
  return <span className="tabular-nums">{formatDate(value)}</span>;
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-paper shadow-card ${className}`}>{children}</section>;
}

export function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Filters({
  path,
  extra,
  current,
  counts,
  query,
}: {
  path: string;
  extra?: Record<string, string>;
  current: string;
  counts: { all: number; draft: number; open: number; late: number; paid: number };
  query: string;
}) {
  const items = [
    ["all", "All"],
    ["draft", "Draft"],
    ["open", "Open"],
    ["late", "Late"],
    ["paid", "Paid"],
  ] as const;
  const href = (filter: string) => {
    const params = new URLSearchParams({ ...extra, filter });
    if (query) params.set("q", query);
    return `${path}?${params.toString()}`;
  };
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-1">
        {items.map(([key, label]) => (
          <Link
            key={key}
            href={href(key)}
            className={`rounded-full px-3 py-1 text-sm ${current === key ? "bg-pine text-sand" : "text-muted hover:bg-white"}`}
          >
            {label}
            <span className="ml-1 tabular-nums opacity-70">{counts[key]}</span>
          </Link>
        ))}
      </div>
      <form action={path} className="flex">
        {Object.entries(extra || {}).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        <input name="q" defaultValue={query} placeholder="Search number or name" className={`${inputClass} w-56`} />
      </form>
    </div>
  );
}
