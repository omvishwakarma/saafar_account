import Link from "next/link";
import { company } from "@/lib/company";
import { formatDate } from "@/lib/money";
import { getDashboard } from "@/lib/queries";
import { Money, PageHeader, Panel, Status, When } from "@/components/ui";

export default async function DashboardPage() {
  const data = await getDashboard();
  return (
    <div>
      <PageHeader
        eyebrow={formatDate(data.today)}
        title="Dashboard"
        sub={`${company.short} keeps sales, supplier costs, and bank balances in ${company.base}. Foreign amounts are translated at the rate on each document.`}
        action={<Link href="/vouchers/new" className="rounded-md bg-brass px-3.5 py-2 text-sm font-semibold text-white">New Voucher</Link>}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Customers owe" value={data.receivable} hint="Open invoices less credit notes" href="/reports/aged-receivable" />
        <Stat label="We owe suppliers" value={data.payable} hint="Open bills less debit notes" href="/reports/aged-payable" />
        <Stat label="Bank and cash" value={data.cash} hint="All cash journals in KWD" href="/reports/cash" />
        <Stat label="This month" value={data.monthProfit} hint="Income minus cost, in KWD" href="/reports/profit-loss" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel className="p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Customer invoices</h2>
            <Link href="/moves?type=out_invoice" className="text-sm font-semibold text-brass">Open</Link>
          </div>
          <BucketSummary draft={data.invoices.draft} open={data.invoices.open} late={data.invoices.late} openLc={data.invoices.openLc} lateLc={data.invoices.lateLc} buckets={data.invoices.buckets} />
        </Panel>
        <Panel className="p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Vendor bills</h2>
            <Link href="/moves?type=in_invoice" className="text-sm font-semibold text-brass">Open</Link>
          </div>
          <BucketSummary draft={data.bills.draft} open={data.bills.open} late={data.bills.late} openLc={data.bills.openLc} lateLc={data.bills.lateLc} buckets={data.bills.buckets} />
        </Panel>
        <Panel className="p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Cash journals</h2>
            <Link href="/journals" className="text-sm font-semibold text-brass">Journal</Link>
          </div>
          <div className="mt-4 space-y-3">
            {data.banks.map((bank) => (
              <Link key={bank.id} href={`/reports/ledger?account=${bank.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-3 hover:border-brass/40">
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-muted">{bank.code}</div>
                  <div className="text-sm font-semibold">{bank.name}</div>
                </div>
                <Money amount={bank.balance} className="text-sm font-semibold" />
              </Link>
            ))}
          </div>
          {data.unposted > 0 && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {data.unposted} draft {data.unposted === 1 ? "document is" : "documents are"} not in the reports yet.
            </p>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="font-display text-2xl">Recent vouchers</h2>
            <Link href="/vouchers" className="text-sm font-semibold text-brass">All vouchers</Link>
          </div>
          <table className="books mt-2">
            <thead>
              <tr><th>Voucher</th><th>Guest</th><th>Customer</th><th className="num">Sell KWD</th><th>Status</th></tr>
            </thead>
            <tbody>
              {data.vouchers.map((row) => (
                <tr key={row.id}>
                  <td><Link href={`/vouchers/${row.id}`} className="font-semibold hover:text-brass">{row.number}</Link><div className="text-xs text-muted">{row.city}</div></td>
                  <td>{row.paxName}</td>
                  <td>{row.customer}</td>
                  <td className="num"><Money amount={row.sellValue} /></td>
                  <td><Status value={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="font-display text-2xl">Recent payments</h2>
            <Link href="/payments" className="text-sm font-semibold text-brass">All payments</Link>
          </div>
          <table className="books mt-2">
            <thead>
              <tr><th>Number</th><th>Partner</th><th>Date</th><th className="num">Amount</th></tr>
            </thead>
            <tbody>
              {data.payments.map((row) => (
                <tr key={row.id}>
                  <td><Link href={`/payments/${row.id}`} className="font-semibold hover:text-brass">{row.number}</Link><div className="text-xs text-muted">{row.paymentType === "receive" ? "Received" : "Paid out"}</div></td>
                  <td>{row.partner}</td>
                  <td><When value={row.date} /></td>
                  <td className="num"><Money amount={row.amount} currency={row.currency} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value, hint, href }: { label: string; value: number; hint: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-line bg-paper p-4 shadow-card hover:border-brass/40">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</div>
      <div className="mt-2 font-display text-3xl tracking-tight"><Money amount={value} /></div>
      <div className="mt-1 text-xs text-muted">{hint}</div>
    </Link>
  );
}

function BucketSummary({
  draft,
  open,
  late,
  openLc,
  lateLc,
  buckets,
}: {
  draft: number;
  open: number;
  late: number;
  openLc: number;
  lateLc: number;
  buckets: { key: string; label: string; amount: number }[];
}) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.amount, 0) || 1;
  const colors = ["#a33b32", "#b8501f", "#0f6e56"];
  return (
    <div className="mt-4">
      <div className="flex h-2 overflow-hidden rounded-full bg-line">
        {buckets.map((bucket, index) => (
          <div key={bucket.key} style={{ width: `${(bucket.amount / total) * 100}%`, background: colors[index] }} />
        ))}
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <Row label={`${draft} draft`} amount={0} mute />
        <Row label={`${open} open`} amount={openLc} />
        <Row label={`${late} late`} amount={lateLc} warn />
        {buckets.map((bucket) => (
          <Row key={bucket.key} label={bucket.label} amount={bucket.amount} />
        ))}
      </dl>
    </div>
  );
}

function Row({ label, amount, warn, mute }: { label: string; amount: number; warn?: boolean; mute?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={warn ? "text-red-800" : "text-muted"}>{label}</dt>
      <dd className="font-medium">{mute ? "—" : <Money amount={amount} />}</dd>
    </div>
  );
}
