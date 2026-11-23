import { MOVE_META } from "./company";
import { db } from "./db";
import { addDays, decimals, isoDate, num, parseDate, round, toBase, voucherFigures } from "./money";
import {
  Account,
  Currency,
  JournalEntry,
  Move,
  Partner,
  Payment,
  Receipt,
  Voucher,
  nextNumber,
} from "./models";
import { settle } from "./payment-math";
import { voucherFileLabel } from "./voucher-detail";
import type { JournalInput, MoveInput, MoveType, PaymentInput, ReceiptInput, VoucherInput } from "./types";

type JLine = {
  accountId: unknown;
  partnerId?: unknown;
  label: string;
  debit: number;
  credit: number;
  currency: string;
  amountCurrency: number;
  rate: number;
};

async function accountByCode(code: string) {
  const account = await Account.findOne({ code });
  if (!account) throw new Error(`Account ${code} is missing from the chart`);
  return account;
}

function plug(lines: JLine[]) {
  const debit = round(lines.reduce((sum, line) => sum + line.debit, 0), 3);
  const credit = round(lines.reduce((sum, line) => sum + line.credit, 0), 3);
  const diff = round(debit - credit, 3);
  if (Math.abs(diff) < 0.0005) return lines;
  if (Math.abs(diff) > 0.02) {
    throw new Error(`Entry does not balance (${debit.toFixed(3)} debit vs ${credit.toFixed(3)} credit)`);
  }
  const last = lines[lines.length - 1];
  if (diff > 0) last.debit = round(last.debit - diff, 3);
  else last.credit = round(last.credit + diff, 3);
  return lines;
}

function totalsOf(lines: { qty: number; price: number; taxRate: number }[], currency: string) {
  const dp = decimals(currency);
  let untaxed = 0;
  let tax = 0;
  const rows = lines.map((line) => {
    const base = round(line.qty * line.price, dp);
    const taxAmt = round(base * (line.taxRate || 0) / 100, dp);
    untaxed = round(untaxed + base, dp);
    tax = round(tax + taxAmt, dp);
    return { base, taxAmt };
  });
  return { rows, untaxed, tax, total: round(untaxed + tax, dp) };
}

function cleanMove(input: MoveInput) {
  if (!input.partnerId) throw new Error("Choose a partner");
  if (!(input.rate > 0)) throw new Error("Exchange rate must be greater than zero");
  const lines = (input.lines || [])
    .map((line) => ({
      label: String(line.label || "").trim(),
      accountId: String(line.accountId || ""),
      qty: num(line.qty, "Quantity"),
      price: num(line.price, "Price"),
      taxRate: num(line.taxRate ?? 0, "Tax"),
    }))
    .filter((line) => line.accountId && (line.qty !== 0 || line.price !== 0 || line.label));
  if (!lines.length) throw new Error("Add at least one line");
  for (const line of lines) {
    if (!(line.qty > 0)) throw new Error("Quantity must be greater than zero");
    if (line.price < 0) throw new Error("Price cannot be negative");
    if (line.taxRate < 0) throw new Error("Tax cannot be negative");
    if (!line.label) throw new Error("Each line needs a description");
  }
  return lines;
}

export async function saveMove(input: MoveInput) {
  await db();
  const lines = cleanMove(input);
  const fields = {
    moveType: input.moveType,
    partnerId: input.partnerId,
    currency: input.currency,
    rate: input.rate,
    invoiceDate: parseDate(input.invoiceDate),
    accountingDate: parseDate(input.accountingDate),
    dueDate: parseDate(input.dueDate),
    narration: String(input.narration || "").trim(),
    lines,
  };
  let id = input.id;
  let createdNow = false;
  if (id) {
    const move = await Move.findById(id);
    if (!move) throw new Error("Document not found");
    if (move.status !== "draft") throw new Error("Only a draft can be edited");
    Object.assign(move, fields);
    await move.save();
  } else {
    const created = await Move.create({
      ...fields,
      number: await nextNumber(MOVE_META[input.moveType].prefix),
      status: "draft",
    });
    id = String(created._id);
    createdNow = true;
  }
  if (input.post) {
    try {
      await postMove(id);
    } catch (error) {
      if (createdNow) await Move.deleteOne({ _id: id });
      throw error;
    }
  }
  return id;
}

