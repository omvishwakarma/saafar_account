import { company } from "./company";
import { db } from "./db";
import {
  Account,
  AuditLog,
  Counter,
  Currency,
  HotelName,
  JournalEntry,
  Meta,
  Move,
  Partner,
  Payment,
  Receipt,
  User,
  Voucher,
} from "./models";

function stamp() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuwait",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}-${get("hour")}${get("minute")}`;
}

export function backupFileName(when = stamp()) {
  return `alomma-books-${when}.json`;
}

export async function buildBackup() {
  await db();
  const [currencies, accounts, partners, moves, payments, journals, vouchers, receipts, counters, meta, hotels, users, audit] =
    await Promise.all([
      Currency.find().sort({ code: 1 }).lean(),
      Account.find().sort({ code: 1 }).lean(),
      Partner.find().sort({ name: 1 }).lean(),
      Move.find().sort({ number: 1 }).lean(),
      Payment.find().sort({ number: 1 }).lean(),
      JournalEntry.find().sort({ date: 1, ref: 1 }).lean(),
      Voucher.find().sort({ number: 1 }).lean(),
      Receipt.find().sort({ number: 1 }).lean(),
      Counter.find().sort({ key: 1 }).lean(),
      Meta.find().sort({ key: 1 }).lean(),
      HotelName.find().sort({ name: 1 }).lean(),
      User.find().select("-passwordHash").sort({ username: 1 }).lean(),
      AuditLog.find().sort({ at: 1 }).lean(),
    ]);

  const collections = {
    currencies,
    accounts,
    partners,
    moves,
    payments,
    journals,
    vouchers,
    receipts,
    counters,
    meta,
    hotels,
    users,
    audit,
  };

  return {
    kind: "alomma-books-backup",
    version: 1,
    company: company.name,
    base: company.base,
    exportedAt: new Date().toISOString(),
    note: "Full copy of the books. Passwords are not included. Keep this file private.",
    counts: Object.fromEntries(Object.entries(collections).map(([name, rows]) => [name, rows.length])),
    collections,
  };
}
