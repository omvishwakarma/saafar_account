"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { recordAudit } from "./audit";
import { authConfigured, createSession, inspectSession, safeNext, sessionCookie, sessionCookieOptions, touchSession } from "./session";
import { authenticate } from "./users";

export async function login(input: { username: string; password: string; next?: string }) {
  if (!authConfigured()) {
    return { error: "Login is not configured yet. Add AUTH_USERNAME, AUTH_PASSWORD, and AUTH_SECRET." };
  }
  const user = await authenticate(input.username, input.password);
  if (!user) return { error: "That username or password is wrong." };
  const token = await createSession({
    username: user.username,
    id: String(user._id),
    role: user.role,
    name: user.name,
  });
  const jar = await cookies();
  jar.set(sessionCookie.name, token, sessionCookieOptions());
  await recordAudit({ username: user.username, name: user.name, summary: "Signed in" });
  redirect(safeNext(input.next));
}

export async function logout() {
  const jar = await cookies();
  jar.delete(sessionCookie.name);
  redirect("/login");
}

export async function touchActivity() {
  const jar = await cookies();
  const token = jar.get(sessionCookie.name)?.value;
  const next = await touchSession(token);
  if (!next) {
    jar.delete(sessionCookie.name);
    redirect("/login?reason=idle");
  }
  jar.set(sessionCookie.name, next, sessionCookieOptions());
}

export async function logoutIdle() {
  const jar = await cookies();
  const token = jar.get(sessionCookie.name)?.value;
  const { user } = await inspectSession(token);
  if (user) {
    await recordAudit({
      username: user.username,
      name: user.name,
      summary: "Signed out after 10 minutes with no activity",
    });
  }
  jar.delete(sessionCookie.name);
  redirect("/login?reason=idle");
}
