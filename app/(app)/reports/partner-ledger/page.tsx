import { ReportSheet } from "@/components/ReportChrome";
import { Money, When } from "@/components/ui";
import { formatDate, todayISO } from "@/lib/money";
import { reportPartner } from "@/lib/queries";

export default async function PartnerLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ partner?: string; asOf?: string }>;
}) {
  const sp = await searchParams;
  const asOf = sp.asOf || todayISO();
  const report = await reportPartner(sp.partner || "", asOf);
  return (
    <div>
      <form className="no-print mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-[11px] uppercase tracking-[0.14em] text-muted">Partner</span>
          <select name="partner" defaultValue={sp.partner || ""} className="rounded-md border border-line bg-paper px-3 py-2 text-sm">
            <option value="">Choose</option>
            {report.partners.map((partner) => (
              <option key={partner.id} value={partner.id}>{partner.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[11px] uppercase tracking-[0.14em] text-muted">As of</span>
          <input type="date" name="asOf" defaultValue={asOf} className="rounded-md border border-line bg-paper px-3 py-2 text-sm" />
        </label>
        <button className="rounded-md border border-line bg-paper px-3 py-2 text-sm font-semibold">Update</button>
      </form>
      {!report.partner ? (
        <p className="text-sm text-muted">Choose a customer or vendor to see every ledger line in their name.</p>
      ) : (
        <ReportSheet title={report.partner.name} subtitle={`Partner ledger as of ${formatDate(asOf)} · KWD`}>
          {report.sections.length === 0 && <p className="text-sm text-muted">No posted lines for this partner yet.</p>}
          {report.sections.map((section) => (
            <div key={section.title} className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{section.title}</h2>
              <table className="books">
                <thead><tr><th>Date</th><th>Ref</th><th>Account</th><th>Detail</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th></tr></thead>
                <tbody>
                  {section.lines.map((line, index) => (
                    <tr key={index}>
                      <td><When value={line.date} /></td>
                      <td>{line.ref}</td>
                      <td>{line.account}</td>
                      <td>{line.label}</td>
                      <td className="num">{line.debit ? <Money amount={line.debit} /> : ""}</td>
                      <td className="num">{line.credit ? <Money amount={line.credit} /> : ""}</td>
                      <td className="num"><Money amount={line.balance} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </ReportSheet>
      )}
    </div>
  );
}
