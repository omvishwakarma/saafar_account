import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { sessionCookie, verifySession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const user = await verifySession(jar.get(sessionCookie.name)?.value);
  if (!user) redirect("/login");
  return <Shell user={user}>{children}</Shell>;
}
