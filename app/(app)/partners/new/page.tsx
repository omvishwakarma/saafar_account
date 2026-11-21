import { PartnerForm } from "@/components/PartnerForm";
import { PageHeader } from "@/components/ui";
import { masters } from "@/lib/queries";

export default async function NewPartnerPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const sp = await searchParams;
  const role = sp.role === "vendor" ? "vendor" : "customer";
  const data = await masters();
  return (
    <div>
      <PageHeader eyebrow="Directory" title={role === "customer" ? "New customer" : "New vendor"} sub="The default currency is what new invoices suggest. You can still invoice them in another currency." />
      <PartnerForm role={role} currencies={data.currencies} />
    </div>
  );
}
