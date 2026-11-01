"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setCallbackDone } from "@/app/admin/actions";

export function CallbackToggle({ id, done, labels }: { id: string; done: boolean; labels: { done: string; reopen: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setCallbackDone(id, !done);
          router.refresh();
        })
      }
    >
      {done ? labels.reopen : labels.done}
    </button>
  );
}
