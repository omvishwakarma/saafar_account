import { listJournals } from "@/lib/queries";
import { Button, Money, PageHeader, Panel, When } from "@/components/ui";

export default async function JournalsPage() {
  const rows = await listJournals();
  return (
    <div>
      <PageHeader
        eyebrow="Ledger"
        title="Journal"
        sub="Every confirmed invoice, payment, voucher, and opening balance lands here. Debits and credits are in KWD."
        action={<Button href="/journals/new">New journal</Button>}
      />
      <div className="space-y-3">
        {rows.map((row) => (
          <Panel key={row.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
            <details className="min-w-0 flex-1">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{row.ref}</div>
                  <div className="text-sm text-muted"><When value={row.date} /> · {row.memo || row.source}</div>
                </div>
                <Money amount={row.debit} className="font-semibold" />
              </summary>
              <table className="books mt-3">
                <thead><tr><th>Account</th><th>Partner</th><th>Label</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">FC</th></tr></thead>
                <tbody>
                  {row.lines.map((line, index) => (
                    <tr key={index}>
                      <td>{line.account}</td>
                      <td>{line.partner}</td>
                      <td>{line.label}</td>
                      <td className="num">{line.debit ? <Money amount={line.debit} /> : ""}</td>
                      <td className="num">{line.credit ? <Money amount={line.credit} /> : ""}</td>
                      <td className="num text-muted">{line.currency === "KWD" ? "" : <Money amount={line.amountCurrency} currency={line.currency} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
            <Button href={`/journals/${row.id}`} variant="ghost" className="shrink-0">Edit</Button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
