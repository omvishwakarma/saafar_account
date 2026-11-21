import { VoucherForm } from "@/components/VoucherForm";
import { PageHeader } from "@/components/ui";
import { masters } from "@/lib/queries";

export default async function NewVoucherPage() {
  const data = await masters();
  const customers = data.partners.filter((partner) => partner.role === "customer" || partner.role === "both");
  const suppliers = data.partners.filter((partner) => partner.role === "vendor" || partner.role === "both");
  return (
    <div>
      <PageHeader eyebrow="Travel file" title="New voucher" sub="Pick the service first. Hotel and activity share the stay fields. Transfer uses pickup and drop off. Visa asks for country, nationality, and visa type." />
      <VoucherForm customers={customers} suppliers={suppliers} currencies={data.currencies} />
    </div>
  );
}
