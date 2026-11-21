import Link from "next/link";
import { AsOfForm, ReportSheet } from "@/components/ReportChrome";
import { Money } from "@/components/ui";
import { formatDate, todayISO } from "@/lib/money";
import { reportTrialBalance } from "@/lib/queries";

export default async function TrialPage({ searchParams }: { searchParams: Promise<{ asOf?: string }> }) {
  const sp = await searchParams;
  const asOf = sp.asOf || todayISO();
  const report = await reportTrialBalance(asOf);
  return (
    <div>
      <AsOfForm asOf={asOf} />
      <ReportSheet title="Trial balance" subtitle={`As of ${formatDate(asOf)} · KWD`}>
        <table className="books">
          <thead><tr><th>Account</th><th className="num">Debit</th><th className="num">Credit</th></tr></thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.id}>
                <td><Link href={`/reports/ledger?account=${row.id}&asOf=${asOf}`} className="hover:text-brass">{row.code} · {row.name}</Link></td>
                <td className="num">{row.debit ? <Money amount={row.debit} /> : ""}</td>
                <td className="num">{row.credit ? <Money amount={row.credit} /> : ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td className="num"><Money amount={report.debit} /></td>
              <td className="num"><Money amount={report.credit} /></td>
            </tr>
          </tfoot>
        </table>
        <p className={`mt-3 text-sm ${Math.abs(report.diff) < 0.05 ? "text-good" : "text-red-800"}`}>
          {Math.abs(report.diff) < 0.05 ? "Debits equal credits." : `Difference ${report.diff.toFixed(3)} KWD.`}
        </p>
      </ReportSheet>
    </div>
  );
}
