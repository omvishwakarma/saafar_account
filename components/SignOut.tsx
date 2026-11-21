import { logout } from "@/lib/auth-actions";

export function SignOut({ light = false }: { light?: boolean }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        className={`text-xs font-semibold ${light ? "text-sand/80 hover:text-white" : "text-muted hover:text-ink"}`}
      >
        Sign out
      </button>
    </form>
  );
}