export async function postMove(id: string) {
  await db();
  const move = await Move.findById(id);
  if (!move) throw new Error("Document not found");
  if (move.status !== "draft") throw new Error("Only a draft can be posted");
  const meta = MOVE_META[move.moveType as MoveType];
  const isSale = meta.income;
  const isRefund = move.moveType === "out_refund" || move.moveType === "in_refund";
  const control = await accountByCode(isSale ? "11000" : "20000");
  const taxAccount = await accountByCode("22000");
  const { rows, untaxed, tax, total } = totalsOf(move.lines, move.currency);
  if (!(total > 0)) throw new Error("Total must be greater than zero");

  const journalLines: JLine[] = [];
  move.lines.forEach((line, index) => {
    const lc = toBase(rows[index].base, move.rate);
    const creditIncome = isSale !== isRefund;
    journalLines.push({
      accountId: line.accountId,
      partnerId: move.partnerId,
      label: line.label,
      debit: creditIncome ? 0 : lc,
      credit: creditIncome ? lc : 0,
      currency: move.currency,
      amountCurrency: rows[index].base,
      rate: move.rate,
    });
    if (rows[index].taxAmt > 0) {
      const taxLc = toBase(rows[index].taxAmt, move.rate);
      journalLines.push({
        accountId: taxAccount._id,
        partnerId: move.partnerId,
        label: `Tax · ${line.label}`,
        debit: creditIncome ? 0 : taxLc,
        credit: creditIncome ? taxLc : 0,
        currency: move.currency,
        amountCurrency: rows[index].taxAmt,
        rate: move.rate,
      });
    }
  });

  const debit = round(journalLines.reduce((sum, line) => sum + line.debit, 0), 3);
  const credit = round(journalLines.reduce((sum, line) => sum + line.credit, 0), 3);
  const controlLc = round(Math.abs(credit - debit), 3);
  const controlIsDebit = isSale !== isRefund;
  journalLines.push({
    accountId: control._id,
    partnerId: move.partnerId,
    label: move.number,
    debit: controlIsDebit ? controlLc : 0,
    credit: controlIsDebit ? 0 : controlLc,
    currency: move.currency,
    amountCurrency: total,
    rate: move.rate,
  });

  const entry = await JournalEntry.create({
    date: move.accountingDate,
    ref: move.number,
    memo: move.narration || meta.singular,
    source: "invoice",
    sourceId: move._id,
    lines: plug(journalLines),
  });

  move.amountUntaxed = untaxed;
  move.amountTax = tax;
  move.amountTotal = total;
  move.amountTotalLc = controlLc;
  move.residual = total;
  move.residualLc = controlLc;
  move.status = "posted";
  move.journalEntryId = entry._id;
  await move.save();
  return move;
}

async function paymentsOn(moveId: unknown) {
  return Payment.countDocuments({ status: "posted", "allocations.moveId": moveId });
}

async function detachVoucher(moveId: unknown) {
  const voucher = await Voucher.findOne({ $or: [{ invoiceId: moveId }, { billId: moveId }] });
  if (!voucher) return;
  const unset: Record<string, 1> = {};
  if (String(voucher.invoiceId || "") === String(moveId)) unset.invoiceId = 1;
  if (String(voucher.billId || "") === String(moveId)) unset.billId = 1;
  const invoiceLeft = unset.invoiceId ? null : voucher.invoiceId;
  const billLeft = unset.billId ? null : voucher.billId;
  const set: Record<string, string> = {};
  if (!invoiceLeft && !billLeft) set.status = "draft";
  await Voucher.updateOne(
    { _id: voucher._id },
    { ...(Object.keys(set).length ? { $set: set } : {}), $unset: unset },
  );
}

export async function reopenMove(id: string) {
  await db();
  const move = await Move.findById(id);
  if (!move) throw new Error("Document not found");
  if (move.status === "draft") return;
  if (await paymentsOn(move._id)) throw new Error("Delete the receipt on this document before editing it");
  await JournalEntry.deleteMany({ source: "invoice", sourceId: move._id });
  await Move.updateOne(
    { _id: move._id },
    {
      $set: { status: "draft", residual: move.amountTotal, residualLc: move.amountTotalLc },
      $unset: { journalEntryId: 1 },
    },
  );
}

export async function deleteMove(id: string) {
  await db();
  const move = await Move.findById(id);
  if (!move) throw new Error("Document not found");
  if (move.status !== "draft") {
    if (await paymentsOn(move._id)) throw new Error("Delete the receipt on this document before deleting it");
    await JournalEntry.deleteMany({ source: "invoice", sourceId: move._id });
    await detachVoucher(move._id);
  }
  await move.deleteOne();
}

