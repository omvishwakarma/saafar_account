import { VoucherForm } from "@/components/VoucherForm";
import { PageHeader } from "@/components/ui";
import { masters } from "@/lib/queries";

export default async function NewVoucherPage() {
  const data = await masters();
  const customers = data.partners.filter((partner) => partner.role === "customer" || partner.role === "both");
  const suppliers = data.partners.filter((partner) => partner.role === "vendor" || partner.role === "both");
  return (
    <div>
      <PageHeader eyebrow="Travel file" title="New hotel voucher" sub="Enter the supplier cost and the customer sell. The slip on the right shows the margin in KWD before you post." />
      <VoucherForm customers={customers} suppliers={suppliers} currencies={data.currencies} />
    </div>
  );
}
