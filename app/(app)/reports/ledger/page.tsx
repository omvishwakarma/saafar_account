import { notFound } from "next/navigation";
import { AsOfForm, ReportSheet } from "@/components/ReportChrome";
import { Money, When } from "@/components/ui";
import { formatDate, todayISO } from "@/lib/money";
import { reportLedger } from "@/lib/queries";

export default async function LedgerPage({ searchParams }: { searchParams: Promise<{ account?: string; asOf?: string }> }) {
  const sp = await searchParams;
  const asOf = sp.asOf || todayISO();
  if (!sp.account) notFound();
  const report = await reportLedger(sp.account, asOf);
  if (!report) notFound();
  return (
    <div>
      <AsOfForm asOf={asOf} extra={{ account: sp.account }} />
      <ReportSheet title={report.account.name} subtitle={`${report.account.code} · as of ${formatDate(asOf)}`}>
        <table className="books">
          <thead>
            <tr><th>Date</th><th>Ref</th><th>Partner</th><th>Detail</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th></tr>
          </thead>
          <tbody>
            {report.lines.map((line, index) => (
              <tr key={index}>
                <td><When value={line.date} /></td>
                <td>{line.ref}</td>
                <td>{line.partner}</td>
                <td>{line.label}{line.currency !== "KWD" ? ` · ${line.amountCurrency.toLocaleString("en-US")} ${line.currency}` : ""}</td>
                <td className="num">{line.debit ? <Money amount={line.debit} /> : ""}</td>
                <td className="num">{line.credit ? <Money amount={line.credit} /> : ""}</td>
                <td className="num"><Money amount={line.balance} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {report.lines.length === 0 && <p className="mt-4 text-sm text-muted">No movement on this account yet.</p>}
      </ReportSheet>
    </div>
  );
}
