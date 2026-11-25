import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/Logo";
import { company } from "@/lib/company";
import { safeNext, verifySession, sessionCookie } from "@/lib/session";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const jar = await cookies();
  if (await verifySession(jar.get(sessionCookie.name)?.value)) redirect("/");
  const params = await searchParams;
  const next = safeNext(params.next);
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-8 shadow-card">
        <Logo className="h-16 w-auto" />
        <p className="mt-2 text-sm text-muted">
          {company.short} books stay locked until you sign in. Amounts are kept in {company.base}.
        </p>
        {params.reason === "idle" && (
          <p className="mt-4 rounded-lg border border-line bg-sand px-3 py-2 text-sm text-ink">
            You were signed out after 10 minutes with no activity.
          </p>
        )}
        <LoginForm next={next} />
      </div>
    </div>
  );
}