export async function setOpeningBalance(input: {
  partnerId: string;
  role: "customer" | "vendor" | "both";
  currency: string;
  amount: number;
  date: string;
}) {
  await db();
  const amount = round(input.amount, decimals(input.currency || "KWD"));
  const date = input.date;
  const rows = await Move.find({ partnerId: input.partnerId, narration: "Opening balance" });
  const signOf = (moveType: string) => (moveType === "out_refund" || moveType === "in_refund" ? -1 : 1);
  const current = round(rows.reduce((sum, move) => sum + signOf(move.moveType) * (move.amountTotal || 0), 0), decimals(input.currency || "KWD"));
  const same =
    (amount === 0 && rows.length === 0) ||
    (rows.length === 1 && current === amount && rows[0].currency === input.currency && isoDate(rows[0].accountingDate) === date);
  if (same) return;
  const ids = rows.map((row) => row._id);
  if (ids.length) {
    const [payments, receipts] = await Promise.all([
      Payment.countDocuments({ status: "posted", "allocations.moveId": { $in: ids } }),
      Receipt.countDocuments({ status: "posted", "allocations.moveId": { $in: ids } }),
    ]);
    if (payments || receipts) throw new Error("Clear the receipt on the opening balance before changing it");
  }
  for (const row of rows) await deleteMove(String(row._id));
  if (amount === 0) return;
  const currency = await Currency.findOne({ code: input.currency || "KWD" });
  const equity = await Account.findOne({ code: "30000" });
  if (!currency) throw new Error("Currency not found");
  if (!equity) throw new Error("Owner Capital account is missing");
  const vendor = input.role === "vendor";
  await saveMove({
    moveType: vendor ? (amount < 0 ? "in_refund" : "in_invoice") : amount < 0 ? "out_refund" : "out_invoice",
    partnerId: input.partnerId,
    currency: currency.code,
    rate: currency.rate,
    invoiceDate: date,
    accountingDate: date,
    dueDate: date,
    narration: "Opening balance",
    lines: [{ label: "Opening balance", accountId: String(equity._id), qty: 1, price: Math.abs(amount), taxRate: 0 }],
    post: true,
  });
}

export async function savePayment(input: PaymentInput) {
  await db();
  if (!input.partnerId) throw new Error("Choose a partner");
  if (!input.accountId) throw new Error("Choose a bank or cash account");
  const amount = num(input.amount, "Amount");
  const rate = num(input.rate, "Rate");
  const allocations = (input.allocations || [])
    .map((row) => ({ moveId: String(row.moveId), amount: num(row.amount, "Allocation") }))
    .filter((row) => row.amount > 0);
  const fields = {
    paymentType: input.paymentType,
    partnerId: input.partnerId,
    currency: input.currency,
    rate,
    amount,
    accountId: input.accountId,
    method: input.method || "Bank transfer",
    date: parseDate(input.date),
    memo: String(input.memo || "").trim(),
    allocations: allocations.map((row) => ({ ...row, amountLc: 0 })),
  };
  let id = input.id;
  let createdNow = false;
  if (id) {
    const payment = await Payment.findById(id);
    if (!payment) throw new Error("Payment not found");
    if (payment.status !== "draft") throw new Error("Only a draft can be edited");
    Object.assign(payment, fields);
    await payment.save();
  } else {
    const created = await Payment.create({
      ...fields,
      number: await nextNumber(input.paymentType === "receive" ? "RCPT" : "SPAY"),
      status: "draft",
    });
    id = String(created._id);
    createdNow = true;
  }
  if (input.post) {
    try {
      await postPayment(id);
    } catch (error) {
      if (createdNow) await Payment.deleteOne({ _id: id });
      throw error;
    }
  }
  return id;
}

