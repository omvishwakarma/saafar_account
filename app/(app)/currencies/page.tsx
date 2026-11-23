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
        sub="Kuwaiti Dinar is the company currency. Add a currency, change its rate, or delete one that is not used. Posted documents keep the rate they were saved with."
      />
      <CurrencyEditor currencies={data.currencies} />
    </div>
  );
}
