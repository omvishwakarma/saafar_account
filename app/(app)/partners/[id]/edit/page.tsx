import { notFound } from "next/navigation";
import { PartnerForm } from "@/components/PartnerForm";
import { PageHeader } from "@/components/ui";
import { todayISO } from "@/lib/money";
import { getPartner, masters } from "@/lib/queries";

export default async function EditPartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [partner, data] = await Promise.all([getPartner(id), masters()]);
  if (!partner) notFound();
  const role = partner.role === "vendor" ? "vendor" : "customer";
  return (
    <div>
      <PageHeader
        eyebrow={role === "customer" ? "Customer" : "Vendor"}
        title={`Edit ${partner.name}`}
        sub="Name, contact, currency, and opening balance. Changing the opening balance replaces the old opening entry when no receipt is allocated to it."
      />
      <PartnerForm
        role={role}
        currencies={data.currencies}
        today={todayISO()}
        partner={{
          id: partner.id,
          name: partner.name,
          email: partner.email,
          phone: partner.phone,
          city: partner.city,
          country: partner.country,
          currency: partner.currency,
          taxId: partner.taxId,
          openingAmount: partner.openingAmount,
          openingDate: partner.openingDate,
        }}
      />
    </div>
  );
}