export async function postPayment(id: string) {
  await db();
  const payment = await Payment.findById(id);
  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "draft") throw new Error("Only a draft can be posted");
  const wanted = payment.paymentType === "receive" ? "out_invoice" : "in_invoice";
  const moves = await Move.find({
    _id: { $in: payment.allocations.map((row) => row.moveId) },
  });
  if (moves.length !== payment.allocations.length) throw new Error("A selected document no longer exists");

  const allocInputs = payment.allocations.map((row) => {
    const move = moves.find((item) => String(item._id) === String(row.moveId));
    if (!move) throw new Error("A selected document no longer exists");
    if (String(move.partnerId) !== String(payment.partnerId)) {
      throw new Error("Every document must belong to the same partner");
    }
    if (move.moveType !== wanted) throw new Error("That document cannot be settled with this payment");
    if (move.status !== "posted" && move.status !== "partial") {
      throw new Error(`${move.number} is not open`);
    }
    return {
      move,
      currency: move.currency,
      residual: move.residual,
      residualLc: move.residualLc,
      amount: row.amount,
    };
  });

  const preview = settle({
    paymentType: payment.paymentType,
    currency: payment.currency,
    rate: payment.rate,
    amount: payment.amount,
    allocations: allocInputs,
  });
  if (!preview.ok) throw new Error(preview.error || "Payment does not settle");

  const bank = await Account.findById(payment.accountId);
  if (!bank || (bank.subtype !== "bank" && bank.subtype !== "cash")) {
    throw new Error("Choose a bank or cash account");
  }
  const ar = await accountByCode("11000");
  const ap = await accountByCode("20000");
  const advances = await accountByCode("21000");
  const prepay = await accountByCode("12000");
  const gain = await accountByCode("44000");
  const loss = await accountByCode("54000");

  const lines: JLine[] = [];
  const receive = payment.paymentType === "receive";
  allocInputs.forEach((alloc, index) => {
    const bookedLc = preview.rows[index].bookedLc;
    lines.push({
      accountId: receive ? ar._id : ap._id,
      partnerId: payment.partnerId,
      label: alloc.move.number,
      debit: receive ? 0 : bookedLc,
      credit: receive ? bookedLc : 0,
      currency: alloc.move.currency,
      amountCurrency: alloc.amount,
      rate: alloc.move.rate,
    });
  });

  if (preview.unappliedLc > 0) {
    lines.push({
      accountId: receive ? advances._id : prepay._id,
      partnerId: payment.partnerId,
      label: receive ? "Customer advance" : "Supplier prepayment",
      debit: receive ? 0 : preview.unappliedLc,
      credit: receive ? preview.unappliedLc : 0,
      currency: payment.currency,
      amountCurrency: preview.unappliedFc,
      rate: payment.rate,
    });
  }

  if (preview.fxGain > 0) {
    lines.push({
      accountId: gain._id,
      partnerId: payment.partnerId,
      label: "Exchange gain",
      debit: 0,
      credit: preview.fxGain,
      currency: "KWD",
      amountCurrency: preview.fxGain,
      rate: 1,
    });
  } else if (preview.fxGain < 0) {
    lines.push({
      accountId: loss._id,
      partnerId: payment.partnerId,
      label: "Exchange loss",
      debit: round(-preview.fxGain, 3),
      credit: 0,
      currency: "KWD",
      amountCurrency: round(-preview.fxGain, 3),
      rate: 1,
    });
  }

  lines.push({
    accountId: bank._id,
    partnerId: payment.partnerId,
    label: payment.memo || payment.number,
    debit: receive ? preview.bankLc : 0,
    credit: receive ? 0 : preview.bankLc,
    currency: payment.currency,
    amountCurrency: payment.amount,
    rate: payment.rate,
  });

  const entry = await JournalEntry.create({
    date: payment.date,
    ref: payment.number,
    memo: payment.memo || (receive ? "Customer receipt" : "Vendor payment"),
    source: "payment",
    sourceId: payment._id,
    lines: plug(lines),
  });

  try {
    for (let index = 0; index < allocInputs.length; index += 1) {
      const alloc = allocInputs[index];
      const bookedLc = preview.rows[index].bookedLc;
      const full = alloc.amount >= alloc.move.residual - 10 ** (-decimals(alloc.move.currency)) / 2;
      alloc.move.residual = full ? 0 : round(alloc.move.residual - alloc.amount, decimals(alloc.move.currency));
      alloc.move.residualLc = full ? 0 : round(alloc.move.residualLc - bookedLc, 3);
      alloc.move.status = alloc.move.residualLc <= 0.0005 ? "paid" : "partial";
      if (alloc.move.status === "paid") {
        alloc.move.residual = 0;
        alloc.move.residualLc = 0;
      }
      await alloc.move.save();
    }
    payment.allocations = allocInputs.map((alloc, index) => ({
      moveId: alloc.move._id,
      amount: alloc.amount,
      amountLc: preview.rows[index].bookedLc,
    }));
    payment.amountLc = preview.bankLc;
    payment.fxGain = preview.fxGain;
    payment.status = "posted";
    payment.journalEntryId = entry._id;
    await payment.save();
  } catch (error) {
    await JournalEntry.deleteOne({ _id: entry._id });
    throw error;
  }
}

async function releasePostedPayment(payment: {
  _id: unknown;
  status: string;
  allocations: { moveId: unknown; amount: number; amountLc: number }[];
}) {
  if (payment.status !== "posted") return;
  for (const alloc of payment.allocations) {
    const move = await Move.findById(alloc.moveId);
    if (!move || move.status === "draft") continue;
    const dp = decimals(move.currency);
    const dust = 10 ** -dp / 2;
    move.residual = round(Math.min(move.amountTotal, (move.residual || 0) + alloc.amount), dp);
    move.residualLc = round(Math.min(move.amountTotalLc, (move.residualLc || 0) + (alloc.amountLc || 0)), 3);
    if (move.residual <= dust) {
      move.residual = 0;
      move.residualLc = 0;
      move.status = "paid";
    } else if (move.amountTotal - move.residual <= dust) {
      move.status = "posted";
    } else {
      move.status = "partial";
    }
    await move.save();
  }
  await JournalEntry.deleteMany({ source: "payment", sourceId: payment._id });
}

