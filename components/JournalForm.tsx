"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionPostJournal } from "@/lib/actions";
import { round, toBase } from "@/lib/money";
import type { AccountRow, CurrencyRow, PartnerRow } from "@/lib/types";
import { Button, Field, inputClass } from "./ui";

type Line = {
  accountId: string;
  partnerId: string;
  label: string;
  currency: string;
  rate: string;
  debit: string;
  credit: string;
};

const blank = (currency: CurrencyRow | undefined): Line => ({
  accountId: "",
  partnerId: "",
  label: "",
  currency: currency?.code || "KWD",
  rate: String(currency?.rate || 1),
  debit: "",
  credit: "",
});

export function JournalForm({
  accounts,
  partners,
  currencies,
  today,
}: {
  accounts: AccountRow[];
  partners: PartnerRow[];
  currencies: CurrencyRow[];
  today: string;
}) {
  const router = useRouter();
  const kwd = currencies.find((row) => row.code === "KWD");
  const [date, setDate] = useState(today);
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<Line[]>([blank(kwd), blank(kwd)]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function patch(index: number, next: Partial<Line>) {
    setLines((current) => current.map((line, item) => (item === index ? { ...line, ...next } : line)));
  }

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const line of lines) {
      const rate = Number(line.rate) || 0;
      debit = round(debit + toBase(Number(line.debit) || 0, rate), 3);
      credit = round(credit + toBase(Number(line.credit) || 0, rate), 3);
    }
    return { debit, credit, diff: round(debit - credit, 3) };
  }, [lines]);

  function save() {
    setError("");
    start(async () => {
      const result = await actionPostJournal({
        date,
        memo,
        lines: lines.map((line) => ({
          accountId: line.accountId,
          partnerId: line.partnerId,
          label: line.label,
          currency: line.currency,
          rate: Number(line.rate),
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
        })),
      });
      if (!result.ok) setError(result.error);
      else router.push("/journals");
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-paper p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Date"><input className={inputClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
        <Field label="Memo"><input className={inputClass} value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="What this entry is for" /></Field>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="books min-w-[980px]">
          <thead>
            <tr>
              <th>Account</th>
              <th>Partner</th>
              <th>Label</th>
              <th>Cur</th>
              <th className="num">Rate</th>
              <th className="num">Debit</th>
              <th className="num">Credit</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index}>
                <td>
                  <select className={inputClass} value={line.accountId} onChange={(event) => patch(index, { accountId: event.target.value })}>
                    <option value="">Choose</option>
                    {accounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
                  </select>
                </td>
                <td>
                  <select className={inputClass} value={line.partnerId} onChange={(event) => patch(index, { partnerId: event.target.value })}>
                    <option value="">None</option>
                    {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
                  </select>
                </td>
                <td><input className={inputClass} value={line.label} onChange={(event) => patch(index, { label: event.target.value })} /></td>
                <td>
                  <select
                    className={inputClass}
                    value={line.currency}
                    onChange={(event) => {
                      const currency = currencies.find((row) => row.code === event.target.value);
                      patch(index, { currency: event.target.value, rate: String(currency?.rate || 1) });
                    }}
                  >
                    {currencies.map((currency) => <option key={currency.code}>{currency.code}</option>)}
                  </select>
                </td>
                <td><input className={`${inputClass} text-right`} type="number" step="0.000001" value={line.rate} onChange={(event) => patch(index, { rate: event.target.value })} /></td>
                <td><input className={`${inputClass} text-right`} type="number" min="0" step="0.001" value={line.debit} onChange={(event) => patch(index, { debit: event.target.value, credit: event.target.value ? "" : line.credit })} /></td>
                <td><input className={`${inputClass} text-right`} type="number" min="0" step="0.001" value={line.credit} onChange={(event) => patch(index, { credit: event.target.value, debit: event.target.value ? "" : line.debit })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Button variant="ghost" onClick={() => setLines((current) => [...current, blank(kwd)])}>Add line</Button>
        <div className="text-muted">
          Debit {totals.debit.toFixed(3)} KWD · Credit {totals.credit.toFixed(3)} KWD
          {totals.diff !== 0 && <span className="ml-2 text-red-800">Out by {totals.diff.toFixed(3)}</span>}
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-800">{error}</p>}
      <Button className="mt-4" disabled={pending} onClick={save}>{pending ? "Posting…" : "Post journal"}</Button>
    </div>
  );
}
