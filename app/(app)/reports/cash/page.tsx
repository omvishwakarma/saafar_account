import { AsOfForm, ReportSheet } from "@/components/ReportChrome";
import { Money, When } from "@/components/ui";
import { formatDate, todayISO } from "@/lib/money";
import { reportCash } from "@/lib/queries";

export default async function CashPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const today = todayISO();
  const from = sp.from || `${today.slice(0, 7)}-01`;
  const to = sp.to || today;
  const report = await reportCash(from, to);
  return (
    <div>
      <AsOfForm from={from} to={to} />
      <ReportSheet title="Cash movement" subtitle={`${formatDate(from)} to ${formatDate(to)} · bank and petty cash in KWD`}>
        <div className="mb-4 grid grid-cols-3 gap-3 text-center">
          <div><div className="text-xs uppercase tracking-[0.14em] text-muted">In</div><div className="font-semibold"><Money amount={report.inflow} /></div></div>
          <div><div className="text-xs uppercase tracking-[0.14em] text-muted">Out</div><div className="font-semibold"><Money amount={report.outflow} /></div></div>
          <div><div className="text-xs uppercase tracking-[0.14em] text-muted">Net</div><div className="font-semibold"><Money amount={report.net} /></div></div>
        </div>
        <table className="books">
          <thead><tr><th>Date</th><th>Ref</th><th>Account</th><th>Detail</th><th className="num">In</th><th className="num">Out</th></tr></thead>
          <tbody>
            {report.lines.map((line, index) => (
              <tr key={`${line.ref}-${index}`}>
                <td><When value={line.date} /></td>
                <td>{line.ref}</td>
                <td>{line.account}</td>
                <td>{line.memo}</td>
                <td className="num">{line.in ? <Money amount={line.in} /> : ""}</td>
                <td className="num">{line.out ? <Money amount={line.out} /> : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportSheet>
    </div>
  );
}
