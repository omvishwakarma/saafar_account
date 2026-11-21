import { currentUser } from "./current-user";
import { db } from "./db";
import { AuditLog } from "./models";

export async function recordAudit(entry: { username: string; name: string; summary: string; target?: string }) {
  try {
    await db();
    await AuditLog.create({
      at: new Date(),
      username: entry.username,
      name: entry.name,
      action: "change",
      summary: entry.summary,
      target: entry.target || "",
    });
  } catch (error) {
    console.error("audit", error);
  }
}

export async function auditChange(summary: string, target = "") {
  const user = await currentUser();
  if (!user) return;
  await recordAudit({ username: user.username, name: user.name, summary, target });
}

export async function listAudit(limit = 200) {
  await db();
  const rows = await AuditLog.find().sort({ at: -1 }).limit(limit).lean();
  return rows.map((row) => ({
    id: String(row._id),
    at: row.at.toISOString(),
    username: row.username,
    name: row.name || row.username,
    summary: row.summary,
  }));
}
