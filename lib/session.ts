const COOKIE = "safar_session";
const MAX_AGE = 60 * 60 * 24 * 14;

export const sessionCookie = {
  name: COOKIE,
  maxAge: MAX_AGE,
};

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

export function credentialsMatch(username: string, password: string) {
  if (!authConfigured()) return false;
  return sameText(username, process.env.AUTH_USERNAME || "") && sameText(password, process.env.AUTH_PASSWORD || "");
}

export async function createSession(username: string) {
  const payload = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify({ u: username, exp: Date.now() + MAX_AGE * 1000 })),
  );
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySession(token: string | undefined) {
  if (!token || !authSecret()) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || token.split(".").length !== 2) return false;
  const expected = await hmac(payload);
  if (!sameText(expected, signature)) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as { u?: string; exp?: number };
    if (!data.exp || data.exp < Date.now()) return false;
    return data.u === process.env.AUTH_USERNAME;
  } catch {
    return false;
  }
}

export function safeNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) return "/";
  return value;
}
