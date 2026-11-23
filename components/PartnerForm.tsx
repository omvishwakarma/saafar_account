"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionSavePartner, actionUpdatePartner } from "@/lib/actions";
import type { CurrencyRow } from "@/lib/types";
import { Button, Field, inputClass } from "./ui";

export function PartnerForm({
  role,
  currencies,
  today,
  partner,
}: {
  role: "customer" | "vendor";
  currencies: CurrencyRow[];
  today: string;
  partner?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    city: string;
    country: string;
    currency: string;
    taxId: string;
    openingAmount: number;
    openingDate: string;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      className="grid max-w-3xl gap-4 rounded-2xl border border-line bg-paper p-5 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError("");
        start(async () => {
          const input = {
            name: String(data.get("name") || ""),
            role,
            email: String(data.get("email") || ""),
            phone: String(data.get("phone") || ""),
            city: String(data.get("city") || ""),
            country: String(data.get("country") || ""),
            currency: String(data.get("currency") || "KWD"),
            taxId: String(data.get("taxId") || ""),
            openingAmount: Number(data.get("openingAmount") || 0),
            openingDate: String(data.get("openingDate") || ""),
          };
          const result = partner ? await actionUpdatePartner(partner.id, input) : await actionSavePartner(input);
          if (!result.ok) setError(result.error);
          else router.push(partner ? `/partners/${partner.id}` : `/partners?role=${role}`);
        });
      }}
    >
      <Field label="Name"><input name="name" className={inputClass} defaultValue={partner?.name || ""} required /></Field>
      <Field label="Default currency">
        <select name="currency" className={inputClass} defaultValue={partner?.currency || "KWD"}>
          {currencies.map((currency) => <option key={currency.code}>{currency.code}</option>)}
        </select>
      </Field>
      <Field label="Email"><input name="email" type="email" className={inputClass} defaultValue={partner?.email || ""} /></Field>
      <Field label="Phone"><input name="phone" className={inputClass} defaultValue={partner?.phone || ""} /></Field>
      <Field label="City"><input name="city" className={inputClass} defaultValue={partner?.city || "Kuwait"} /></Field>
      <Field label="Country"><input name="country" className={inputClass} defaultValue={partner?.country || "Kuwait"} /></Field>
      <Field label="Tax ID"><input name="taxId" className={inputClass} defaultValue={partner?.taxId || ""} /></Field>
      <Field label="Opening balance">
        <input name="openingAmount" className={inputClass} type="number" step="0.001" defaultValue={partner?.openingAmount ?? 0} />
      </Field>
      <Field label="Opening date"><input name="openingDate" className={inputClass} type="date" defaultValue={partner?.openingDate || today} /></Field>
      <p className="text-sm text-muted md:col-span-2">
        {role === "customer"
          ? "Positive means this customer already owes you. Negative means you already owe them a credit. Amount is in their default currency."
          : "Positive means you already owe this vendor. Negative means they already have a debit with you. Amount is in their default currency."}
      </p>
      {error && <p className="text-sm text-red-800 md:col-span-2">{error}</p>}
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : partner ? "Save changes" : `Save ${role}`}</Button>
      </div>
    </form>
  );
}
