"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  actionDeleteMove,
  actionDeletePayment,
  actionDeleteReceipt,
  actionReopenMove,
  actionReopenPayment,
  actionReopenReceipt,
} from "@/lib/actions";
import { Button } from "./ui";

export function DocumentTools({
  kind,
  id,
  back,
}: {
  kind: "move" | "payment" | "receipt";
  id: string;
  back: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function reopen() {
    setError("");
    start(async () => {
      const result = kind === "move" ? await actionReopenMove(id) : kind === "payment" ? await actionReopenPayment(id) : await actionReopenReceipt(id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  function remove() {
    if (!window.confirm("Delete this document? Its ledger entry will be removed.")) return;
    setError("");
    start(async () => {
      const result = kind === "move" ? await actionDeleteMove(id) : kind === "payment" ? await actionDeletePayment(id) : await actionDeleteReceipt(id);
      if (!result.ok) setError(result.error);
      else router.push(back);
    });
  }

  return (
    <>
      <Button variant="ghost" disabled={pending} onClick={reopen}>Edit</Button>
      <Button variant="danger" disabled={pending} onClick={remove}>Delete</Button>
      {error && <span className="self-center text-sm text-red-800">{error}</span>}
    </>
  );
}