export async function reopenPayment(id: string) {
  await db();
  const payment = await Payment.findById(id);
  if (!payment) throw new Error("Payment not found");
  if (payment.status === "draft") return;
  await releasePostedPayment(payment);
  await Payment.updateOne(
    { _id: payment._id },
    { $set: { status: "draft", amountLc: 0, fxGain: 0 }, $unset: { journalEntryId: 1 } },
  );
}

export async function deletePayment(id: string) {
  await db();
  const payment = await Payment.findById(id);
  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "draft") await releasePostedPayment(payment);
  await payment.deleteOne();
}

function cleanDetails(details: VoucherInput["details"]) {
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(details || {})) {
    const text = String(value ?? "").trim();
    if (text) cleaned[key] = text;
  }
  return cleaned;
}

export async function saveVoucher(input: VoucherInput) {
  await db();
  if (!input.customerId || !input.supplierId) throw new Error("Choose a customer and a supplier");
  if (input.customerId === input.supplierId) throw new Error("Customer and supplier must be different");
  const supplierFc = num(input.supplierFc, "Supplier amount");
  const customerFc = num(input.customerFc, "Customer amount");
  const supRoe = num(input.supRoe, "Supplier rate");
  const custRoe = num(input.custRoe, "Customer rate");
  const serviceFee = num(input.serviceFee || 0, "Service fee");
  const commPercent = num(input.commPercent || 0, "Commission");
  const nights = Math.max(1, Math.round(num(input.nights || 1, "Nights")));
  if (supplierFc < 0 || customerFc < 0 || serviceFee < 0) throw new Error("Amounts cannot be negative");
  if (!(supRoe > 0) || !(custRoe > 0)) throw new Error("Rates must be greater than zero");
  const figures = voucherFigures({ supplierFc, supRoe, customerFc, custRoe, serviceFee, commPercent, nights });
  const fields = {
    date: parseDate(input.date),
    paxName: String(input.paxName || "").trim(),
    supplierId: input.supplierId,
    customerId: input.customerId,
    service: input.service || "HOTEL",
    city: String(input.city || "").trim().toUpperCase(),
    consultant: String(input.consultant || "").trim(),
    payMode: input.payMode || "Credit",
    supplierRef: String(input.supplierRef || "").trim(),
    customerRef: String(input.customerRef || "").trim(),
    checkIn: input.checkIn ? parseDate(input.checkIn) : undefined,
    checkOut: input.checkOut ? parseDate(input.checkOut) : undefined,
    nights,
    adults: Math.max(0, Math.round(num(input.adults || 0, "Adults"))),
    children: Math.max(0, Math.round(num(input.children || 0, "Children"))),
    infants: Math.max(0, Math.round(num(input.infants || 0, "Infants"))),
    meal: input.meal || "",
    roomType: input.roomType || "",
    roomCategory: input.roomCategory || "",
    roomView: input.roomView || "",
    details: cleanDetails(input.details),
    supplierFc,
    supplierCurrency: input.supplierCurrency,
    supRoe,
    customerFc,
    customerCurrency: input.customerCurrency,
    custRoe,
    serviceFee,
    commPercent,
    isReceived: Boolean(input.isReceived),
    remarks: String(input.remarks || "").trim(),
    supplierLc: figures.supplierLc,
    sellValue: figures.sellValue,
    markup: figures.markup,
    commissionLc: figures.commissionLc,
  };
  let id = input.id;
  if (id) {
    const voucher = await Voucher.findById(id);
    if (!voucher) throw new Error("Voucher not found");
    if (voucher.status !== "draft") throw new Error("Confirmed vouchers stay as posted");
    Object.assign(voucher, fields);
    await voucher.save();
  } else {
    const created = await Voucher.create({
      ...fields,
      number: await nextNumber("HV"),
      status: "draft",
    });
    id = String(created._id);
  }
  if (input.post) await confirmVoucher(id!);
  return id!;
}

