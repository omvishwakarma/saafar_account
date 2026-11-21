import { AgedReport } from "@/components/AgedReport";
import { todayISO } from "@/lib/money";
import { reportAged } from "@/lib/queries";

export default async function AgedPayablePage({ searchParams }: { searchParams: Promise<{ asOf?: string }> }) {
  const sp = await searchParams;
  const asOf = sp.asOf || todayISO();
  const report = await reportAged("payable", asOf);
  return <AgedReport title="Aged payable" report={report} />;
}
