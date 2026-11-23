import mongoose from "mongoose";
import { company } from "./company";
import { formatDate, isoDate, round, todayISO } from "./money";
import { voucherServiceDetail } from "./voucher-detail";
import {
  Account,
  Currency,
  JournalEntry,
  Move,
  Partner,
  Payment,
  Receipt,
  Voucher,
} from "./models";
import { ensureSeed } from "./seed";
import type { AccountRow, CurrencyRow, MoveType, OpenMove, PartnerRow } from "./types";

function sid(value: unknown): string {
  if (!value) return "";
  if (typeof value === "object" && value && "_id" in value) return String((value as { _id: unknown })._id);
  return String(value);
}

function partnerName(value: unknown) {
  if (value && typeof value === "object" && "name" in value) return String((value as { name: unknown }).name);
  return "—";
}

async function boot() {
  await ensureSeed();
}

export async function masters() {
  await boot();
  const [partners, currencies, accounts] = await Promise.all([
    Partner.find().sort({ name: 1 }).lean(),
    Currency.find().sort({ code: 1 }).lean(),
    Account.find().sort({ code: 1 }).lean(),
  ]);
  return {
    partners: partners.map(serializePartner),
    currencies: currencies.map(serializeCurrency),
    accounts: accounts.map(serializeAccount),
  };
}

function serializePartner(row: {
  _id: unknown;
  name: string;
  role: "customer" | "vendor" | "both";
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  currency?: string | null;
  taxId?: string | null;
}): PartnerRow {
  return {
    id: String(row._id),
    name: row.name,
    role: row.role,
    email: row.email || "",
    phone: row.phone || "",
    city: row.city || "",
    country: row.country || "",
    currency: row.currency || company.base,
    taxId: row.taxId || "",
  };
}

function serializeCurrency(row: { _id: unknown; code: string; name: string; rate: number }): CurrencyRow {
  return { id: String(row._id), code: row.code, name: row.name, rate: row.rate };
}

function serializeAccount(row: { _id: unknown; code: string; name: string; type: string; subtype: string }): AccountRow {
  return { id: String(row._id), code: row.code, name: row.name, type: row.type, subtype: row.subtype };
}

export async function openMoves(): Promise<OpenMove[]> {
  await boot();
  const rows = await Move.find({
    status: { $in: ["posted", "partial"] },
    residual: { $gt: 0 },
    moveType: { $in: ["out_invoice", "in_invoice"] },
  })
    .sort({ dueDate: 1 })
    .lean();
  return rows.map((row) => ({
    id: String(row._id),
    number: row.number,
    moveType: row.moveType as MoveType,
    partnerId: sid(row.partnerId),
    currency: row.currency,
    rate: row.rate,
    residual: row.residual,
    residualLc: row.residualLc,
    dueDate: isoDate(row.dueDate),
    total: row.amountTotal,
  }));
}

const MOVE_TYPES: MoveType[] = ["out_invoice", "out_refund", "in_invoice", "in_refund"];

export async function listMoves(type: string, filter: string, q: string) {
  await boot();
  const moveType = MOVE_TYPES.includes(type as MoveType) ? (type as MoveType) : "out_invoice";
  const [rows, cards] = await Promise.all([
    Move.find({ moveType }).populate("partnerId", "name").sort({ invoiceDate: -1, number: -1 }).lean(),
    voucherCards(),
  ]);
  const today = todayISO();
  const mapped = rows.map((row) => {
    const due = isoDate(row.dueDate);
    const open = (row.status === "posted" || row.status === "partial") && row.residual > 0;
    const late = open && due < today;
    const primary = cardFor(cards, String(row._id), row.origin || "");
    return {
      id: String(row._id),
      number: row.number,
      partner: partnerName(row.partnerId),
      guest: primary.guest,
      detail: primary.detail,
      currency: row.currency,
      invoiceDate: isoDate(row.invoiceDate),
      dueDate: due,
      untaxed: row.amountUntaxed,
      total: row.amountTotal,
      residual: row.residual,
      residualLc: row.residualLc,
      status: row.status,
      late,
      origin: row.origin || "",
    };
  });
  const counts = {
    all: mapped.length,
    draft: mapped.filter((row) => row.status === "draft").length,
    open: mapped.filter((row) => row.status === "posted" || row.status === "partial").length,
    late: mapped.filter((row) => row.late).length,
    paid: mapped.filter((row) => row.status === "paid").length,
  };
  const query = q.trim().toLowerCase();
  const filtered = mapped.filter((row) => {
    if (filter === "draft" && row.status !== "draft") return false;
    if (filter === "open" && row.status !== "posted" && row.status !== "partial") return false;
    if (filter === "late" && !row.late) return false;
    if (filter === "paid" && row.status !== "paid") return false;
    if (!query) return true;
    return `${row.number} ${row.partner} ${row.guest} ${row.detail} ${row.origin}`.toLowerCase().includes(query);
  });
  return { moveType, rows: filtered, counts };
}

