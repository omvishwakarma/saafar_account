"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionDeleteMove, actionSaveMove } from "@/lib/actions";
import { MOVE_META } from "@/lib/company";
import { addDays, decimals, round, toBase, todayISO } from "@/lib/money";
import type { AccountRow, CurrencyRow, MoveType, PartnerRow } from "@/lib/types";
import { Button, Field, inputClass } from "./ui";

type Line = { label: string; accountId: string; qty: number; price: number; taxRate: number };

export function MoveForm({
  moveType,
  partners,
  currencies,
  accounts,
  initial,
}: {
  moveType: MoveType;
  partners: PartnerRow[];
  currencies: CurrencyRow[];
  accounts: AccountRow[];
  initial?: {
    id: string;
    partnerId: string;
    currency: string;
    rate: number;
    invoiceDate: string;
    accountingDate: string;
    dueDate: string;
    narration: string;
    lines: Line[];
  };
}) {
  const router = useRouter();
  const meta = MOVE_META[moveType];
  const income = meta.income;
  const usableAccounts = accounts.filter((account) => account.type === (income ? "income" : "expense"));
  const usablePartners = partners.filter((partner) => partner.role === meta.partyRole || partner.role === "both");
  const today = todayISO();
  const [partnerId, setPartnerId] = useState(initial?.partnerId || usablePartners[0]?.id || "");
  const [currency, setCurrency] = useState(initial?.currency || "KWD");
  const [rate, setRate] = useState(initial?.rate || 1);
  const [invoiceDate, setInvoiceDate] = useState(initial?.invoiceDate || today);
  const [accountingDate, setAccountingDate] = useState(initial?.accountingDate || today);
  const [dueDate, setDueDate] = useState(initial?.dueDate || addDays(today, 7));
  const [narration, setNarration] = useState(initial?.narration || "");
  const [lines, setLines] = useState<Line[]>(
    initial?.lines?.length
      ? initial.lines
      : [{ label: "", accountId: usableAccounts[0]?.id || "", qty: 1, price: 0, taxRate: 0 }],
  );
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const totals = useMemo(() => {
    const dp = decimals(currency);
    let untaxed = 0;
    let tax = 0;
    for (const line of lines) {
      const base = round((Number(line.qty) || 0) * (Number(line.price) || 0), dp);
      const taxAmt = round(base * (Number(line.taxRate) || 0) / 100, dp);
      untaxed = round(untaxed + base, dp);
      tax = round(tax + taxAmt, dp);
    }
    const total = round(untaxed + tax, dp);
    return { untaxed, tax, total, base: toBase(total, Number(rate) || 0) };
  }, [lines, currency, rate]);

  function update(index: number, patch: Partial<Line>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function submit(post: boolean) {
    setError("");
    start(async () => {
      const result = await actionSaveMove({
        id: initial?.id,
        moveType,
        partnerId,
        currency,
        rate: Number(rate),
        invoiceDate,
        accountingDate,
        dueDate,
        narration,
        lines: lines.map((line) => ({
          ...line,
          qty: Number(line.qty),
          price: Number(line.price),
          taxRate: Number(line.taxRate),
        })),
        post,
      });
      if (!result.ok) setError(result.error);
      else router.push(`/moves/${result.id}`);
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit(false);
      }}
      className="space-y-5"
    >
      <div className="grid gap-4 rounded-2xl border border-line bg-paper p-5 md:grid-cols-4">
        <Field label={meta.party}>
          <select className={inputClass} value={partnerId} onChange={(event) => setPartnerId(event.target.value)}>
            {usablePartners.map((partner) => (
              <option key={partner.id} value={partner.id}>{partner.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Currency">
          <select
            className={inputClass}
            value={currency}
            onChange={(event) => {
              const next = event.target.value;
              setCurrency(next);
              const found = currencies.find((item) => item.code === next);
              if (found) setRate(found.rate);
            }}
          >
            {currencies.map((item) => (
              <option key={item.code} value={item.code}>{item.code}</option>
            ))}
          </select>
        </Field>
        <Field label="Rate to KWD">
          <input className={inputClass} type="number" min="0" step="0.000001" value={rate} onChange={(event) => setRate(Number(event.target.value))} />
        </Field>
        <Field label="Invoice date">
          <input className={inputClass} type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} />
        </Field>
        <Field label="Accounting date">
          <input className={inputClass} type="date" value={accountingDate} onChange={(event) => setAccountingDate(event.target.value)} />
        </Field>
        <Field label="Due date">
          <input className={inputClass} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Narration">
            <input className={inputClass} value={narration} onChange={(event) => setNarration(event.target.value)} placeholder="File or guest reference" />
          </Field>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="books min-w-[760px]">
          <thead>
            <tr>
              <th>Description</th>
              <th>Account</th>
              <th className="num">Qty</th>
              <th className="num">Price</th>
              <th className="num">Tax %</th>
              <th className="num">Amount</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const amount = round((Number(line.qty) || 0) * (Number(line.price) || 0), decimals(currency));
              return (
                <tr key={index}>
                  <td><input className={inputClass} value={line.label} onChange={(event) => update(index, { label: event.target.value })} placeholder="Hotel, ticket, visa…" /></td>
                  <td>
                    <select className={inputClass} value={line.accountId} onChange={(event) => update(index, { accountId: event.target.value })}>
                      {usableAccounts.map((account) => (
                        <option key={account.id} value={account.id}>{account.code} · {account.name}</option>
                      ))}
                    </select>
                  </td>
                  <td><input className={`${inputClass} w-20 text-right`} type="number" min="0" step="1" value={line.qty} onChange={(event) => update(index, { qty: Number(event.target.value) })} /></td>
                  <td><input className={`${inputClass} w-28 text-right`} type="number" min="0" step="0.001" value={line.price} onChange={(event) => update(index, { price: Number(event.target.value) })} /></td>
                  <td><input className={`${inputClass} w-20 text-right`} type="number" min="0" step="0.01" value={line.taxRate} onChange={(event) => update(index, { taxRate: Number(event.target.value) })} /></td>
                  <td className="num tabular-nums">{amount.toLocaleString("en-US", { minimumFractionDigits: decimals(currency) })}</td>
                  <td>
                    <button type="button" className="text-xs text-muted hover:text-red-800" onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex flex-wrap items-end justify-between gap-4 p-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setLines((current) => [...current, { label: "", accountId: usableAccounts[0]?.id || "", qty: 1, price: 0, taxRate: 0 }])}
          >
            Add a line
          </Button>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-8"><dt className="text-muted">Untaxed</dt><dd className="tabular-nums">{totals.untaxed.toFixed(decimals(currency))} {currency}</dd></div>
            <div className="flex justify-between gap-8"><dt className="text-muted">Tax</dt><dd className="tabular-nums">{totals.tax.toFixed(decimals(currency))} {currency}</dd></div>
            <div className="flex justify-between gap-8 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{totals.total.toFixed(decimals(currency))} {currency}</dd></div>
            <div className="flex justify-between gap-8 text-muted"><dt>In KWD</dt><dd className="tabular-nums">{totals.base.toFixed(3)} KWD</dd></div>
          </dl>
        </div>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="ghost" disabled={pending}>Save draft</Button>
        <Button type="button" disabled={pending} onClick={() => submit(true)}>{pending ? "Posting…" : "Confirm and post"}</Button>
        {initial?.id && (
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            onClick={() => {
              start(async () => {
                const result = await actionDeleteMove(initial.id);
                if (!result.ok) setError(result.error);
                else router.push(`/moves?type=${moveType}`);
              });
            }}
          >
            Delete draft
          </Button>
        )}
      </div>
    </form>
  );
}
