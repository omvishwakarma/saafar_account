import Link from "next/link";
import { listVouchers } from "@/lib/queries";
import { Button, Money, PageHeader, Panel, Status, When } from "@/components/ui";

export default async function VouchersPage() {
  const rows = await listVouchers();
  return (
    <div>
      <PageHeader
        eyebrow="Travel file"
        title="Hotel vouchers"
        sub="A voucher prices the supplier in one currency and the customer in another. Confirming it posts both the invoice and the bill."
        action={<Button href="/vouchers/new">New voucher</Button>}
      />
      <Panel>
        <div className="overflow-x-auto">
          <table className="books min-w-[980px]">
            <thead>
              <tr>
                <th>Voucher</th>
                <th>Guest</th>
                <th>Customer</th>
                <th>Supplier</th>
                <th>Service</th>
                <th className="num">Cost</th>
                <th className="num">Sell KWD</th>
                <th className="num">Markup</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td><Link href={`/vouchers/${row.id}`} className="font-semibold hover:text-brass">{row.number}</Link><div className="text-xs text-muted"><When value={row.date} /> · {row.city}</div></td>
                  <td>{row.paxName || "—"}</td>
                  <td>{row.customer}</td>
                  <td>{row.supplier}</td>
                  <td>{row.service}</td>
                  <td className="num"><Money amount={row.supplierFc} currency={row.supplierCurrency} /></td>
                  <td className="num"><Money amount={row.sellValue} /></td>
                  <td className="num"><Money amount={row.markup} /></td>
                  <td><Status value={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
