"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionDeleteCurrency, actionSaveAccount, actionSaveCurrency, actionUpdateAccount, actionUpdateRate } from "@/lib/actions";
import type { AccountRow, CurrencyRow } from "@/lib/types";
import { Button, Field, inputClass } from "./ui";

export function CurrencyEditor({ currencies }: { currencies: CurrencyRow[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function run(work: () => Promise<{ ok: true } | { ok: false; error: string }>, after?: () => void) {
    setError("");
    start(async () => {
      const result = await work();
      if (!result.ok) setError(result.error);
      else {
        after?.();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <form
        className="grid gap-3 rounded-2xl border border-line bg-paper p-4 md:grid-cols-[120px_1fr_160px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const form = event.currentTarget;
          run(
            () => actionSaveCurrency({
              code: String(data.get("code") || ""),
              name: String(data.get("name") || ""),
              rate: Number(data.get("rate") || 0),
            }),
            () => form.reset(),
          );
        }}
      >
        <Field label="Code"><input name="code" className={inputClass} maxLength={3} placeholder="THB" required /></Field>
        <Field label="Name"><input name="name" className={inputClass} placeholder="Thai Baht" required /></Field>
        <Field label="Rate in KWD"><input name="rate" className={inputClass} type="number" step="0.000001" min="0" placeholder="0.009" required /></Field>
        <div className="flex items-end"><Button type="submit" disabled={pending}>Add currency</Button></div>
      </form>
      {currencies.map((currency) => (
        <form
          key={currency.code}
          className="grid items-center gap-3 rounded-xl border border-line bg-paper px-3 py-2 sm:grid-cols-[88px_1fr_140px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            const rate = Number(new FormData(event.currentTarget).get("rate"));
            run(() => actionUpdateRate(currency.code, rate));
          }}
        >
          <div className="font-semibold">{currency.code}</div>
          <div className="text-sm text-muted">{currency.name}</div>
          <input name="rate" className={inputClass} type="number" step="0.000001" defaultValue={currency.rate} disabled={currency.code === "KWD"} />
          <div className="flex gap-2">
            <Button type="submit" variant="ghost" disabled={pending || currency.code === "KWD"}>Save</Button>
            {currency.code !== "KWD" && (
              <Button
                type="button"
                variant="danger"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm(`Delete ${currency.code}?`)) return;
                  run(() => actionDeleteCurrency(currency.code));
                }}
              >
                Delete
              </Button>
            )}
          </div>
        </form>
      ))}
      {error && <p className="text-sm text-red-800">{error}</p>}
      <p className="text-sm text-muted">A rate is how many Kuwaiti Dinars you get for 1 unit of that currency. Documents keep the rate they were posted with. A currency used on a partner or document cannot be deleted.</p>
    </div>
  );
}

export function AccountForm() {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3 rounded-2xl border border-line bg-paper p-4 md:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError("");
        start(async () => {
          const result = await actionSaveAccount({
            code: String(data.get("code") || ""),
            name: String(data.get("name") || ""),
            type: String(data.get("type") || "expense"),
            subtype: String(data.get("subtype") || "expense"),
          });
          if (!result.ok) setError(result.error);
          else {
            event.currentTarget.reset();
          }
        });
      }}
    >
      <Field label="Code"><input name="code" className={inputClass} required /></Field>
      <Field label="Name"><input name="name" className={inputClass} required /></Field>
      <Field label="Type">
        <select name="type" className={inputClass} defaultValue="expense">
          {["asset", "liability", "equity", "income", "expense"].map((type) => <option key={type}>{type}</option>)}
        </select>
      </Field>
      <Field label="Group">
        <select name="subtype" className={inputClass} defaultValue="expense">
          {["bank", "cash", "receivable", "payable", "prepayment", "current_asset", "fixed_asset", "current_liability", "tax", "equity", "income", "expense"].map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
      </Field>
      {error && <p className="text-sm text-red-800 md:col-span-4">{error}</p>}
      <div className="md:col-span-4"><Button type="submit" disabled={pending}>Add account</Button></div>
    </form>
  );
}

const TYPES = ["asset", "liability", "equity", "income", "expense"];
const GROUPS = ["bank", "cash", "receivable", "payable", "prepayment", "current_asset", "fixed_asset", "current_liability", "tax", "equity", "income", "expense"];

export function AccountList({ accounts }: { accounts: AccountRow[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function save(id: string, form: HTMLFormElement) {
    const data = new FormData(form);
    setError("");
    start(async () => {
      const result = await actionUpdateAccount(id, {
        code: String(data.get("code") || ""),
        name: String(data.get("name") || ""),
        type: String(data.get("type") || ""),
        subtype: String(data.get("subtype") || ""),
      });
      if (!result.ok) setError(result.error);
      else setEditing(null);
    });
  }

  return (
    <div>
      <table className="books">
        <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Group</th><th></th></tr></thead>
        <tbody>
          {accounts.map((account) => editing === account.id ? (
            <tr key={account.id}>
              <td colSpan={5}>
                <form
                  className="grid gap-2 py-2 md:grid-cols-[120px_1fr_140px_160px_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    save(account.id, event.currentTarget);
                  }}
                >
                  <input name="code" className={inputClass} defaultValue={account.code} required />
                  <input name="name" className={inputClass} defaultValue={account.name} required />
                  <select name="type" className={inputClass} defaultValue={account.type}>
                    {TYPES.map((type) => <option key={type}>{type}</option>)}
                  </select>
                  <select name="subtype" className={inputClass} defaultValue={account.subtype}>
                    {GROUPS.map((type) => <option key={type}>{type}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={pending}>Save</Button>
                    <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                </form>
              </td>
            </tr>
          ) : (
            <tr key={account.id}>
              <td className="font-semibold tabular-nums">{account.code}</td>
              <td>{account.name}</td>
              <td className="capitalize">{account.type}</td>
              <td className="text-muted">{account.subtype.replaceAll("_", " ")}</td>
              <td className="text-right"><Button variant="ghost" onClick={() => { setError(""); setEditing(account.id); }}>Edit</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && <p className="px-4 py-2 text-sm text-red-800">{error}</p>}
    </div>
  );
}
