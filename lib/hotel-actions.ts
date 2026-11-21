"use server";

import { auditChange } from "./audit";
import { db } from "./db";
import { topHotels } from "./hotels";
import { HotelName } from "./models";

function tidy(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export async function listHotelNames() {
  await db();
  const saved = await HotelName.find().select("name").lean();
  const names = new Map<string, string>();
  for (const name of topHotels) names.set(name.toLowerCase(), name);
  for (const row of saved) names.set(row.key || row.name.toLowerCase(), row.name);
  return [...names.values()].sort((left, right) => left.localeCompare(right));
}

export async function saveHotelName(raw: string) {
  const name = tidy(raw);
  if (name.length < 2) return { ok: false as const, error: "Enter a hotel name" };
  const key = name.toLowerCase();
  const known = topHotels.find((item) => item.toLowerCase() === key);
  if (known) return { ok: true as const, name: known, added: false };
  await db();
  const existing = await HotelName.findOne({ key });
  if (existing) return { ok: true as const, name: existing.name, added: false };
  await HotelName.create({ key, name });
  await auditChange(`Added hotel ${name}`);
  return { ok: true as const, name, added: true };
}
