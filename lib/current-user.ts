import { cookies } from "next/headers";
import { sessionCookie, verifySession, type SessionUser } from "./session";

export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  return verifySession(jar.get(sessionCookie.name)?.value);
}
