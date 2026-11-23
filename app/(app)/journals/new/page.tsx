import { JournalForm } from "@/components/JournalForm";
import { PageHeader } from "@/components/ui";
import { todayISO } from "@/lib/money";
import { masters } from "@/lib/queries";

export default async function NewJournalPage() {
  const data = await masters();
  return (
    <div>
      <PageHeader
        eyebrow="Ledger"
        title="New journal"
        sub="Debit and credit must match in KWD. A foreign amount is converted at the rate on that line and stays on the partner ledger."
      />
      <JournalForm accounts={data.accounts} partners={data.partners} currencies={data.currencies} today={todayISO()} />
    </div>
  );
}
