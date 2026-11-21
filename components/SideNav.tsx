import Link from "next/link";
import { headers } from "next/headers";

const groups = [
  {
    label: "Sales",
    items: [
      ["/partners?role=customer", "Customers"],
      ["/moves?type=out_invoice", "Invoices"],
      ["/moves?type=out_refund", "Credit notes"],
      ["/payments?type=receive", "Customer receipts"],
    ],
  },
  {
    label: "Purchase",
    items: [
      ["/partners?role=vendor", "Vendors"],
      ["/moves?type=in_invoice", "Vendor bills"],
      ["/moves?type=in_refund", "Debit notes"],
      ["/payments?type=send", "Vendor payments"],
    ],
  },
  {
    label: "Travel",
    items: [["/vouchers", "Hotel vouchers"]],
  },
  {
    label: "Accounting",
    items: [
      ["/receipts?kind=receipt", "Bank receipts"],
      ["/receipts?kind=payment", "Payment vouchers"],
      ["/journals", "Journal"],
      ["/accounts", "Chart of accounts"],
    ],
  },
  {
    label: "Reports",
    items: [
      ["/reports/balance-sheet", "Balance sheet"],
      ["/reports/profit-loss", "Profit and loss"],
      ["/reports/trial-balance", "Trial balance"],
      ["/reports/aged-receivable", "Aged receivable"],
      ["/reports/aged-payable", "Aged payable"],
      ["/reports/cash", "Cash movement"],
      ["/reports/partner-ledger", "Partner ledger"],
    ],
  },
  {
    label: "Setup",
    items: [["/currencies", "Currencies"]],
  },
] as const;

function active(pathname: string, search: URLSearchParams, href: string) {
  const [path, query] = href.split("?");
  if (query) {
    if (pathname !== path) return false;
    const want = new URLSearchParams(query);
    for (const [key, value] of want) {
      if (search.get(key) !== value) return false;
    }
    return true;
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

export async function SideNav({ compact = false, admin = false }: { compact?: boolean; admin?: boolean }) {
  const current = (await headers()).get("x-pathname") || "/";
  const [pathname, query = ""] = current.split("?");
  const search = new URLSearchParams(query);
  if (compact) {
    return (
      <div className="flex gap-2 overflow-x-auto px-4 py-3 md:hidden">
        <Link href="/" className="shrink-0 rounded-full bg-pine px-3 py-1 text-sm text-sand">Home</Link>
        {groups.flatMap((group) => group.items).map(([href, label]) => (
          <Link key={href} href={href} className={`shrink-0 rounded-full px-3 py-1 text-sm ${active(pathname, search, href) ? "bg-brass text-white" : "bg-white text-ink"}`}>
            {label}
          </Link>
        ))}
        {admin && (
          <Link href="/admin" className={`shrink-0 rounded-full px-3 py-1 text-sm ${active(pathname, search, "/admin") ? "bg-brass text-white" : "bg-white text-ink"}`}>
            Admin
          </Link>
        )}
      </div>
    );
  }
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      <Link href="/" className={`block rounded-lg px-3 py-2 text-sm font-semibold ${pathname === "/" ? "bg-white/10 text-white" : "text-sand/80 hover:bg-white/5"}`}>
        Dashboard
      </Link>
      {groups.map((group) => (
        <div key={group.label}>
          <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sand/40">{group.label}</div>
          <div className="mt-1">
            {group.items.map(([href, label]) => {
              const on = active(pathname, search, href);
              return (
                <Link key={href} href={href} className={`block rounded-lg px-3 py-1.5 text-sm ${on ? "bg-brass text-white" : "text-sand/85 hover:bg-white/5"}`}>
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      {admin && (
        <div>
          <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sand/40">Admin</div>
          <Link href="/admin" className={`mt-1 block rounded-lg px-3 py-1.5 text-sm ${active(pathname, search, "/admin") ? "bg-brass text-white" : "text-sand/85 hover:bg-white/5"}`}>
            Users and log
          </Link>
        </div>
      )}
    </nav>
  );
}