export async function confirmVoucher(id: string) {
  await db();
  const voucher = await Voucher.findById(id);
  if (!voucher) throw new Error("Voucher not found");
  if (voucher.status !== "draft") throw new Error("Voucher is already confirmed");
  if (!(voucher.customerFc > 0) && !(voucher.serviceFee > 0)) {
    throw new Error("Enter what the customer pays");
  }
  if (!(voucher.supplierFc > 0)) throw new Error("Enter the supplier cost");

  const hotelIncome = await accountByCode(voucher.service === "FLIGHT" ? "41000" : "40000");
  const feeIncome = await accountByCode("42000");
  const cost = await accountByCode(voucher.service === "FLIGHT" ? "51000" : "50000");
  const date = voucher.date.toISOString().slice(0, 10);
  const due = addDays(date, 7);
  const label = voucherFileLabel(voucher);

  const invoiceLines: { label: string; accountId: string; qty: number; price: number; taxRate: number }[] = [];
  if (voucher.customerFc > 0) {
    invoiceLines.push({
      label,
      accountId: String(hotelIncome._id),
      qty: 1,
      price: voucher.customerFc,
      taxRate: 0,
    });
  }
  if (voucher.serviceFee > 0) {
    invoiceLines.push({
      label: `Service fee · ${voucher.number}`,
      accountId: String(feeIncome._id),
      qty: 1,
      price: voucher.serviceFee,
      taxRate: 0,
    });
  }

  const invoiceId = await saveMove({
    moveType: "out_invoice",
    partnerId: String(voucher.customerId),
    currency: voucher.customerCurrency,
    rate: voucher.custRoe,
    invoiceDate: date,
    accountingDate: date,
    dueDate: due,
    narration: `From voucher ${voucher.number}`,
    lines: invoiceLines,
    post: true,
  });
  const billId = await saveMove({
    moveType: "in_invoice",
    partnerId: String(voucher.supplierId),
    currency: voucher.supplierCurrency,
    rate: voucher.supRoe,
    invoiceDate: date,
    accountingDate: date,
    dueDate: due,
    narration: `From voucher ${voucher.number}`,
    lines: [
      {
        label,
        accountId: String(cost._id),
        qty: 1,
        price: voucher.supplierFc,
        taxRate: 0,
      },
    ],
    post: true,
  });

  const invoice = await Move.findById(invoiceId);
  const bill = await Move.findById(billId);
  if (invoice) {
    invoice.origin = voucher.number;
    await invoice.save();
  }
  if (bill) {
    bill.origin = voucher.number;
    await bill.save();
  }
  voucher.invoiceId = invoice?._id;
  voucher.billId = bill?._id;
  voucher.status = "confirmed";
  await voucher.save();
}

export async function deleteVoucher(id: string) {
  await db();
  const voucher = await Voucher.findById(id);
  if (!voucher) throw new Error("Voucher not found");
  if (voucher.status !== "draft") throw new Error("Confirmed vouchers stay in the books");
  await voucher.deleteOne();
}

export async function saveReceipt(input: ReceiptInput) {
  await db();
  const lines = (input.lines || [])
    .map((line) => {
      const fcAmount = num(line.fcAmount || 0, "FC amount");
      const rate = num(line.rate || 0, "Rate");
      const base = rate > 0 ? toBase(fcAmount, rate) : 0;
      return {
        accountId: String(line.accountId || ""),
        partnerId: line.partnerId || undefined,
        remarks: String(line.remarks || "").trim(),
        currency: line.currency || "KWD",
        rate,
        fcAmount,
        debit: line.side === "debit" ? base : 0,
        credit: line.side === "credit" ? base : 0,
        chequeNo: String(line.chequeNo || "").trim(),
        chequeDate: line.chequeDate ? parseDate(line.chequeDate) : undefined,
        bankName: String(line.bankName || "").trim(),
        side: line.side,
      };
    })
    .filter((line) => line.accountId && line.fcAmount > 0);

  if (!lines.length) throw new Error("Add at least one line");
  for (const line of lines) {
    if (!(line.rate > 0)) throw new Error("Each line needs an exchange rate");
    if (line.side !== "debit" && line.side !== "credit") throw new Error("Each line is debit or credit");
  }
  const totalDebit = round(lines.reduce((sum, line) => sum + line.debit, 0), 3);
  const totalCredit = round(lines.reduce((sum, line) => sum + line.credit, 0), 3);
  const stored = lines.map(({ side: _side, ...line }) => line);
  const fields = {
    kind: input.kind,
    date: parseDate(input.date),
    branch: String(input.branch || "AlOmma").trim(),
    party: String(input.party || "").trim(),
    reference: String(input.reference || "").trim(),
    remarks: String(input.remarks || "").trim(),
    lines: stored,
    totalDebit,
    totalCredit,
  };
  let id = input.id;
  if (id) {
    const receipt = await Receipt.findById(id);
    if (!receipt) throw new Error("Voucher not found");
    if (receipt.status !== "draft") throw new Error("Posted vouchers stay in the books");
    Object.assign(receipt, fields);
    await receipt.save();
  } else {
    const created = await Receipt.create({
      ...fields,
      number: await nextNumber(input.kind === "receipt" ? "BR" : "PV"),
      status: "draft",
    });
    id = String(created._id);
  }
  if (input.post) await postReceipt(id!);
  return id!;
}

