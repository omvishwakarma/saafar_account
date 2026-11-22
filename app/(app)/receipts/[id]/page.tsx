import Link from "next/link";
import { notFound } from "next/navigation";
import { AllocateAdvance } from "@/components/AllocateAdvance";
import { DocumentTools } from "@/components/DocumentTools";
import { PrintButton } from "@/components/PrintButton";
import { ReceiptForm } from "@/components/ReceiptForm";
import { Money, PageHeader, Panel, Status, When } from "@/components/ui";
import { getReceipt, masters, openMoves } from "@/lib/queries";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const receipt = await getReceipt(id);
  if (!receipt) notFound();
  if (receipt.status === "draft") {
    const data = await masters();
    return (
      <div>
        <PageHeader
          eyebrow={receipt.kind === "receipt" ? "Bank receipt" : "Payment voucher"}
          title={receipt.number}
          sub="Draft"
        />
        <ReceiptForm
          kind={receipt.kind}
          accounts={data.accounts}
          partners={data.partners}
          currencies={data.currencies}
          initial={{
            id: receipt.id,
            date: receipt.date,
            branch: receipt.branch,
            party: receipt.party,
            reference: receipt.reference,
            remarks: receipt.remarks,
            lines: receipt.lines.map((line) => ({
              accountId: line.accountId,
              partnerId: line.partnerId,
              remarks: line.remarks,
              currency: line.currency,
              rate: line.rate,
              fcAmount: line.fcAmount,
              side: line.debit > 0 ? "debit" : "credit",
              chequeNo: line.chequeNo,
              chequeDate: line.chequeDate,
              bankName: line.bankName,
            })),
          }}
        />
      </div>
    );
  }
  const documents = receipt.advance && receipt.advance.openLc > 0
    ? (await openMoves()).filter((row) =>
        row.partnerId === receipt.advance?.partnerId &&
        row.moveType === (receipt.advance?.side === "supplier" ? "in_invoice" : "out_invoice"),
      )
    : [];
  return (
    <div>
      <PageHeader
        eyebrow={receipt.kind === "receipt" ? "Bank receipt" : "Payment voucher"}
        title={receipt.number}
        sub={[receipt.branch, receipt.party, receipt.reference].filter(Boolean).join(" · ")}
        action={
          <>
            <DocumentTools kind="receipt" id={receipt.id} back={`/receipts?kind=${receipt.kind}`} />
            <PrintButton />
          </>
        }
      />
      <Panel className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted"><When value={receipt.date} />{receipt.remarks ? ` · ${receipt.remarks}` : ""}</div>
          <Status value={receipt.status} />
        </div>
        <div className="overflow-x-auto">
          <table className="books min-w-[860px]">
            <thead>
              <tr>
                <th>Account</th><th>Partner</th><th>Remarks</th><th>Cur</th><th className="num">Rate</th><th className="num">FC</th><th className="num">Debit</th><th className="num">Credit</th>
              </tr>
            </thead>
            <tbody>
              {receipt.lines.map((line, index) => (
                <tr key={index}>
                  <td>{line.account}</td>
                  <td>{line.partner}</td>
                  <td>{line.remarks}{line.chequeNo ? ` · chq ${line.chequeNo}` : ""}</td>
                  <td>{line.currency}</td>
                  <td className="num">{line.rate}</td>
                  <td className="num"><Money amount={line.fcAmount} currency={line.currency} /></td>
                  <td className="num">{line.debit ? <Money amount={line.debit} /> : ""}</td>
                  <td className="num">{line.credit ? <Money amount={line.credit} /> : ""}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6}>Total</td>
                <td className="num"><Money amount={receipt.totalDebit} /></td>
                <td className="num"><Money amount={receipt.totalCredit} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
        {receipt.allocations.length > 0 && (
          <div className="mt-6">
            <h2 className="font-display text-2xl">Allocated</h2>
            <table className="books">
              <thead><tr><th>Document</th><th className="num">Applied</th><th className="num">KWD</th></tr></thead>
              <tbody>
                {receipt.allocations.map((row) => (
                  <tr key={row.moveId}>
                    <td><Link className="font-semibold hover:text-brass" href={`/moves/${row.moveId}`}>{row.number}</Link></td>
                    <td className="num"><Money amount={row.amount} currency={row.currency} /></td>
                    <td className="num"><Money amount={row.amountLc} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {receipt.advance && receipt.advance.openLc > 0 && (
          <AllocateAdvance receiptId={receipt.id} openLc={receipt.advance.openLc} documents={documents} />
        )}
      </Panel>
    </div>
  );
}
