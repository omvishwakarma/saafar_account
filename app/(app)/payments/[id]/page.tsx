import Link from "next/link";
import { notFound } from "next/navigation";
import { PostBar } from "@/components/PostBar";
import { PrintButton } from "@/components/PrintButton";
import { Money, PageHeader, Panel, Status, When } from "@/components/ui";
import { getPayment } from "@/lib/queries";

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payment = await getPayment(id);
  if (!payment) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={payment.paymentType === "receive" ? "Customer receipt" : "Vendor payment"}
        title={payment.number}
        sub={payment.memo || "Payment"}
        action={<PrintButton />}
      />
      <Panel className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-display text-3xl">{payment.partner}</div>
            <div className="mt-1 text-sm text-muted">{payment.account} · {payment.method}</div>
          </div>
          <Status value={payment.status} />
        </div>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">Date</dt><dd className="font-medium"><When value={payment.date} /></dd></div>
          <div><dt className="text-muted">Amount</dt><dd className="font-medium"><Money amount={payment.amount} currency={payment.currency} /></dd></div>
          <div><dt className="text-muted">Rate</dt><dd className="font-medium tabular-nums">{payment.rate}</dd></div>
          <div><dt className="text-muted">KWD</dt><dd className="font-medium">{payment.status === "posted" ? <Money amount={payment.amountLc} /> : "—"}</dd></div>
          <div><dt className="text-muted">Exchange</dt><dd className="font-medium">{payment.fxGain === 0 ? "—" : <Money amount={payment.fxGain} />}</dd></div>
        </dl>
        <table className="books mt-6">
          <thead><tr><th>Document</th><th className="num">Applied</th><th className="num">Cleared KWD</th></tr></thead>
          <tbody>
            {payment.allocations.map((row) => (
              <tr key={row.moveId}>
                <td><Link className="font-semibold hover:text-brass" href={`/moves/${row.moveId}`}>{row.number}</Link></td>
                <td className="num"><Money amount={row.amount} currency={row.currency} /></td>
                <td className="num"><Money amount={row.amountLc} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {payment.status === "draft" && (
          <div className="mt-6">
            <PostBar kind="payment" id={payment.id} back="/payments" />
          </div>
        )}
      </Panel>
    </div>
  );
}
