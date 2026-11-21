import { notFound } from "next/navigation";
import { MoveForm } from "@/components/MoveForm";
import { PageHeader } from "@/components/ui";
import { MOVE_META } from "@/lib/company";
import { masters } from "@/lib/queries";
import type { MoveType } from "@/lib/types";

const types: MoveType[] = ["out_invoice", "out_refund", "in_invoice", "in_refund"];

export default async function NewMovePage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const sp = await searchParams;
  if (!types.includes(sp.type as MoveType)) notFound();
  const type = sp.type as MoveType;
  const data = await masters();
  const meta = MOVE_META[type];
  return (
    <div>
      <PageHeader eyebrow={meta.title} title={`New ${meta.singular.toLowerCase()}`} sub="Save a draft, or confirm it to post the receivable or payable and the income or cost." />
      <MoveForm moveType={type} partners={data.partners} currencies={data.currencies} accounts={data.accounts} />
    </div>
  );
}
