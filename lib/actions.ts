"use server";

import { revalidatePath } from "next/cache";
import { auditChange } from "./audit";
import { MOVE_META } from "./company";
import { assertPartnerRole, allocateReceipt, deleteMove, deletePayment, deleteReceipt, deleteVoucher, postMove, postPayment, postReceipt, reopenMove, reopenPayment, reopenReceipt, saveMove, savePayment, saveReceipt, saveVoucher } from "./accounting";
import { db } from "./db";
import { num } from "./money";
import { Account, Currency, Move, Partner, Payment, Receipt, Voucher } from "./models";
import { ensureSeed } from "./seed";
import type { MoveInput, PartnerInput, PaymentInput, ReceiptInput, VoucherInput } from "./types";

function fail(error: unknown) {
  return { ok: false as const, error: error instanceof Error ? error.message : "Something went wrong" };
}

function refresh() {
  revalidatePath("/", "layout");
}

async function numberOf(model: typeof Move | typeof Payment | typeof Voucher | typeof Receipt, id: string) {
  const row = await model.findById(id).select("number").lean();
  return row?.number || id;
}

export async function actionSaveMove(input: MoveInput) {
  try {
    await ensureSeed();
    await assertPartnerRole(input.partnerId, MOVE_META[input.moveType].partyRole);
    const id = await saveMove(input);
    const number = await numberOf(Move, id);
    const label = MOVE_META[input.moveType].singular;
    await auditChange(input.post ? `Posted ${label} ${number}` : `${input.id ? "Updated" : "Saved"} draft ${label} ${number}`, id);
    refresh();
    return { ok: true as const, id };
  } catch (error) {
    return fail(error);
  }
}

export async function actionPostMove(id: string) {
  try {
    const number = await numberOf(Move, id);
    const move = await Move.findById(id).select("moveType").lean();
    await postMove(id);
    const label = move ? MOVE_META[move.moveType].singular : "document";
    await auditChange(`Posted ${label} ${number}`, id);
    refresh();
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function actionReopenMove(id: string) {
  try {
    const number = await numberOf(Move, id);
    await reopenMove(id);
    await auditChange(`Reopened ${number} for editing`, id);
    refresh();
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function actionDeleteMove(id: string) {
  try {
    const number = await numberOf(Move, id);
    await deleteMove(id);
    await auditChange(`Deleted ${number}`, id);
    refresh();
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function actionSavePayment(input: PaymentInput) {
  try {
    await ensureSeed();
    const id = await savePayment(input);
    const number = await numberOf(Payment, id);
    const label = input.paymentType === "receive" ? "customer receipt" : "vendor payment";
    await auditChange(input.post ? `Posted ${label} ${number}` : `${input.id ? "Updated" : "Saved"} draft ${label} ${number}`, id);
    refresh();
    return { ok: true as const, id };
  } catch (error) {
    return fail(error);
  }
}

export async function actionPostPayment(id: string) {
  try {
    const number = await numberOf(Payment, id);
    const payment = await Payment.findById(id).select("paymentType").lean();
    await postPayment(id);
    const label = payment?.paymentType === "send" ? "vendor payment" : "customer receipt";
    await auditChange(`Posted ${label} ${number}`, id);
    refresh();
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function actionReopenPayment(id: string) {
  try {
    const number = await numberOf(Payment, id);
    await reopenPayment(id);
    await auditChange(`Reopened ${number} for editing`, id);
    refresh();
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function actionDeletePayment(id: string) {
  try {
    const number = await numberOf(Payment, id);
    await deletePayment(id);
    await auditChange(`Deleted ${number}`, id);
    refresh();
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function actionSaveVoucher(input: VoucherInput) {
  try {
    await ensureSeed();
    await assertPartnerRole(input.customerId, "customer");
    await assertPartnerRole(input.supplierId, "vendor");
    const id = await saveVoucher(input);
    const number = await numberOf(Voucher, id);
    await auditChange(input.post ? `Confirmed voucher ${number}` : `${input.id ? "Updated" : "Saved"} draft voucher ${number} (${input.service || "HOTEL"})`, id);
    refresh();
    return { ok: true as const, id };
  } catch (error) {
    return fail(error);
  }
}

export async function actionDeleteVoucher(id: string) {
  try {
    const number = await numberOf(Voucher, id);
    await deleteVoucher(id);
    await auditChange(`Deleted draft voucher ${number}`, id);
    refresh();
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function actionSaveReceipt(input: ReceiptInput) {
  try {
    await ensureSeed();
    const id = await saveReceipt(input);
    const number = await numberOf(Receipt, id);
    const label = input.kind === "receipt" ? "bank receipt" : "payment voucher";
    await auditChange(input.post ? `Posted ${label} ${number}` : `${input.id ? "Updated" : "Saved"} draft ${label} ${number}`, id);
    refresh();
    return { ok: true as const, id };
  } catch (error) {
    return fail(error);
  }
}

export async function actionPostReceipt(id: string) {
  try {
    const number = await numberOf(Receipt, id);
    const receipt = await Receipt.findById(id).select("kind").lean();
    await postReceipt(id);
    await auditChange(`Posted ${receipt?.kind === "payment" ? "payment voucher" : "bank receipt"} ${number}`, id);
    refresh();
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function actionAllocateReceipt(id: string, rows: { moveId: string; amount: number }[]) {
  try {
    const number = await numberOf(Receipt, id);
    await allocateReceipt(id, rows);
    const applied = rows.filter((row) => row.amount > 0).map((row) => row.amount).join(", ");
    await auditChange(`Allocated advance on ${number} (${applied})`, id);
    refresh();
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function actionReopenReceipt(id: string) {
  try {
    const number = await numberOf(Receipt, id);
    await reopenReceipt(id);
    await auditChange(`Reopened ${number} for editing`, id);
    refresh();
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function actionDeleteReceipt(id: string) {
  try {
    const number = await numberOf(Receipt, id);
    await deleteReceipt(id);
    await auditChange(`Deleted ${number}`, id);
    refresh();
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function actionSavePartner(input: PartnerInput) {
  try {
    await ensureSeed();
    const name = input.name.trim();
    if (!name) return { ok: false as const, error: "Name is required" };
    const created = await Partner.create({
      name,
      role: input.role,
      email: input.email.trim(),
      phone: input.phone.trim(),
      city: input.city.trim(),
      country: input.country.trim() || "Kuwait",
      currency: input.currency || "KWD",
      taxId: input.taxId.trim(),
    });
    await auditChange(`Added ${input.role} ${name}`, String(created._id));
    refresh();
    return { ok: true as const, id: String(created._id) };
  } catch (error) {
    return fail(error);
  }
}

export async function actionUpdateRate(code: string, rate: number) {
  try {
    await db();
    const next = num(rate, "Rate");
    if (!(next > 0)) return { ok: false as const, error: "Rate must be greater than zero" };
    if (code === "KWD" && next !== 1) return { ok: false as const, error: "Kuwaiti Dinar stays at 1" };
    const updated = await Currency.updateOne({ code }, { rate: next });
    if (!updated.matchedCount) return { ok: false as const, error: "Currency not found" };
    await auditChange(`Changed ${code} rate to ${next}`);
    refresh();
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function actionSaveAccount(input: { code: string; name: string; type: string; subtype: string }) {
  try {
    await ensureSeed();
    const code = input.code.trim();
    const name = input.name.trim();
    if (!code || !name) return { ok: false as const, error: "Code and name are required" };
    await Account.create({ code, name, type: input.type, subtype: input.subtype });
    await auditChange(`Added account ${code} ${name}`);
    refresh();
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}
