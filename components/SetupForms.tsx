"use client";

import { useState, useTransition } from "react";
import { actionSaveAccount, actionUpdateRate } from "@/lib/actions";
import type { CurrencyRow } from "@/lib/types";
import { Button, Field, inputClass } from "./ui";

export function CurrencyEditor({ currencies }: { currencies: CurrencyRow[] }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      {currencies.map((currency) => (
        <form
          key={currency.code}
          className="grid grid-cols-[88px_1fr_140px_auto] items-center gap-3 rounded-xl border border-line bg-paper px-3 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            const rate = Number(new FormData(event.currentTarget).get("rate"));
            setError("");
            start(async () => {
              const result = await actionUpdateRate(currency.code, rate);
              if (!result.ok) setError(result.error);
            });
          }}
        >
          <div className="font-semibold">{currency.code}</div>
          <div className="text-sm text-muted">{currency.name}</div>
          <input name="rate" className={inputClass} type="number" step="0.000001" defaultValue={currency.rate} disabled={currency.code === "KWD"} />
          <Button type="submit" variant="ghost" disabled={pending || currency.code === "KWD"}>Save</Button>
        </form>
      ))}
      {error && <p className="text-sm text-red-800">{error}</p>}
      <p className="text-sm text-muted">A rate is how many Kuwaiti Dinars you get for 1 unit of that currency. Documents keep the rate they were posted with.</p>
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
