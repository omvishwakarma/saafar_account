import Link from "next/link";
import { listPayments } from "@/lib/queries";
import { Button, Money, PageHeader, Panel, Status, When } from "@/components/ui";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const sp = await searchParams;
  const type = sp.type === "send" ? "send" : sp.type === "receive" ? "receive" : "";
  const rows = (await listPayments()).filter((row) => !type || row.paymentType === type);
  const title = type === "send" ? "Vendor payments" : type === "receive" ? "Customer receipts" : "Payments";
  return (
    <div>
      <PageHeader
        eyebrow="Cash"
        title={title}
        sub="A receipt clears customer invoices. A payment clears vendor bills. Any KWD difference from the rate is exchange gain or loss."
        action={<Button href={`/payments/new${type ? `?type=${type}` : ""}`}>New {type === "send" ? "payment" : "receipt"}</Button>}
      />
      <Panel>
        <div className="overflow-x-auto">
          <table className="books min-w-[760px]">
            <thead>
              <tr><th>Number</th><th>Partner</th><th>Date</th><th>Memo</th><th className="num">Amount</th><th className="num">KWD</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/payments/${row.id}`} className="font-semibold hover:text-brass">{row.number}</Link>
                    <div className="mt-1"><Status value={row.paymentType} /></div>
                  </td>
                  <td>{row.partner}</td>
                  <td><When value={row.date} /></td>
                  <td className="text-muted">{row.memo}</td>
                  <td className="num"><Money amount={row.amount} currency={row.currency} /></td>
                  <td className="num">{row.status === "posted" ? <Money amount={row.amountLc} /> : "—"}</td>
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
