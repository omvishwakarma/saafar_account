import { NextResponse } from "next/server";
import { auditChange } from "@/lib/audit";
import { backupFileName, buildBackup } from "@/lib/backup";
import { currentUser } from "@/lib/current-user";

function jsonValue(key: string, value: unknown) {
  if (key === "__v" || key === "passwordHash") return undefined;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object" && "toHexString" in value && typeof value.toHexString === "function") {
    return value.toHexString();
  }
  return value;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const backup = await buildBackup();
  await auditChange("Downloaded a books backup");
  return new NextResponse(JSON.stringify(backup, jsonValue, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${backupFileName()}"`,
      "Cache-Control": "no-store",
    },
  });
}
