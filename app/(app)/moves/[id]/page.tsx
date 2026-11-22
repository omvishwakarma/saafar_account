import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentTools } from "@/components/DocumentTools";
import { MoveForm } from "@/components/MoveForm";
import { PrintButton } from "@/components/PrintButton";
import { Money, PageHeader, Panel, Status, When } from "@/components/ui";
import { MOVE_META } from "@/lib/company";
import { decimals, round } from "@/lib/money";
import { getMove, masters } from "@/lib/queries";

export default async function MovePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const move = await getMove(id);
  if (!move) notFound();
  const meta = MOVE_META[move.moveType];
  if (move.status === "draft") {
    const data = await masters();
    return (
      <div>
        <PageHeader eyebrow={move.number} title={`Draft ${meta.singular.toLowerCase()}`} />
        <MoveForm
          moveType={move.moveType}
          partners={data.partners}
          currencies={data.currencies}
          accounts={data.accounts}
          initial={{
            id: move.id,
            partnerId: move.partner?.id || "",
            currency: move.currency,
            rate: move.rate,
            invoiceDate: move.invoiceDate,
            accountingDate: move.accountingDate,
            dueDate: move.dueDate,
            narration: move.narration,
            lines: move.lines,
          }}
        />
      </div>
    );
  }
  const dp = decimals(move.currency);
  const payHref =
    move.moveType === "out_invoice" || move.moveType === "in_invoice"
      ? `/payments/new?type=${move.moveType === "out_invoice" ? "receive" : "send"}&partner=${move.partner?.id}&move=${move.id}`
      : "";
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={meta.title}
        title={move.number}
        sub={move.narration || meta.singular}
        action={
          <>
            {payHref && move.residual > 0 && <Link href={payHref} className="rounded-md bg-brass px-3.5 py-2 text-sm font-semibold text-white">Register payment</Link>}
            <DocumentTools kind="move" id={move.id} back={`/moves?type=${move.moveType}`} />
            <PrintButton />
          </>
        }
      />
      <Panel className="p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-muted">{meta.party}</div>
            <div className="font-display text-3xl">{move.partner?.name}</div>
            <div className="text-sm text-muted">{[move.partner?.city, move.partner?.country].filter(Boolean).join(", ")}</div>
          </div>
          <Status value={move.status} late={move.late} />
        </div>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-muted">Guest</dt>
            <dd className="font-display text-3xl">{move.guest || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-muted">Detail</dt>
            <dd className="font-medium">{move.detail || "—"}</dd>
          </div>
        </dl>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-4">
          <Item label="Invoice date" value={<When value={move.invoiceDate} />} />
          <Item label="Accounting date" value={<When value={move.accountingDate} />} />
          <Item label="Due" value={<When value={move.dueDate} />} />
          <Item label="Rate" value={`1 ${move.currency} = ${move.rate} KWD`} />
        </dl>
        <table className="books mt-6">
          <thead>
            <tr><th>Description</th><th>Account</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Tax</th><th className="num">Amount</th></tr>
          </thead>
          <tbody>
            {move.lines.map((line, index) => (
              <tr key={index}>
                <td>{line.label}</td>
                <td className="text-muted">{line.account}</td>
                <td className="num">{line.qty}</td>
                <td className="num"><Money amount={line.price} currency={move.currency} /></td>
                <td className="num">{line.taxRate}%</td>
                <td className="num"><Money amount={round(line.qty * line.price, dp)} currency={move.currency} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
          <Item label="Untaxed" value={<Money amount={move.amountUntaxed} currency={move.currency} />} />
          <Item label="Tax" value={<Money amount={move.amountTax} currency={move.currency} />} />
          <div className="flex justify-between border-t border-ink pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd><Money amount={move.amountTotal} currency={move.currency} /></dd>
          </div>
          <Item label="Booked in KWD" value={<Money amount={move.amountTotalLc} />} />
          <Item label="Still open" value={<Money amount={move.residual} currency={move.currency} />} />
        </dl>
        {move.payments.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-2xl">Payments</h2>
            <table className="books">
              <thead><tr><th>Receipt</th><th>Date</th><th className="num">Applied</th><th className="num">KWD</th></tr></thead>
              <tbody>
                {move.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td><Link className="font-semibold hover:text-brass" href={payment.href}>{payment.number}</Link></td>
                    <td><When value={payment.date} /></td>
                    <td className="num"><Money amount={payment.amount} currency={payment.currency} /></td>
                    <td className="num"><Money amount={payment.amountLc} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 sm:block">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