export async function postReceipt(id: string) {
  await db();
  const receipt = await Receipt.findById(id);
  if (!receipt) throw new Error("Voucher not found");
  if (receipt.status !== "draft") throw new Error("Only a draft can be posted");
  const diff = round(receipt.totalDebit - receipt.totalCredit, 3);
  if (Math.abs(diff) > 0.001) {
    throw new Error(`Debit ${receipt.totalDebit.toFixed(3)} and credit ${receipt.totalCredit.toFixed(3)} must match`);
  }
  if (!(receipt.totalDebit > 0)) throw new Error("Enter an amount");
  const entry = await JournalEntry.create({
    date: receipt.date,
    ref: receipt.number,
    memo: receipt.remarks || receipt.party || (receipt.kind === "receipt" ? "Bank receipt" : "Payment voucher"),
    source: "receipt",
    sourceId: receipt._id,
    lines: receipt.lines.map((line) => ({
      accountId: line.accountId,
      partnerId: line.partnerId,
      label: line.remarks || receipt.party || receipt.number,
      debit: line.debit,
      credit: line.credit,
      currency: line.currency,
      amountCurrency: line.fcAmount,
      rate: line.rate,
    })),
  });
  receipt.status = "posted";
  receipt.journalEntryId = entry._id;
  await receipt.save();
}

async function releaseReceiptAllocations(receipt: {
  allocations?: { moveId: unknown; amount: number; amountLc: number }[];
}) {
  for (const alloc of receipt.allocations || []) {
    const move = await Move.findById(alloc.moveId);
    if (!move || move.status === "draft") continue;
    const dp = decimals(move.currency);
    const dust = 10 ** -dp / 2;
    move.residual = round(Math.min(move.amountTotal, (move.residual || 0) + alloc.amount), dp);
    move.residualLc = round(Math.min(move.amountTotalLc, (move.residualLc || 0) + (alloc.amountLc || 0)), 3);
    if (move.residual <= dust) {
      move.residual = 0;
      move.residualLc = 0;
      move.status = "paid";
    } else if (move.amountTotal - move.residual <= dust) {
      move.status = "posted";
    } else {
      move.status = "partial";
    }
    await move.save();
  }
}

export async function allocateReceipt(id: string, rows: { moveId: string; amount: number }[]) {
  await db();
  const receipt = await Receipt.findById(id);
  if (!receipt) throw new Error("Voucher not found");
  if (receipt.status !== "posted") throw new Error("Post the voucher before allocating it");
  const accounts = await Account.find().lean();
  const accountOf = new Map(accounts.map((account) => [String(account._id), account]));
  let advanceLc = 0;
  let partnerId = "";
  let wanted: "in_invoice" | "out_invoice" | "" = "";
  for (const line of receipt.lines) {
    const account = accountOf.get(String(line.accountId));
    if (!account || !line.partnerId) continue;
    if ((account.subtype === "payable" || account.subtype === "prepayment") && line.debit > 0) {
      advanceLc = round(advanceLc + line.debit, 3);
      partnerId = String(line.partnerId);
      wanted = "in_invoice";
    }
    if ((account.subtype === "receivable" || account.code === "21000") && line.credit > 0) {
      advanceLc = round(advanceLc + line.credit, 3);
      partnerId = String(line.partnerId);
      wanted = "out_invoice";
    }
  }
  if (!wanted || !(advanceLc > 0)) throw new Error("This voucher has no advance to allocate");
  const used = round((receipt.allocations || []).reduce((sum, row) => sum + (row.amountLc || 0), 0), 3);
  const room = round(advanceLc - used, 3);
  const fresh = rows
    .map((row) => ({ moveId: String(row.moveId), amount: num(row.amount, "Amount") }))
    .filter((row) => row.amount > 0);
  if (!fresh.length) throw new Error("Enter an amount to allocate");
  const moves = await Move.find({ _id: { $in: fresh.map((row) => row.moveId) } });
  let addLc = 0;
  const stored: { move: (typeof moves)[number]; amount: number; amountLc: number }[] = [];
  for (const row of fresh) {
    const move = moves.find((item) => String(item._id) === row.moveId);
    if (!move) throw new Error("A selected document no longer exists");
    if (String(move.partnerId) !== partnerId) throw new Error("Every document must belong to the same partner");
    if (move.moveType !== wanted) throw new Error(`${move.number} cannot take this advance`);
    if (move.status !== "posted" && move.status !== "partial") throw new Error(`${move.number} is not open`);
    const dust = 10 ** -decimals(move.currency) / 2;
    if (row.amount > move.residual + dust) throw new Error(`${move.number} only has ${move.residual} open`);
    const amountLc = toBase(row.amount, move.rate);
    addLc = round(addLc + amountLc, 3);
    stored.push({ move, amount: row.amount, amountLc });
  }
  if (addLc > room + 0.0005) throw new Error("That is more than the advance still open");
  for (const row of stored) {
    const dp = decimals(row.move.currency);
    const full = row.amount >= row.move.residual - 10 ** -dp / 2;
    row.move.residual = full ? 0 : round(row.move.residual - row.amount, dp);
    row.move.residualLc = full ? 0 : round(row.move.residualLc - row.amountLc, 3);
    row.move.status = row.move.residualLc <= 0.0005 ? "paid" : "partial";
    if (row.move.status === "paid") {
      row.move.residual = 0;
      row.move.residualLc = 0;
    }
    await row.move.save();
  }
  receipt.allocations = [
    ...(receipt.allocations || []),
    ...stored.map((row) => ({ moveId: row.move._id, amount: row.amount, amountLc: row.amountLc })),
  ];
  await receipt.save();
}

