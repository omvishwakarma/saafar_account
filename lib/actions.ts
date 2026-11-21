"use server";

import { revalidatePath } from "next/cache";
import { MOVE_META } from "./company";
import { assertPartnerRole, deleteMove, deletePayment, deleteReceipt, deleteVoucher, postMove, postPayment, postReceipt, saveMove, savePayment, saveReceipt, saveVoucher } from "./accounting";
import { db } from "./db";
import { num } from "./money";
import { Account, Currency, Partner } from "./models";
import { ensureSeed } from "./seed";
import type { MoveInput, PartnerInput, PaymentInput, ReceiptInput, VoucherInput } from "./types";

function fail(error: unknown) {
  return { ok: false as const, error: error instanceof Error ? error.message : "Something went wrong" };
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function actionSaveMove(input: MoveInput) {
  try {
    await ensureSeed();
    await assertPartnerRole(input.partnerId, MOVE_META[input.moveType].partyRole);
    const id = await saveMove(input);
    refresh();
    return { ok: true as const, id };
  } catch (error) {
    return fail(error);
  }
}

export async function actionPostMove(id: string) {
  try {
    await postMove(id);
    refresh();
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function actionDeleteMove(id: string) {
  try {
    await deleteMove(id);
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
    refresh();
    return { ok: true as const, id };
  } catch (error) {
    return fail(error);
  }
}

export async function actionPostPayment(id: string) {
  try {
    await postPayment(id);
    refresh();
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function actionDeletePayment(id: string) {
  try {
    await deletePayment(id);
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
    refresh();
    return { ok: true as const, id };
  } catch (error) {
    return fail(error);
  }
}

export async function actionDeleteVoucher(id: string) {
  try {
    await deleteVoucher(id);
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
    refresh();
    return { ok: true as const, id };
  } catch (error) {
    return fail(error);
  }
}

export async function actionPostReceipt(id: string) {
  try {
    await postReceipt(id);
    refresh();
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function actionDeleteReceipt(id: string) {
  try {
    await deleteReceipt(id);
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
    refresh();
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}
