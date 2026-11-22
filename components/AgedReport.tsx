import Link from "next/link";
import { AsOfForm, ReportSheet } from "./ReportChrome";
import { Money } from "./ui";
import { formatDate } from "@/lib/money";

type Bucket = { current: number; d30: number; d60: number; d90: number; d90p: number; total: number };

export function AgedReport({
  title,
  report,
}: {
  title: string;
  report: {
    asOf: string;
    rows: { name: string; bucket: Bucket }[];
    totals: Bucket;
    documents: { id: string; number: string; partner: string; guest: string; detail: string; open: number }[];
  };
}) {
  return (
    <div>
      <AsOfForm asOf={report.asOf} />
      <ReportSheet title={title} subtitle={`As of ${formatDate(report.asOf)} · open balances in KWD`}>
        <div className="overflow-x-auto">
          <table className="books min-w-[720px]">
            <thead>
              <tr>
                <th>Partner</th>
                <th className="num">Not due</th>
                <th className="num">1–30</th>
                <th className="num">31–60</th>
                <th className="num">61–90</th>
                <th className="num">90+</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <Cell amount={row.bucket.current} />
                  <Cell amount={row.bucket.d30} />
                  <Cell amount={row.bucket.d60} />
                  <Cell amount={row.bucket.d90} />
                  <Cell amount={row.bucket.d90p} />
                  <Cell amount={row.bucket.total} />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <Cell amount={report.totals.current} />
                <Cell amount={report.totals.d30} />
                <Cell amount={report.totals.d60} />
                <Cell amount={report.totals.d90} />
                <Cell amount={report.totals.d90p} />
                <Cell amount={report.totals.total} />
              </tr>
            </tfoot>
          </table>
        </div>
        {report.documents.length > 0 && (
          <div className="mt-8 overflow-x-auto">
            <h2 className="mb-2 font-display text-2xl">Open documents</h2>
            <table className="books min-w-[720px]">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Partner</th>
                  <th>Guest</th>
                  <th>Detail</th>
                  <th className="num">Open</th>
                </tr>
              </thead>
              <tbody>
                {report.documents.map((row) => (
                  <tr key={row.id}>
                    <td><Link href={`/moves/${row.id}`} className="font-semibold hover:text-brass">{row.number}</Link></td>
                    <td>{row.partner}</td>
                    <td>{row.guest}</td>
                    <td>{row.detail}</td>
                    <td className="num"><Money amount={row.open} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-sm text-muted">
          Credit notes and debit notes reduce the balance. Open the <Link className="text-brass" href="/reports/partner-ledger">partner ledger</Link> for the lines.
        </p>
      </ReportSheet>
    </div>
  );
}

function Cell({ amount }: { amount: number }) {
  return <td className="num">{amount ? <Money amount={amount} /> : ""}</td>;
}
