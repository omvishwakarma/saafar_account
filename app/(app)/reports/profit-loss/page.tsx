import Link from "next/link";
import { AsOfForm, ReportSheet } from "@/components/ReportChrome";
import { Money } from "@/components/ui";
import { formatDate, todayISO } from "@/lib/money";
import { reportProfit } from "@/lib/queries";

export default async function ProfitPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const today = todayISO();
  const from = sp.from || `${today.slice(0, 4)}-01-01`;
  const to = sp.to || today;
  const report = await reportProfit(from, to);
  return (
    <div>
      <AsOfForm from={from} to={to} />
      <ReportSheet title="Profit and loss" subtitle={`${formatDate(from)} to ${formatDate(to)} · KWD`}>
        <h2 className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Income</h2>
        {report.income.map((row) => (
          <Link key={row.id} href={`/reports/ledger?account=${row.id}`} className="flex justify-between border-b border-line/80 py-1.5 text-sm hover:text-brass">
            <span>{row.code} · {row.name}</span>
            <Money amount={row.amount} />
          </Link>
        ))}
        <div className="flex justify-between py-2 font-semibold"><span>Total income</span><Money amount={report.incomeTotal} /></div>
        <h2 className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Expenses</h2>
        {report.expense.map((row) => (
          <Link key={row.id} href={`/reports/ledger?account=${row.id}`} className="flex justify-between border-b border-line/80 py-1.5 text-sm hover:text-brass">
            <span>{row.code} · {row.name}</span>
            <Money amount={row.amount} />
          </Link>
        ))}
        <div className="flex justify-between py-2 font-semibold"><span>Total expenses</span><Money amount={report.expenseTotal} /></div>
        <div className="mt-3 flex justify-between border-t border-ink pt-3 font-display text-2xl">
          <span>{report.profit >= 0 ? "Net profit" : "Net loss"}</span>
          <Money amount={report.profit} />
        </div>
      </ReportSheet>
    </div>
  );
}
