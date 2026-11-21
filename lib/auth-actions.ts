"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authConfigured, createSession, credentialsMatch, safeNext, sessionCookie } from "./session";

export async function login(input: { username: string; password: string; next?: string }) {
  if (!authConfigured()) {
    return { error: "Login is not configured yet. Add AUTH_USERNAME, AUTH_PASSWORD, and AUTH_SECRET." };
  }
  if (!credentialsMatch(input.username.trim(), input.password)) {
    return { error: "That username or password is wrong." };
  }
  const token = await createSession(input.username.trim());
  const jar = await cookies();
  jar.set(sessionCookie.name, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionCookie.maxAge,
  });
  redirect(safeNext(input.next));
}

export async function logout() {
  const jar = await cookies();
  jar.delete(sessionCookie.name);
  redirect("/login");
}
