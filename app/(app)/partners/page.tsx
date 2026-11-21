import Link from "next/link";
import { listPartners } from "@/lib/queries";
import { Button, Money, PageHeader, Panel } from "@/components/ui";

export default async function PartnersPage({ searchParams }: { searchParams: Promise<{ role?: string; q?: string }> }) {
  const sp = await searchParams;
  const role = sp.role === "vendor" ? "vendor" : "customer";
  const rows = await listPartners(role, sp.q || "");
  return (
    <div>
      <PageHeader
        eyebrow={role === "customer" ? "Sales" : "Purchase"}
        title={role === "customer" ? "Customers" : "Vendors"}
        sub="Balances are open documents translated to KWD. Credit notes reduce what a customer owes."
        action={<Button href={`/partners/new?role=${role}`}>New {role}</Button>}
      />
      <form className="mb-4">
        <input type="hidden" name="role" value={role} />
        <input name="q" defaultValue={sp.q || ""} placeholder="Search" className="w-full max-w-sm rounded-md border border-line bg-paper px-3 py-2 text-sm" />
      </form>
      <Panel>
        <div className="overflow-x-auto">
          <table className="books min-w-[720px]">
            <thead>
              <tr>
                <th>Name</th>
                <th>City</th>
                <th>Currency</th>
                <th>Contact</th>
                <th className="num">{role === "customer" ? "Receivable" : "Payable"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/reports/partner-ledger?partner=${row.id}`} className="font-semibold hover:text-brass">{row.name}</Link>
                  </td>
                  <td>{row.city}</td>
                  <td>{row.currency}</td>
                  <td className="text-muted">{row.email || row.phone}</td>
                  <td className="num"><Money amount={role === "customer" ? row.receivable : row.payable} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
