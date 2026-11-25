import { IDLE_MS } from "./idle";

const COOKIE = "safar_session";
const MAX_AGE = 60 * 60 * 24 * 14;

export const sessionCookie = {
  name: COOKIE,
  maxAge: MAX_AGE,
};

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  };
}

function authSecret() {
  return process.env.AUTH_SECRET || "";
}

export function authConfigured() {
  return Boolean(process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD && authSecret());
}

function bytesToBase64Url(bytes: Uint8Array) {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function hmac(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

function sameText(left: string, right: string) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let index = 0; index < length; index += 1) diff |= (a[index] || 0) ^ (b[index] || 0);
  return diff === 0;
}

export type SessionUser = {
  username: string;
  id: string;
  role: "admin" | "consultant";
  name: string;
};

export function isEnvOwner(username: string, password: string) {
  if (!authConfigured()) return false;
  const owner = (process.env.AUTH_USERNAME || "").trim().toLowerCase();
  if (username.trim().toLowerCase() !== owner) return false;
  return sameText(password, process.env.AUTH_PASSWORD || "");
}

type RawSession = {
  u: string;
  id: string;
  role: "admin" | "consultant";
  name: string;
  exp: number;
  seen: number;
};

function toUser(data: RawSession): SessionUser {
  return { username: data.u, id: data.id, role: data.role, name: data.name };
}

async function sign(data: RawSession) {
  const payload = bytesToBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        u: data.u,
        id: data.id,
        role: data.role,
        name: data.name,
        exp: data.exp,
        seen: data.seen,
      }),
    ),
  );
  return `${payload}.${await hmac(payload)}`;
}

async function readPayload(token: string | undefined): Promise<RawSession | null> {
  if (!token || !authSecret()) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || token.split(".").length !== 2) return null;
  const expected = await hmac(payload);
  if (!sameText(expected, signature)) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as {
      u?: string;
      id?: string;
      role?: string;
      name?: string;
      exp?: number;
      seen?: number;
    };
    if (!data.u || !data.exp || data.exp < Date.now()) return null;
    let role: RawSession["role"] | null = null;
    if (data.role === "admin" || data.role === "consultant") role = data.role;
    else if (data.u === process.env.AUTH_USERNAME) role = "admin";
    if (!role) return null;
    return {
      u: data.u,
      id: data.id || "",
      role,
      name: data.name || data.u,
      exp: data.exp,
      seen: typeof data.seen === "number" ? data.seen : 0,
    };
  } catch {
    return null;
  }
}

export async function createSession(user: SessionUser, seen = Date.now()) {
  const now = Date.now();
  return sign({
    u: user.username,
    id: user.id,
    role: user.role,
    name: user.name,
    exp: now + MAX_AGE * 1000,
    seen,
  });
}

export type SessionStatus = "ok" | "idle" | "anonymous";

export async function inspectSession(token: string | undefined): Promise<{ status: SessionStatus; user: SessionUser | null }> {
  const data = await readPayload(token);
  if (!data) return { status: "anonymous", user: null };
  if (Date.now() - data.seen > IDLE_MS) return { status: "idle", user: toUser(data) };
  return { status: "ok", user: toUser(data) };
}

export async function verifySession(token: string | undefined): Promise<SessionUser | null> {
  const { status, user } = await inspectSession(token);
  return status === "ok" ? user : null;
}

export async function touchSession(token: string | undefined): Promise<string | null> {
  const data = await readPayload(token);
  if (!data || Date.now() - data.seen > IDLE_MS) return null;
  return sign({ ...data, seen: Date.now() });
}

export function safeNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) return "/";
  return value;
}