export async function getMove(id: string) {
  await boot();
  if (!mongoose.isValidObjectId(id)) return null;
  const row = await Move.findById(id).populate("partnerId").lean();
  if (!row) return null;
  const [payments, advances] = await Promise.all([
    Payment.find({ status: "posted", "allocations.moveId": row._id }).sort({ date: -1 }).lean(),
    Receipt.find({ status: "posted", "allocations.moveId": row._id }).sort({ date: -1 }).lean(),
  ]);
  const linked = await Voucher.findOne({
    $or: [{ invoiceId: row._id }, { billId: row._id }, ...(row.origin ? [{ number: row.origin }] : [])],
  })
    .select("paxName service checkIn checkOut details")
    .lean();
  const accounts = await Account.find().lean();
  const accountName = new Map(accounts.map((account) => [String(account._id), `${account.code} · ${account.name}`]));
  const partner = row.partnerId && typeof row.partnerId === "object" ? serializePartner(row.partnerId as never) : null;
  return {
    id: String(row._id),
    number: row.number,
    moveType: row.moveType as MoveType,
    partner,
    currency: row.currency,
    rate: row.rate,
    invoiceDate: isoDate(row.invoiceDate),
    accountingDate: isoDate(row.accountingDate),
    dueDate: isoDate(row.dueDate),
    narration: row.narration || "",
    origin: row.origin || "",
    guest: linked ? String(linked.paxName || "").trim() : "",
    detail: linked ? voucherServiceDetail(linked) : "",
    lines: row.lines.map((line) => ({
      label: line.label,
      accountId: sid(line.accountId),
      account: accountName.get(sid(line.accountId)) || "Account",
      qty: line.qty,
      price: line.price,
      taxRate: line.taxRate,
    })),
    amountUntaxed: row.amountUntaxed,
    amountTax: row.amountTax,
    amountTotal: row.amountTotal,
    amountTotalLc: row.amountTotalLc,
    residual: row.residual,
    residualLc: row.residualLc,
    status: row.status,
    late:
      (row.status === "posted" || row.status === "partial") &&
      row.residual > 0 &&
      isoDate(row.dueDate) < todayISO(),
    payments: [
      ...payments.map((payment) => {
        const alloc = payment.allocations.find((item) => String(item.moveId) === String(row._id));
        return {
          id: String(payment._id),
          href: `/payments/${payment._id}`,
          number: payment.number,
          date: isoDate(payment.date),
          currency: payment.currency,
          amount: alloc?.amount || 0,
          amountLc: alloc?.amountLc || 0,
        };
      }),
      ...advances.map((receipt) => {
        const alloc = (receipt.allocations || []).find((item) => String(item.moveId) === String(row._id));
        return {
          id: String(receipt._id),
          href: `/receipts/${receipt._id}`,
          number: receipt.number,
          date: isoDate(receipt.date),
          currency: "KWD",
          amount: alloc?.amount || 0,
          amountLc: alloc?.amountLc || 0,
        };
      }),
    ],
  };
}

export async function listPayments() {
  await boot();
  const rows = await Payment.find().populate("partnerId", "name").sort({ date: -1 }).lean();
  return rows.map((row) => ({
    id: String(row._id),
    number: row.number,
    paymentType: row.paymentType as "receive" | "send",
    partner: partnerName(row.partnerId),
    partnerId: sid(row.partnerId),
    date: isoDate(row.date),
    currency: row.currency,
    amount: row.amount,
    amountLc: row.amountLc,
    memo: row.memo || "",
    status: row.status,
    fxGain: row.fxGain || 0,
  }));
}

export async function getPayment(id: string) {
  await boot();
  if (!mongoose.isValidObjectId(id)) return null;
  const row = await Payment.findById(id).populate("partnerId", "name").lean();
  if (!row) return null;
  const account = await Account.findById(row.accountId).lean();
  const moves = await Move.find({ _id: { $in: row.allocations.map((alloc) => alloc.moveId) } }).lean();
  const byId = new Map(moves.map((move) => [String(move._id), move]));
  return {
    id: String(row._id),
    number: row.number,
    paymentType: row.paymentType as "receive" | "send",
    partner: partnerName(row.partnerId),
    partnerId: sid(row.partnerId),
    currency: row.currency,
    rate: row.rate,
    amount: row.amount,
    amountLc: row.amountLc,
    account: account ? `${account.code} · ${account.name}` : "Account",
    accountId: sid(row.accountId),
    method: row.method,
    date: isoDate(row.date),
    memo: row.memo || "",
    status: row.status,
    fxGain: row.fxGain || 0,
    allocations: row.allocations.map((alloc) => ({
      moveId: String(alloc.moveId),
      number: byId.get(String(alloc.moveId))?.number || "Document",
      amount: alloc.amount,
      amountLc: alloc.amountLc,
      currency: byId.get(String(alloc.moveId))?.currency || row.currency,
    })),
  };
}

