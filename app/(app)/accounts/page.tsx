import { AccountForm, AccountList } from "@/components/SetupForms";
import { PageHeader, Panel } from "@/components/ui";
import { masters } from "@/lib/queries";

export default async function AccountsPage() {
  const data = await masters();
  return (
    <div>
      <PageHeader eyebrow="Setup" title="Chart of accounts" sub="Customer and supplier balances sit on the control accounts. The partner ledger shows who they belong to." />
      <AccountForm />
      <Panel className="mt-4">
        <AccountList accounts={data.accounts} />
      </Panel>
    </div>
  );
}
