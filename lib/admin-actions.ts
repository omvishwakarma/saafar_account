"use server";

import { revalidatePath } from "next/cache";
import { auditChange } from "./audit";
import { currentUser } from "./current-user";
import { createUser, setUserActive, setUserPassword } from "./users";

async function admin() {
  const user = await currentUser();
  if (!user || user.role !== "admin") throw new Error("Only an admin can manage logins");
  return user;
}

function fail(error: unknown) {
  return { ok: false as const, error: error instanceof Error ? error.message : "Something went wrong" };
}

export async function actionCreateUser(input: { name: string; username: string; password: string; role: "admin" | "consultant" }) {
  try {
    await admin();
    const created = await createUser(input);
    await auditChange(`Created ${created.role} login ${created.username} for ${created.name}`, String(created._id));
    revalidatePath("/admin");
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function actionResetPassword(id: string, password: string) {
  try {
    await admin();
    const user = await setUserPassword(id, password);
    await auditChange(`Reset password for ${user.username}`, String(user._id));
    revalidatePath("/admin");
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function actionSetUserActive(id: string, active: boolean) {
  try {
    const actor = await admin();
    const user = await setUserActive(id, active, actor.id);
    await auditChange(`${active ? "Enabled" : "Disabled"} login ${user.username}`, String(user._id));
    revalidatePath("/admin");
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}
