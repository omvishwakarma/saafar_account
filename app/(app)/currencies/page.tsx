import { CurrencyEditor } from "@/components/SetupForms";
import { PageHeader } from "@/components/ui";
import { masters } from "@/lib/queries";

export default async function CurrenciesPage() {
  const data = await masters();
  return (
    <div>
      <PageHeader
        eyebrow="Multi-currency"
        title="Exchange rates"
        sub="Kuwaiti Dinar is the company currency. One unit of a foreign currency is worth the rate below in KWD. Changing a rate does not rewrite posted documents."
      />
      <CurrencyEditor currencies={data.currencies} />
    </div>
  );
}