export async function listPartners(role: string, q: string) {
  await boot();
  const wanted = role === "vendor" ? "vendor" : "customer";
  const partners = await Partner.find({ role: { $in: [wanted, "both"] } }).sort({ name: 1 }).lean();
  const moves = await Move.find({ status: { $in: ["posted", "partial", "paid"] } }).lean();
  const query = q.trim().toLowerCase();
  return partners
    .filter((partner) => !query || `${partner.name} ${partner.city} ${partner.email}`.toLowerCase().includes(query))
    .map((partner) => {
      const own = moves.filter((move) => String(move.partnerId) === String(partner._id));
      const receivable = round(
        own
          .filter((move) => move.moveType === "out_invoice" || move.moveType === "out_refund")
          .reduce((sum, move) => sum + (move.moveType === "out_invoice" ? move.residualLc : -move.residualLc), 0),
        3,
      );
      const payable = round(
        own
          .filter((move) => move.moveType === "in_invoice" || move.moveType === "in_refund")
          .reduce((sum, move) => sum + (move.moveType === "in_invoice" ? move.residualLc : -move.residualLc), 0),
        3,
      );
      return { ...serializePartner(partner), receivable, payable };
    });
}

export async function getPartner(id: string) {
  await boot();
  if (!mongoose.isValidObjectId(id)) return null;
  const partner = await Partner.findById(id).lean();
  if (!partner) return null;
  const [moves, openings] = await Promise.all([
    Move.find({ partnerId: partner._id, status: { $in: ["posted", "partial", "paid"] } }).lean(),
    Move.find({ partnerId: partner._id, narration: "Opening balance" }).sort({ accountingDate: -1 }).lean(),
  ]);
  const receivable = round(
    moves
      .filter((move) => move.moveType === "out_invoice" || move.moveType === "out_refund")
      .reduce((sum, move) => sum + (move.moveType === "out_invoice" ? move.residualLc : -move.residualLc), 0),
    3,
  );
  const payable = round(
    moves
      .filter((move) => move.moveType === "in_invoice" || move.moveType === "in_refund")
      .reduce((sum, move) => sum + (move.moveType === "in_invoice" ? move.residualLc : -move.residualLc), 0),
    3,
  );
  const openingAmount = round(
    openings.reduce((sum, move) => {
      const sign = move.moveType === "out_refund" || move.moveType === "in_refund" ? -1 : 1;
      return sum + sign * (move.amountTotal || 0);
    }, 0),
    3,
  );
  return {
    ...serializePartner(partner),
    receivable,
    payable,
    openingAmount,
    openingDate: openings[0] ? isoDate(openings[0].accountingDate) : "",
  };
}

export async function listVouchers() {
  await boot();
  const rows = await Voucher.find().populate("customerId", "name").populate("supplierId", "name").sort({ date: -1 }).lean();
  return rows.map((row) => ({
    id: String(row._id),
    number: row.number,
    date: isoDate(row.date),
    paxName: row.paxName || "",
    customer: partnerName(row.customerId),
    supplier: partnerName(row.supplierId),
    service: row.service,
    city: row.city || "",
    supplierCurrency: row.supplierCurrency,
    customerCurrency: row.customerCurrency,
    supplierFc: row.supplierFc,
    customerFc: row.customerFc,
    sellValue: row.sellValue,
    supplierLc: row.supplierLc,
    markup: row.markup,
    status: row.status,
  }));
}

export async function getVoucher(id: string) {
  await boot();
  if (!mongoose.isValidObjectId(id)) return null;
  const row = await Voucher.findById(id).populate("customerId").populate("supplierId").lean();
  if (!row) return null;
  return {
    id: String(row._id),
    number: row.number,
    date: isoDate(row.date),
    paxName: row.paxName || "",
    supplier: serializePartner(row.supplierId as never),
    customer: serializePartner(row.customerId as never),
    service: row.service,
    city: row.city || "",
    consultant: row.consultant || "",
    payMode: row.payMode || "",
    supplierRef: row.supplierRef || "",
    customerRef: row.customerRef || "",
    checkIn: isoDate(row.checkIn),
    checkOut: isoDate(row.checkOut),
    nights: row.nights,
    adults: row.adults,
    children: row.children,
    infants: row.infants,
    meal: row.meal || "",
    roomType: row.roomType || "",
    roomCategory: row.roomCategory || "",
    roomView: row.roomView || "",
    details: (row.details || {}) as Record<string, string>,
    supplierFc: row.supplierFc,
    supplierCurrency: row.supplierCurrency,
    supRoe: row.supRoe,
    customerFc: row.customerFc,
    customerCurrency: row.customerCurrency,
    custRoe: row.custRoe,
    serviceFee: row.serviceFee,
    commPercent: row.commPercent,
    isReceived: row.isReceived,
    remarks: row.remarks || "",
    supplierLc: row.supplierLc,
    sellValue: row.sellValue,
    markup: row.markup,
    commissionLc: row.commissionLc,
    status: row.status,
    invoiceId: row.invoiceId ? String(row.invoiceId) : "",
    billId: row.billId ? String(row.billId) : "",
  };
}

