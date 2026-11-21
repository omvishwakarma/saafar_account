"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionCreateUser, actionResetPassword, actionSetUserActive } from "@/lib/admin-actions";
import { Button, Field, inputClass } from "./ui";

type UserRow = { id: string; username: string; name: string; role: "admin" | "consultant"; active: boolean };
type LogRow = { id: string; at: string; username: string; name: string; summary: string };

export function AdminDesk({ users, logs }: { users: UserRow[]; logs: LogRow[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, start] = useTransition();

  function run(work: () => Promise<{ ok: true } | { ok: false; error: string }>, done: string) {
    setError("");
    setNotice("");
    start(async () => {
      const result = await work();
      if (!result.ok) setError(result.error);
      else {
        setNotice(done);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-display text-2xl">New login</h2>
        <p className="mt-1 text-sm text-muted">Consultants sign in with the username and password you set here. Admins can also open this panel.</p>
        <form
          className="mt-4 grid gap-3 md:grid-cols-5"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const form = event.currentTarget;
            run(async () => {
              const result = await actionCreateUser({
                name: String(data.get("name") || ""),
                username: String(data.get("username") || ""),
                password: String(data.get("password") || ""),
                role: data.get("role") === "admin" ? "admin" : "consultant",
              });
              if (result.ok) form.reset();
              return result;
            }, "Login created");
          }}
        >
          <Field label="Name"><input name="name" className={inputClass} required /></Field>
          <Field label="Username"><input name="username" className={inputClass} autoComplete="off" required placeholder="sara.consultant" /></Field>
          <Field label="Password"><input name="password" type="password" className={inputClass} autoComplete="new-password" required minLength={6} /></Field>
          <Field label="Role">
            <select name="role" className={inputClass} defaultValue="consultant">
              <option value="consultant">Consultant</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={pending}>Create login</Button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="font-display text-2xl">Logins</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-paper">
          <table className="books">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>New password</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserLine key={user.id} user={user} pending={pending} onReset={(password) => run(() => actionResetPassword(user.id, password), `Password updated for ${user.username}`)} onToggle={() => run(() => actionSetUserActive(user.id, !user.active), user.active ? `Disabled ${user.username}` : `Enabled ${user.username}`)} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">Activity log</h2>
        <p className="mt-1 text-sm text-muted">Who signed in, and who changed a voucher, invoice, payment, rate, account, or login.</p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-paper">
          <table className="books">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={3}>No changes yet.</td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap">{new Date(log.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuwait" })}</td>
                  <td>{log.name} · {log.username}</td>
                  <td>{log.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {notice && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{notice}</p>}
    </div>
  );
}

function UserLine({
  user,
  pending,
  onReset,
  onToggle,
}: {
  user: UserRow;
  pending: boolean;
  onReset: (password: string) => void;
  onToggle: () => void;
}) {
  const [password, setPassword] = useState("");
  return (
    <tr>
      <td>{user.name}</td>
      <td>{user.username}</td>
      <td className="capitalize">{user.role}</td>
      <td>{user.active ? "Active" : "Disabled"}</td>
      <td>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onReset(password);
            setPassword("");
          }}
        >
          <input className={inputClass} type="password" value={password} autoComplete="new-password" placeholder="New password" onChange={(event) => setPassword(event.target.value)} />
          <Button type="submit" variant="ghost" disabled={pending || password.length < 6}>Reset</Button>
        </form>
      </td>
      <td>
        <Button type="button" variant={user.active ? "danger" : "ghost"} disabled={pending} onClick={onToggle}>
          {user.active ? "Disable" : "Enable"}
        </Button>
      </td>
    </tr>
  );
}
