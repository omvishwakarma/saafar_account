import { PaymentForm } from "@/components/PaymentForm";
import { PageHeader } from "@/components/ui";
import { masters, openMoves } from "@/lib/queries";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; partner?: string; move?: string }>;
}) {
  const sp = await searchParams;
  const data = await masters();
  const open = await openMoves();
  const paymentType = sp.type === "send" ? "send" : "receive";
  return (
    <div>
      <PageHeader
        eyebrow={paymentType === "receive" ? "Customer receipt" : "Vendor payment"}
        title={paymentType === "receive" ? "Receive money" : "Send money"}
        sub="Match the payment to open documents. If the currency or the rate differs from the invoice, the KWD gap is posted to exchange gain or loss."
      />
      <PaymentForm
        partners={data.partners}
        currencies={data.currencies}
        banks={data.accounts.filter((account) => account.subtype === "bank" || account.subtype === "cash")}
        open={open}
        preset={{ paymentType, partnerId: sp.partner, moveId: sp.move }}
      />
    </div>
  );
}