export async function listReceipts(kind: string) {
  await boot();
  const wanted = kind === "payment" ? "payment" : "receipt";
  const rows = await Receipt.find({ kind: wanted }).sort({ date: -1 }).lean();
  return rows.map((row) => ({
    id: String(row._id),
    number: row.number,
    date: isoDate(row.date),
    party: row.party || "",
    reference: row.reference || "",
    remarks: row.remarks || "",
    total: row.totalDebit,
    status: row.status,
    branch: row.branch || "",
  }));
}

export async function getReceipt(id: string) {
  await boot();
  if (!mongoose.isValidObjectId(id)) return null;
  const row = await Receipt.findById(id).lean();
  if (!row) return null;
  const [accounts, partners] = await Promise.all([Account.find().lean(), Partner.find().lean()]);
  const accountName = new Map(accounts.map((account) => [String(account._id), account]));
  const partnersById = new Map(partners.map((partner) => [String(partner._id), partner.name]));
  let advanceLc = 0;
  let partnerId = "";
  let side: "supplier" | "customer" | "" = "";
  for (const line of row.lines) {
    const account = accountName.get(sid(line.accountId));
    if (!account || !line.partnerId) continue;
    if ((account.subtype === "payable" || account.subtype === "prepayment") && line.debit > 0) {
      advanceLc = round(advanceLc + line.debit, 3);
      partnerId = sid(line.partnerId);
      side = "supplier";
    }
    if ((account.subtype === "receivable" || account.code === "21000") && line.credit > 0) {
      advanceLc = round(advanceLc + line.credit, 3);
      partnerId = sid(line.partnerId);
      side = "customer";
    }
  }
  const usedLc = round((row.allocations || []).reduce((sum, item) => sum + (item.amountLc || 0), 0), 3);
  const allocatedMoves = await Move.find({ _id: { $in: (row.allocations || []).map((item) => item.moveId) } }).select("number currency").lean();
  const moveOf = new Map(allocatedMoves.map((move) => [String(move._id), move]));
  return {
    id: String(row._id),
    number: row.number,
    kind: row.kind as "receipt" | "payment",
    date: isoDate(row.date),
    branch: row.branch || "",
    party: row.party || "",
    reference: row.reference || "",
    remarks: row.remarks || "",
    totalDebit: row.totalDebit,
    totalCredit: row.totalCredit,
    status: row.status,
    lines: row.lines.map((line) => {
      const account = accountName.get(sid(line.accountId));
      return {
        accountId: sid(line.accountId),
        account: account ? `${account.code} · ${account.name}` : "Account",
        partnerId: sid(line.partnerId),
        partner: partnersById.get(sid(line.partnerId)) || "",
        remarks: line.remarks || "",
        currency: line.currency,
        rate: line.rate,
        fcAmount: line.fcAmount,
        debit: line.debit,
        credit: line.credit,
        chequeNo: line.chequeNo || "",
        chequeDate: isoDate(line.chequeDate),
        bankName: line.bankName || "",
      };
    }),
    advance: side
      ? { side, partnerId, partner: partnersById.get(partnerId) || "", totalLc: advanceLc, usedLc, openLc: round(advanceLc - usedLc, 3) }
      : null,
    allocations: (row.allocations || []).map((item) => {
      const move = moveOf.get(String(item.moveId));
      return {
        moveId: String(item.moveId),
        number: move?.number || "Document",
        currency: move?.currency || "KWD",
        amount: item.amount,
        amountLc: item.amountLc,
      };
    }),
  };
}

export async function listJournals() {
  await boot();
  const [entries, accounts, partners] = await Promise.all([
    JournalEntry.find().sort({ date: -1, createdAt: -1 }).limit(200).lean(),
    Account.find().lean(),
    Partner.find().lean(),
  ]);
  const accountName = new Map(accounts.map((account) => [String(account._id), `${account.code} · ${account.name}`]));
  const partnerNames = new Map(partners.map((partner) => [String(partner._id), partner.name]));
  return entries.map((entry) => ({
    id: String(entry._id),
    date: isoDate(entry.date),
    ref: entry.ref,
    memo: entry.memo || "",
    source: entry.source,
    debit: round(entry.lines.reduce((sum, line) => sum + line.debit, 0), 3),
    lines: entry.lines.map((line) => ({
      account: accountName.get(sid(line.accountId)) || "Account",
      partner: partnerNames.get(sid(line.partnerId)) || "",
      label: line.label || "",
      debit: line.debit,
      credit: line.credit,
      currency: line.currency,
      amountCurrency: line.amountCurrency,
      rate: line.rate,
    })),
  }));
}

type Sum = { _id: unknown; debit: number; credit: number };

