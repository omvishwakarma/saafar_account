import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { sessionCookie, verifySession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  if (!(await verifySession(jar.get(sessionCookie.name)?.value))) redirect("/login");
  return <Shell>{children}</Shell>;
}
