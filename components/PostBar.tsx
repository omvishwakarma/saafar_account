"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionDeleteMove, actionDeletePayment, actionDeleteReceipt, actionPostMove, actionPostPayment, actionPostReceipt } from "@/lib/actions";
import { Button } from "./ui";

export function PostBar({
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
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        disabled={pending}
        onClick={() => {
          setError("");
          start(async () => {
            const result = kind === "move" ? await actionPostMove(id) : kind === "payment" ? await actionPostPayment(id) : await actionPostReceipt(id);
            if (!result.ok) setError(result.error);
            else router.refresh();
          });
        }}
      >
        {pending ? "Posting…" : "Post to the ledger"}
      </Button>
      <Button
        variant="danger"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const result = kind === "move" ? await actionDeleteMove(id) : kind === "payment" ? await actionDeletePayment(id) : await actionDeleteReceipt(id);
            if (!result.ok) setError(result.error);
            else router.push(back);
          });
        }}
      >
        Delete draft
      </Button>
      {error && <span className="text-sm text-red-800">{error}</span>}
    </div>
  );
}