async function sumsByAccount(match: Record<string, unknown> = {}) {
  const rows = (await JournalEntry.aggregate([
    { $match: match },
    { $unwind: "$lines" },
    { $group: { _id: "$lines.accountId", debit: { $sum: "$lines.debit" }, credit: { $sum: "$lines.credit" } } },
  ])) as Sum[];
  return new Map(rows.map((row) => [String(row._id), { debit: round(row.debit, 3), credit: round(row.credit, 3) }]));
}

function endOf(iso: string) {
  return new Date(`${iso}T23:59:59.999Z`);
}

export async function getDashboard() {
  await boot();
  const today = todayISO();
  const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00.000Z`);
  const [moves, accounts, totals, monthTotals, vouchers, payments, drafts] = await Promise.all([
    Move.find().populate("partnerId", "name").lean(),
    Account.find().lean(),
    sumsByAccount(),
    sumsByAccount({ date: { $gte: monthStart, $lte: endOf(today) } }),
    Voucher.find().sort({ date: -1 }).limit(5).populate("customerId", "name").lean(),
    Payment.find({ status: "posted" }).sort({ date: -1 }).limit(5).populate("partnerId", "name").lean(),
    Promise.all([
      Move.countDocuments({ status: "draft" }),
      Receipt.countDocuments({ status: "draft" }),
      Payment.countDocuments({ status: "draft" }),
      Voucher.countDocuments({ status: "draft" }),
    ]),
  ]);

  const sales = moves.filter((move) => move.moveType === "out_invoice");
  const refunds = moves.filter((move) => move.moveType === "out_refund" && move.status !== "draft");
  const bills = moves.filter((move) => move.moveType === "in_invoice");
  const debitNotes = moves.filter((move) => move.moveType === "in_refund" && move.status !== "draft");
  const openSales = sales.filter((move) => (move.status === "posted" || move.status === "partial") && move.residual > 0);
  const openBills = bills.filter((move) => (move.status === "posted" || move.status === "partial") && move.residual > 0);
  const sumLc = (rows: { residualLc: number }[]) => round(rows.reduce((sum, row) => sum + row.residualLc, 0), 3);

  const receivable = round(sumLc(openSales) - sumLc(refunds), 3);
  const payable = round(sumLc(openBills) - sumLc(debitNotes), 3);

  const banks = accounts
    .filter((account) => account.subtype === "bank" || account.subtype === "cash")
    .map((account) => {
      const sum = totals.get(String(account._id)) || { debit: 0, credit: 0 };
      return {
        id: String(account._id),
        code: account.code,
        name: account.name,
        balance: round(sum.debit - sum.credit, 3),
      };
    });
  const cash = round(banks.reduce((sum, bank) => sum + bank.balance, 0), 3);

  let income = 0;
  let expense = 0;
  for (const account of accounts) {
    const sum = monthTotals.get(String(account._id));
    if (!sum) continue;
    if (account.type === "income") income += sum.credit - sum.debit;
    if (account.type === "expense") expense += sum.debit - sum.credit;
  }

  const invoiceBuckets = bucketDue(openSales, today);
  const billBuckets = bucketDue(openBills, today);

  return {
    today,
    receivable,
    payable,
    cash,
    monthProfit: round(income - expense, 3),
    banks,
    invoices: {
      draft: sales.filter((move) => move.status === "draft").length,
      open: openSales.length,
      late: openSales.filter((move) => isoDate(move.dueDate) < today).length,
      openLc: sumLc(openSales),
      lateLc: sumLc(openSales.filter((move) => isoDate(move.dueDate) < today)),
      buckets: invoiceBuckets,
    },
    bills: {
      draft: bills.filter((move) => move.status === "draft").length,
      open: openBills.length,
      late: openBills.filter((move) => isoDate(move.dueDate) < today).length,
      openLc: sumLc(openBills),
      lateLc: sumLc(openBills.filter((move) => isoDate(move.dueDate) < today)),
      buckets: billBuckets,
    },
    unposted: drafts.reduce((sum, count) => sum + count, 0),
    vouchers: vouchers.map((row) => ({
      id: String(row._id),
      number: row.number,
      paxName: row.paxName || "—",
      customer: partnerName(row.customerId),
      city: row.city,
      sellValue: row.sellValue,
      status: row.status,
    })),
    payments: payments.map((row) => ({
      id: String(row._id),
      number: row.number,
      partner: partnerName(row.partnerId),
      paymentType: row.paymentType,
      amount: row.amount,
      currency: row.currency,
      date: isoDate(row.date),
    })),
  };
}

function bucketDue(rows: { dueDate: Date; residualLc: number }[], today: string) {
  const start = new Date(`${today}T12:00:00.000Z`).getTime();
  const week = 7 * 86400000;
  const groups = [
    { key: "overdue", label: "Overdue", amount: 0 },
    { key: "week", label: "Due in 7 days", amount: 0 },
    { key: "later", label: "Later", amount: 0 },
  ];
  for (const row of rows) {
    const delta = new Date(row.dueDate).getTime() - start;
    const target = delta < 0 ? groups[0] : delta <= week ? groups[1] : groups[2];
    target.amount = round(target.amount + row.residualLc, 3);
  }
  return groups;
}

export type StatementRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype: string;
  debit: number;
  credit: number;
  balance: number;
};

async function statement(asOf: string): Promise<StatementRow[]> {
  await boot();
  const [accounts, sums] = await Promise.all([
    Account.find().sort({ code: 1 }).lean(),
    sumsByAccount({ date: { $lte: endOf(asOf) } }),
  ]);
  return accounts.map((account) => {
    const sum = sums.get(String(account._id)) || { debit: 0, credit: 0 };
    const debitNormal = account.type === "asset" || account.type === "expense";
    const balance = round(debitNormal ? sum.debit - sum.credit : sum.credit - sum.debit, 3);
    return {
      id: String(account._id),
      code: account.code,
      name: account.name,
      type: account.type,
      subtype: account.subtype,
      debit: sum.debit,
      credit: sum.credit,
      balance,
    };
  });
}

export async function reportTrialBalance(asOf: string) {
  const rows = (await statement(asOf)).filter((row) => row.debit !== 0 || row.credit !== 0);
  const debit = round(rows.reduce((sum, row) => sum + row.debit, 0), 3);
  const credit = round(rows.reduce((sum, row) => sum + row.credit, 0), 3);
  return { asOf, rows, debit, credit, diff: round(debit - credit, 3) };
}

export async function reportBalanceSheet(asOf: string) {
  const rows = await statement(asOf);
  const earn = round(
    rows.filter((row) => row.type === "income").reduce((sum, row) => sum + row.balance, 0) -
      rows.filter((row) => row.type === "expense").reduce((sum, row) => sum + row.balance, 0),
    3,
  );
  const pick = (subtypes: string[]) => rows.filter((row) => subtypes.includes(row.subtype) && row.balance !== 0);
  const currentAssets = pick(["bank", "cash", "receivable", "prepayment", "current_asset"]);
  const fixedAssets = pick(["fixed_asset"]);
  const otherAssets = pick(["noncurrent_asset"]);
  const currentLiabilities = pick(["payable", "current_liability", "tax"]);
  const otherLiabilities = pick(["noncurrent_liability"]);
  const equity = pick(["equity"]);
  const total = (list: { balance: number }[]) => round(list.reduce((sum, row) => sum + row.balance, 0), 3);
  const assets = round(total(currentAssets) + total(fixedAssets) + total(otherAssets), 3);
  const liabilities = round(total(currentLiabilities) + total(otherLiabilities), 3);
  const equityTotal = round(total(equity) + earn, 3);
  const drafts = await Move.countDocuments({ status: "draft" });
  return {
    asOf,
    currentAssets,
    fixedAssets,
    otherAssets,
    currentLiabilities,
    otherLiabilities,
    equity,
    earnings: earn,
    assets,
    liabilities,
    equityTotal,
    balanced: Math.abs(round(assets - liabilities - equityTotal, 3)) < 0.05,
    gap: round(assets - liabilities - equityTotal, 3),
    unposted: drafts,
  };
}

export async function reportProfit(from: string, to: string) {
  await boot();
  const accounts = await Account.find().sort({ code: 1 }).lean();
  const sums = await sumsByAccount({ date: { $gte: new Date(`${from}T00:00:00.000Z`), $lte: endOf(to) } });
  const income = accounts
    .filter((account) => account.type === "income")
    .map((account) => {
      const sum = sums.get(String(account._id)) || { debit: 0, credit: 0 };
      return { ...serializeAccount(account), amount: round(sum.credit - sum.debit, 3) };
    })
    .filter((row) => row.amount !== 0);
  const expense = accounts
    .filter((account) => account.type === "expense")
    .map((account) => {
      const sum = sums.get(String(account._id)) || { debit: 0, credit: 0 };
      return { ...serializeAccount(account), amount: round(sum.debit - sum.credit, 3) };
    })
    .filter((row) => row.amount !== 0);
  const incomeTotal = round(income.reduce((sum, row) => sum + row.amount, 0), 3);
  const expenseTotal = round(expense.reduce((sum, row) => sum + row.amount, 0), 3);
  return { from, to, income, expense, incomeTotal, expenseTotal, profit: round(incomeTotal - expenseTotal, 3) };
}

export async function reportAged(kind: "receivable" | "payable", asOf: string) {
  await boot();
  const moveType = kind === "receivable" ? "out_invoice" : "in_invoice";
  const refundType = kind === "receivable" ? "out_refund" : "in_refund";
  const rows = await Move.find({
    moveType: { $in: [moveType, refundType] },
    status: { $in: ["posted", "partial", "paid"] },
    residual: { $gt: 0 },
    accountingDate: { $lte: endOf(asOf) },
  })
    .populate("partnerId", "name")
    .lean();
  const asOfTime = new Date(`${asOf}T12:00:00.000Z`).getTime();
  type Bucket = { current: number; d30: number; d60: number; d90: number; d90p: number; total: number };
  const empty = (): Bucket => ({ current: 0, d30: 0, d60: 0, d90: 0, d90p: 0, total: 0 });
  const cards = await voucherCards();
  const partners = new Map<string, { name: string; bucket: Bucket }>();
  const documents: { id: string; number: string; partner: string; guest: string; detail: string; open: number }[] = [];
  for (const row of rows) {
    const sign = row.moveType === refundType ? -1 : 1;
    const amount = round(row.residualLc * sign, 3);
    const days = Math.floor((asOfTime - new Date(row.dueDate).getTime()) / 86400000);
    const key = sid(row.partnerId);
    const entry = partners.get(key) || { name: partnerName(row.partnerId), bucket: empty() };
    const slot = days <= 0 ? "current" : days <= 30 ? "d30" : days <= 60 ? "d60" : days <= 90 ? "d90" : "d90p";
    entry.bucket[slot] = round(entry.bucket[slot] + amount, 3);
    entry.bucket.total = round(entry.bucket.total + amount, 3);
    partners.set(key, entry);
    const primary = cardFor(cards, String(row._id), row.origin || "");
    documents.push({
      id: String(row._id),
      number: row.number,
      partner: entry.name,
      guest: primary.guest,
      detail: primary.detail,
      open: amount,
    });
  }
  documents.sort((a, b) => a.partner.localeCompare(b.partner) || a.number.localeCompare(b.number));
  const list = [...partners.values()].filter((row) => row.bucket.total !== 0).sort((a, b) => a.name.localeCompare(b.name));
  const totals = empty();
  for (const row of list) {
    totals.current = round(totals.current + row.bucket.current, 3);
    totals.d30 = round(totals.d30 + row.bucket.d30, 3);
    totals.d60 = round(totals.d60 + row.bucket.d60, 3);
    totals.d90 = round(totals.d90 + row.bucket.d90, 3);
    totals.d90p = round(totals.d90p + row.bucket.d90p, 3);
    totals.total = round(totals.total + row.bucket.total, 3);
  }
  return { kind, asOf, rows: list, totals, documents };
}

export async function reportCash(from: string, to: string) {
  await boot();
  const accounts = await Account.find({ subtype: { $in: ["bank", "cash"] } }).lean();
  const ids = accounts.map((account) => account._id);
  const entries = await JournalEntry.find({ date: { $gte: new Date(`${from}T00:00:00.000Z`), $lte: endOf(to) } })
    .sort({ date: 1 })
    .lean();
  const names = new Map(accounts.map((account) => [String(account._id), `${account.code} · ${account.name}`]));
  const lines: { date: string; ref: string; memo: string; account: string; in: number; out: number }[] = [];
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (!ids.some((id) => String(id) === String(line.accountId))) continue;
      if (line.debit <= 0 && line.credit <= 0) continue;
      lines.push({
        date: isoDate(entry.date),
        ref: entry.ref,
        memo: line.label || entry.memo || "",
        account: names.get(String(line.accountId)) || "Bank",
        in: line.debit,
        out: line.credit,
      });
    }
  }
  const inflow = round(lines.reduce((sum, line) => sum + line.in, 0), 3);
  const outflow = round(lines.reduce((sum, line) => sum + line.out, 0), 3);
  return { from, to, lines, inflow, outflow, net: round(inflow - outflow, 3) };
}

export async function reportLedger(accountId: string, asOf: string) {
  await boot();
  const account = mongoose.isValidObjectId(accountId) ? await Account.findById(accountId).lean() : null;
  if (!account) return null;
  const entries = await JournalEntry.find({ date: { $lte: endOf(asOf) } }).sort({ date: 1, createdAt: 1 }).lean();
  const partners = await Partner.find().lean();
  const names = new Map(partners.map((partner) => [String(partner._id), partner.name]));
  let balance = 0;
  const debitNormal = account.type === "asset" || account.type === "expense";
  const lines = [];
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (String(line.accountId) !== String(account._id)) continue;
      balance = round(balance + (debitNormal ? line.debit - line.credit : line.credit - line.debit), 3);
      lines.push({
        date: isoDate(entry.date),
        ref: entry.ref,
        partner: names.get(sid(line.partnerId)) || "",
        label: line.label || entry.memo || "",
        debit: line.debit,
        credit: line.credit,
        currency: line.currency,
        amountCurrency: line.amountCurrency,
        balance,
      });
    }
  }
  return { account: serializeAccount(account), asOf, lines, balance };
}

function isDocRef(value: string) {
  return /^[A-Z]{2,6}-\d{4}-\d+$/.test(value.trim());
}

function readableDetail(value: string, ref = "") {
  const text = value.trim();
  if (!text || text === ref.trim() || isDocRef(text)) return "";
  if (/^(Service fee|From voucher|Tax)\b/i.test(text)) return "";
  return text;
}

async function voucherCards() {
  const vouchers = await Voucher.find({ $or: [{ invoiceId: { $ne: null } }, { billId: { $ne: null } }] })
    .select("number paxName service checkIn checkOut details invoiceId billId")
    .lean();
  const byMove = new Map<string, { guest: string; detail: string }>();
  const byNumber = new Map<string, { guest: string; detail: string }>();
  for (const voucher of vouchers) {
    const card = { guest: String(voucher.paxName || "").trim(), detail: voucherServiceDetail(voucher) };
    byNumber.set(voucher.number, card);
    if (voucher.invoiceId) byMove.set(String(voucher.invoiceId), card);
    if (voucher.billId) byMove.set(String(voucher.billId), card);
  }
  return { byMove, byNumber };
}

function cardFor(cards: Awaited<ReturnType<typeof voucherCards>>, id: string, origin: string) {
  return cards.byMove.get(id) || cards.byNumber.get(origin) || { guest: "", detail: "" };
}

export async function reportPartner(partnerId: string, asOf: string) {
  await boot();
  const partner = mongoose.isValidObjectId(partnerId) ? await Partner.findById(partnerId).lean() : null;
  const partners = await Partner.find().sort({ name: 1 }).lean();
  if (!partner) {
    return { partner: null, partners: partners.map(serializePartner), asOf, sections: [] as never[] };
  }
  const [accounts, entries, vouchers, linkedMoves] = await Promise.all([
    Account.find().lean(),
    JournalEntry.find({ date: { $lte: endOf(asOf) } }).sort({ date: 1, createdAt: 1 }).lean(),
    Voucher.find({ $or: [{ invoiceId: { $ne: null } }, { billId: { $ne: null } }] })
      .select("number paxName service checkIn checkOut details invoiceId billId")
      .lean(),
    Move.find().select("number origin lines.label").lean(),
  ]);
  const voucherByNumber = new Map(vouchers.map((voucher) => [voucher.number, voucher]));
  const voucherByMoveId = new Map<string, (typeof vouchers)[number]>();
  for (const voucher of vouchers) {
    if (voucher.invoiceId) voucherByMoveId.set(String(voucher.invoiceId), voucher);
    if (voucher.billId) voucherByMoveId.set(String(voucher.billId), voucher);
  }
  const moveById = new Map(linkedMoves.map((move) => [String(move._id), move]));
  const moveByNumber = new Map(linkedMoves.map((move) => [move.number, move]));
  const accountOf = new Map(accounts.map((account) => [String(account._id), account]));
  const groups = new Map<string, { title: string; lines: { date: string; ref: string; href: string; guest: string; label: string; fcCode: string; fcAmount: number; debit: number; credit: number; balance: number }[] }>();
  const running = new Map<string, number>();
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (sid(line.partnerId) !== String(partner._id)) continue;
      const account = accountOf.get(sid(line.accountId));
      if (!account) continue;
      if (account.type === "income" || account.type === "expense" || account.type === "equity") continue;
      if (account.subtype === "bank" || account.subtype === "cash") continue;
      const title = account.subtype === "receivable" ? "Receivable" : account.subtype === "payable" ? "Payable" : account.name;
      const key = title;
      const prev = running.get(key) || 0;
      const next = round(prev + line.debit - line.credit, 3);
      running.set(key, next);
      const move = moveById.get(sid(entry.sourceId)) || moveByNumber.get(line.label || "") || moveByNumber.get(entry.ref);
      const voucher = (move && voucherByMoveId.get(String(move._id))) || (move?.origin ? voucherByNumber.get(move.origin) : undefined);
      const serviceDetail = voucher ? voucherServiceDetail(voucher) : "";
      const described = (move?.lines || []).map((row) => readableDetail(row.label || "", move?.number || "")).find(Boolean) || "";
      const sourceId = sid(entry.sourceId);
      const href =
        entry.source === "payment" && sourceId
          ? `/payments/${sourceId}`
          : entry.source === "receipt" && sourceId
            ? `/receipts/${sourceId}`
            : entry.source === "voucher" && sourceId
              ? `/vouchers/${sourceId}`
              : voucher
                ? `/vouchers/${String(voucher._id)}`
                : entry.source === "invoice" && sourceId
                  ? `/moves/${sourceId}`
                  : "";
      const group = groups.get(key) || { title, lines: [] };
      group.lines.push({
        date: isoDate(entry.date),
        ref: entry.ref,
        href,
        guest: voucher?.paxName || "",
        label: serviceDetail || described || readableDetail(line.label || entry.memo || "", entry.ref),
        fcCode: line.currency && line.currency !== "KWD" ? line.currency : "",
        fcAmount: line.currency && line.currency !== "KWD" ? line.amountCurrency || 0 : 0,
        debit: line.debit,
        credit: line.credit,
        balance: next,
      });
      groups.set(key, group);
    }
  }
  return {
    partner: serializePartner(partner),
    partners: partners.map(serializePartner),
    asOf,
    sections: [...groups.values()],
  };
}

export async function accountChoices() {
  const data = await masters();
  return data.accounts;
}

export { formatDate };
