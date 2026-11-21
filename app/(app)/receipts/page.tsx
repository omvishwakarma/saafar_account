import Link from "next/link";
import { listReceipts } from "@/lib/queries";
import { Button, Money, PageHeader, Panel, Status, When } from "@/components/ui";

export default async function ReceiptsPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const sp = await searchParams;
  const kind = sp.kind === "payment" ? "payment" : "receipt";
  const rows = await listReceipts(kind);
  const title = kind === "receipt" ? "Bank receipts" : "Payment vouchers";
  return (
    <div>
      <PageHeader
        eyebrow="Vouchers"
        title={title}
        sub="Each line carries its own currency and rate. Debit and credit are in KWD, and they have to match before the voucher can be posted."
        action={<Button href={`/receipts/new?kind=${kind}`}>New {kind === "receipt" ? "receipt" : "payment voucher"}</Button>}
      />
      <Panel>
        <table className="books">
          <thead><tr><th>Number</th><th>Date</th><th>Party</th><th>Reference</th><th className="num">KWD</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><Link href={`/receipts/${row.id}`} className="font-semibold hover:text-brass">{row.number}</Link></td>
                <td><When value={row.date} /></td>
                <td>{row.party || "—"}</td>
                <td className="text-muted">{row.reference}</td>
                <td className="num"><Money amount={row.total} /></td>
                <td><Status value={row.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="text-muted">No vouchers yet.</td></tr>}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
