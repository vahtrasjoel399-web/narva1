"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dictionary } from "@/i18n";

export function CancelBooking({ token, t, bookHref }: { token: string; t: Dictionary["manage"]; bookHref: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "sending" | "done" | "too_late" | "not_cancellable" | "error">("idle");

  const cancel = async () => {
    setState("sending");
    const res = await fetch("/api/booking/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) {
      setState("done");
      router.refresh();
    } else if (data?.error === "too_late") setState("too_late");
    else if (data?.error === "not_cancellable") setState("not_cancellable");
    else setState("error");
  };

  if (state === "done")
    return (
      <div role="status">
        <p className="text-lg">{t.cancelled}</p>
        <Link href={bookHref} className="btn btn-primary mt-5">
          {t.bookAgain}
        </Link>
      </div>
    );
  if (state === "too_late") return <p role="alert" className="text-accent">{t.tooLate}</p>;
  if (state === "not_cancellable") return <p role="alert">{t.notCancellable}</p>;

  return state === "confirm" || state === "sending" ? (
    <div className="panel p-5" role="alertdialog" aria-labelledby="cancel-q">
      <p id="cancel-q">{t.cancelConfirm}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="btn btn-danger" onClick={cancel} disabled={state === "sending"}>
          {t.cancelYes}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setState("idle")} disabled={state === "sending"}>
          {t.cancelNo}
        </button>
      </div>
    </div>
  ) : (
    <>
      <button type="button" className="btn btn-danger" onClick={() => setState("confirm")}>
        {t.cancel}
      </button>
      {state === "error" && <p className="field-error">{t.notFound}</p>}
    </>
  );
}
