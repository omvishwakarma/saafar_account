"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionSavePartner } from "@/lib/actions";
import type { CurrencyRow } from "@/lib/types";
import { Button, Field, inputClass } from "./ui";

export function PartnerForm({ role, currencies }: { role: "customer" | "vendor"; currencies: CurrencyRow[] }) {
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
          const result = await actionSavePartner({
            name: String(data.get("name") || ""),
            role,
            email: String(data.get("email") || ""),
            phone: String(data.get("phone") || ""),
            city: String(data.get("city") || ""),
            country: String(data.get("country") || ""),
            currency: String(data.get("currency") || "KWD"),
            taxId: String(data.get("taxId") || ""),
          });
          if (!result.ok) setError(result.error);
          else router.push(`/partners?role=${role}`);
        });
      }}
    >
      <Field label="Name"><input name="name" className={inputClass} required /></Field>
      <Field label="Default currency">
        <select name="currency" className={inputClass} defaultValue="KWD">
          {currencies.map((currency) => <option key={currency.code}>{currency.code}</option>)}
        </select>
      </Field>
      <Field label="Email"><input name="email" type="email" className={inputClass} /></Field>
      <Field label="Phone"><input name="phone" className={inputClass} /></Field>
      <Field label="City"><input name="city" className={inputClass} defaultValue="Kuwait" /></Field>
      <Field label="Country"><input name="country" className={inputClass} defaultValue="Kuwait" /></Field>
      <Field label="Tax ID"><input name="taxId" className={inputClass} /></Field>
      {error && <p className="text-sm text-red-800 md:col-span-2">{error}</p>}
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : `Save ${role}`}</Button>
      </div>
    </form>
  );
}
