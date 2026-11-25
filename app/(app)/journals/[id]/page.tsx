import { notFound } from "next/navigation";
import { JournalForm } from "@/components/JournalForm";
import { PageHeader } from "@/components/ui";
import { todayISO } from "@/lib/money";
import { getJournal, masters } from "@/lib/queries";

export default async function EditJournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [entry, data] = await Promise.all([getJournal(id), masters()]);
  if (!entry) notFound();
  return (
    <div>
      <PageHeader
        eyebrow={entry.ref}
        title="Edit journal"
        sub="Saving replaces this ledger entry. Debits and credits must still match in KWD. If this journal came from an invoice or bill, the open balance follows it, unless a receipt is already allocated."
      />
      <JournalForm
        accounts={data.accounts}
        partners={data.partners}
        currencies={data.currencies}
        today={todayISO()}
        initial={entry}
      />
    </div>
  );
}
