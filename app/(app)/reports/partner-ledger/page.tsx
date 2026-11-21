import Link from "next/link";
import { PartnerLedgerActions } from "@/components/PartnerLedgerActions";
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
      <div className="no-print mb-4 flex flex-wrap items-end justify-between gap-3">
        <form className="flex flex-wrap items-end gap-3">
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
        {report.partner && (
          <PartnerLedgerActions
            pdfHref={`/api/reports/partner-ledger?partner=${report.partner.id}&asOf=${asOf}&format=pdf`}
            xlsxHref={`/api/reports/partner-ledger?partner=${report.partner.id}&asOf=${asOf}&format=xlsx`}
          />
        )}
      </div>
      {!report.partner ? (
        <p className="text-sm text-muted">Choose a customer or vendor to see every ledger line in their name.</p>
      ) : (
        <ReportSheet wide title={report.partner.name} subtitle={`Partner ledger as of ${formatDate(asOf)} · KWD`}>
          <img src="/saafar-logo.png" alt="Saafar" className="report-logo" />
          {report.sections.length === 0 && <p className="text-sm text-muted">No posted lines for this partner yet.</p>}
          {report.sections.map((section) => {
            const showUsd = section.lines.some((line) => line.usd);
            return (
              <div key={section.title} className="mt-6 overflow-x-auto">
                <div className="border border-b-0 border-line bg-[#f6f1e7] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{section.title}</div>
                <table className="books ledger">
                  <colgroup>
                    <col style={{ width: showUsd ? "11%" : "12%" }} />
                    <col style={{ width: showUsd ? "13%" : "14%" }} />
                    <col style={{ width: showUsd ? "14%" : "16%" }} />
                    <col style={{ width: showUsd ? "24%" : "26%" }} />
                    {showUsd && <col style={{ width: "10%" }} />}
                    <col style={{ width: showUsd ? "10%" : "11%" }} />
                    <col style={{ width: showUsd ? "9%" : "10%" }} />
                    <col style={{ width: showUsd ? "9%" : "11%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Ref</th>
                      <th>Guest</th>
                      <th>Detail</th>
                      {showUsd && <th className="num">USD</th>}
                      <th className="num">Debit</th>
                      <th className="num">Credit</th>
                      <th className="num">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.lines.map((line, index) => (
                      <tr key={index}>
                        <td><When value={line.date} /></td>
                        <td>{line.href ? <Link href={line.href} className="font-semibold text-brass hover:underline">{line.ref}</Link> : line.ref}</td>
                        <td className="wrap">{line.guest}</td>
                        <td className="wrap">{line.label}</td>
                        {showUsd && <td className="num text-muted">{line.usd ? <Money amount={line.usd} currency="USD" /> : ""}</td>}
                        <td className="num">{line.debit ? <Money amount={line.debit} /> : ""}</td>
                        <td className="num">{line.credit ? <Money amount={line.credit} /> : ""}</td>
                        <td className="num"><Money amount={line.balance} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </ReportSheet>
      )}
    </div>
  );
}
