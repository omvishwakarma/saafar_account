import Link from "next/link";
import { AsOfForm, ReportSheet } from "@/components/ReportChrome";
import { Money } from "@/components/ui";
import { formatDate, todayISO } from "@/lib/money";
import { reportBalanceSheet, type StatementRow } from "@/lib/queries";

export default async function BalanceSheetPage({ searchParams }: { searchParams: Promise<{ asOf?: string }> }) {
  const sp = await searchParams;
  const asOf = sp.asOf || todayISO();
  const report = await reportBalanceSheet(asOf);
  return (
    <div>
      <AsOfForm asOf={asOf} />
      <ReportSheet title="Balance sheet" subtitle={`As of ${formatDate(asOf)} · figures in KWD`}>
        {report.unposted > 0 && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
            There are {report.unposted} draft invoices or bills not included in this period.
          </p>
        )}
        <Section title="Assets" />
        <Group title="Current assets" rows={report.currentAssets} />
        <Group title="Fixed assets" rows={report.fixedAssets} />
        <Group title="Non-current assets" rows={report.otherAssets} />
        <Total label="Total assets" amount={report.assets} />
        <Section title="Liabilities" />
        <Group title="Current liabilities" rows={report.currentLiabilities} />
        <Group title="Non-current liabilities" rows={report.otherLiabilities} />
        <Total label="Total liabilities" amount={report.liabilities} />
        <Section title="Equity" />
        <Group title="Capital" rows={report.equity} />
        <div className="flex justify-between border-b border-line py-2 text-sm">
          <span>Current year earnings</span>
          <Money amount={report.earnings} />
        </div>
        <Total label="Total equity" amount={report.equityTotal} />
        <Total label="Liabilities and equity" amount={report.liabilities + report.equityTotal} />
        <p className={`mt-4 text-sm ${report.balanced ? "text-good" : "text-red-800"}`}>
          {report.balanced ? "The balance sheet balances." : `Out of balance by ${report.gap.toFixed(3)} KWD.`}
        </p>
      </ReportSheet>
    </div>
  );
}

function Section({ title }: { title: string }) {
  return <h2 className="mt-6 bg-sand px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]">{title}</h2>;
}

function Group({ title, rows }: { title: string; rows: StatementRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.balance, 0);
  if (!rows.length) return null;
  return (
    <div className="mt-3">
      <h3 className="text-sm font-semibold text-muted">{title}</h3>
      {rows.map((row) => (
        <Link key={row.id} href={`/reports/ledger?account=${row.id}`} className="flex justify-between gap-4 border-b border-line/70 py-1.5 text-sm hover:text-brass">
          <span>{row.code} · {row.name}</span>
          <Money amount={row.balance} />
        </Link>
      ))}
      <div className="flex justify-between py-1.5 text-sm font-semibold">
        <span>Total {title.toLowerCase()}</span>
        <Money amount={total} />
      </div>
    </div>
  );
}

function Total({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="mt-2 flex justify-between border-t border-ink py-2 font-semibold">
      <span>{label}</span>
      <Money amount={amount} />
    </div>
  );
}
