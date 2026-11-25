import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { IdleLogout } from "@/components/IdleLogout";
import { Shell } from "@/components/Shell";
import { db } from "@/lib/db";
import { User } from "@/lib/models";
import { sessionCookie, verifySession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const user = await verifySession(jar.get(sessionCookie.name)?.value);
  if (!user) redirect("/login");
  let name = user.name;
  if (user.id) {
    await db();
    const row = await User.findById(user.id).select("name").lean();
    if (row?.name) name = row.name;
  }
  return (
    <>
      <IdleLogout />
      <Shell user={{ ...user, name }}>{children}</Shell>
    </>
  );
}
