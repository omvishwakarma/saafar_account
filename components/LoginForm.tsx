"use client";

import { useState, useTransition } from "react";
import { login } from "@/lib/auth-actions";
import { Button, Field, inputClass } from "./ui";

export function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError("");
        start(async () => {
          const result = await login({
            username: String(data.get("username") || ""),
            password: String(data.get("password") || ""),
            next,
          });
          if (result?.error) setError(result.error);
        });
      }}
    >
      <Field label="Username">
        <input name="username" autoComplete="username" className={inputClass} required />
      </Field>
      <Field label="Password">
        <input name="password" type="password" autoComplete="current-password" className={inputClass} required />
      </Field>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
