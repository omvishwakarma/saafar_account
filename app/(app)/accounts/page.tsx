import { AccountForm } from "@/components/SetupForms";
import { PageHeader, Panel } from "@/components/ui";
import { masters } from "@/lib/queries";

export default async function AccountsPage() {
  const data = await masters();
  return (
    <div>
      <PageHeader eyebrow="Setup" title="Chart of accounts" sub="Customer and supplier balances sit on the control accounts. The partner ledger shows who they belong to." />
      <AccountForm />
      <Panel className="mt-4">
        <table className="books">
          <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Group</th></tr></thead>
          <tbody>
            {data.accounts.map((account) => (
              <tr key={account.id}>
                <td className="font-semibold tabular-nums">{account.code}</td>
                <td>{account.name}</td>
                <td className="capitalize">{account.type}</td>
                <td className="text-muted">{account.subtype.replaceAll("_", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
