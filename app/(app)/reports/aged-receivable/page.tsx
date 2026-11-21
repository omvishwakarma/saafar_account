import { AgedReport } from "@/components/AgedReport";
import { todayISO } from "@/lib/money";
import { reportAged } from "@/lib/queries";

export default async function AgedReceivablePage({ searchParams }: { searchParams: Promise<{ asOf?: string }> }) {
  const sp = await searchParams;
  const asOf = sp.asOf || todayISO();
  const report = await reportAged("receivable", asOf);
  return <AgedReport title="Aged receivable" report={report} />;
}
