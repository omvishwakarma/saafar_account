import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/Logo";
import { company } from "@/lib/company";
import { safeNext, verifySession, sessionCookie } from "@/lib/session";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const jar = await cookies();
  if (await verifySession(jar.get(sessionCookie.name)?.value)) redirect("/");
  const next = safeNext((await searchParams).next);
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-8 shadow-card">
        <Logo className="h-16 w-auto" />
        <p className="mt-2 text-sm text-muted">
          {company.short} books stay locked until you sign in. Amounts are kept in {company.base}.
        </p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