export async function reopenReceipt(id: string) {
  await db();
  const receipt = await Receipt.findById(id);
  if (!receipt) throw new Error("Voucher not found");
  if (receipt.status === "draft") return;
  await releaseReceiptAllocations(receipt);
  await JournalEntry.deleteMany({ source: "receipt", sourceId: receipt._id });
  await Receipt.updateOne(
    { _id: receipt._id },
    { $set: { status: "draft", allocations: [] }, $unset: { journalEntryId: 1 } },
  );
}

export async function deleteReceipt(id: string) {
  await db();
  const receipt = await Receipt.findById(id);
  if (!receipt) throw new Error("Voucher not found");
  if (receipt.status !== "draft") {
    await releaseReceiptAllocations(receipt);
    await JournalEntry.deleteMany({ source: "receipt", sourceId: receipt._id });
  }
  await receipt.deleteOne();
}

export async function postManualJournal(input: JournalInput) {
  await db();
  const date = parseDate(input.date);
  const memo = String(input.memo || "").trim();
  const raw = (input.lines || []).filter((line) => line.accountId && ((Number(line.debit) || 0) !== 0 || (Number(line.credit) || 0) !== 0));
  if (raw.length < 2) throw new Error("Add at least two lines");
  const lines: JLine[] = [];
  for (const line of raw) {
    const debitFc = num(line.debit || 0, "Debit");
    const creditFc = num(line.credit || 0, "Credit");
    if (debitFc < 0 || creditFc < 0) throw new Error("Amounts cannot be negative");
    if (debitFc > 0 && creditFc > 0) throw new Error("A line is either a debit or a credit");
    const rate = num(line.rate, "Rate");
    if (!(rate > 0)) throw new Error("Exchange rate must be greater than zero");
    const amount = debitFc || creditFc;
    if (!(amount > 0)) throw new Error("Each line needs an amount");
    lines.push({
      accountId: line.accountId,
      ...(line.partnerId ? { partnerId: line.partnerId } : {}),
      label: String(line.label || "").trim() || memo || "Journal",
      debit: debitFc ? toBase(debitFc, rate) : 0,
      credit: creditFc ? toBase(creditFc, rate) : 0,
      currency: line.currency || "KWD",
      amountCurrency: amount,
      rate,
    });
  }
  const debit = round(lines.reduce((sum, line) => sum + line.debit, 0), 3);
  const credit = round(lines.reduce((sum, line) => sum + line.credit, 0), 3);
  if (Math.abs(round(debit - credit, 3)) > 0.0005) {
    throw new Error(`Entry does not balance (${debit.toFixed(3)} debit vs ${credit.toFixed(3)} credit)`);
  }
  const entry = await JournalEntry.create({
    date,
    ref: await nextNumber("JV"),
    memo: memo || "Journal",
    source: "manual",
    lines: plug(lines),
  });
  return entry;
}

export async function booksBalance() {
  await db();
  const rows = await JournalEntry.aggregate([
    { $unwind: "$lines" },
    {
      $group: {
        _id: null,
        debit: { $sum: "$lines.debit" },
        credit: { $sum: "$lines.credit" },
      },
    },
  ]);
  const debit = round(rows[0]?.debit || 0, 3);
  const credit = round(rows[0]?.credit || 0, 3);
  return { debit, credit, diff: round(debit - credit, 3) };
}

export async function assertPartnerRole(id: string, role: "customer" | "vendor") {
  const partner = await Partner.findById(id);
  if (!partner) throw new Error("Partner not found");
  if (partner.role !== role && partner.role !== "both") {
    throw new Error(role === "customer" ? "Choose a customer" : "Choose a vendor");
  }
  return partner;
}
