import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, Money, PageHeader, Panel, When } from "@/components/ui";
import { getPartner } from "@/lib/queries";

export default async function PartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const partner = await getPartner(id);
  if (!partner) notFound();
  const vendor = partner.role === "vendor";
  const fields = [
    ["Name", partner.name],
    ["Currency", partner.currency],
    ["Email", partner.email || "—"],
    ["Phone", partner.phone || "—"],
    ["City", partner.city || "—"],
    ["Country", partner.country || "—"],
    ["Tax ID", partner.taxId || "—"],
  ];
  return (
    <div>
      <PageHeader
        eyebrow={vendor ? "Vendor" : "Customer"}
        title={partner.name}
        sub={vendor ? "Supplier details and the opening balance posted to Accounts Payable." : "Customer details and the opening balance posted to Accounts Receivable."}
        action={
          <>
            <Button href={`/partners/${partner.id}/edit`}>Edit</Button>
            <Button href={`/reports/partner-ledger?partner=${partner.id}`} variant="ghost">Ledger</Button>
          </>
        }
      />
      <Panel className="max-w-3xl p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</dt>
              <dd className="mt-1 text-sm">{value}</dd>
            </div>
          ))}
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Opening balance</dt>
            <dd className="mt-1 text-sm"><Money amount={partner.openingAmount} currency={partner.currency} /></dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Opening date</dt>
            <dd className="mt-1 text-sm">{partner.openingDate ? <When value={partner.openingDate} /> : "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{vendor ? "Payable" : "Receivable"}</dt>
            <dd className="mt-1 text-sm"><Money amount={vendor ? partner.payable : partner.receivable} /></dd>
          </div>
        </dl>
        <p className="mt-5 text-sm text-muted">
          A positive opening balance is what {vendor ? "you owe this vendor" : "this customer owes you"}. A negative amount is the opposite balance.{" "}
          <Link className="font-semibold text-brass" href={`/reports/partner-ledger?partner=${partner.id}`}>Open the ledger</Link>
        </p>
      </Panel>
    </div>
  );
}
