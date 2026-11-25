"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionDeleteVoucher } from "@/lib/actions";
import { Button } from "./ui";

export function VoucherRowActions({ id, number }: { id: string; number: string }) {
  return (
    <div className="flex justify-end gap-2">
      <Button href={`/vouchers/${id}/edit`} variant="ghost">Edit</Button>
      <VoucherDelete id={id} number={number} />
    </div>
  );
}

export function VoucherDelete({ id, number }: { id: string; number: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Delete ${number}? Its invoice and bill will be removed.`)) return;
        start(async () => {
          const result = await actionDeleteVoucher(id);
          if (!result.ok) window.alert(result.error);
          else router.push("/vouchers");
        });
      }}
    >
      Delete
    </Button>
  );
}
