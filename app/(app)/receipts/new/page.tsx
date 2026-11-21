import { ReceiptForm } from "@/components/ReceiptForm";
import { PageHeader } from "@/components/ui";
import { masters } from "@/lib/queries";

export default async function NewReceiptPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const sp = await searchParams;
  const kind = sp.kind === "payment" ? "payment" : "receipt";
  const data = await masters();
  return (
    <div>
      <PageHeader
        eyebrow="Manual voucher"
        title={kind === "receipt" ? "Bank receipt" : "Payment voucher"}
        sub="Use this when the entry is not a simple invoice payment: petty cash, bank charges, or a mix of currencies on one voucher."
      />
      <ReceiptForm kind={kind} accounts={data.accounts} partners={data.partners} currencies={data.currencies} />
    </div>
  );
}
