"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelBooking({ token, labels }: {
  token: string;
  labels: { cancel: string; confirm: string; yes: string; no: string; cancelling: string; done: string; tooLate: string; error: string };
}) {
  const router = useRouter();
  const [stage, setStage] = useState<"idle" | "confirm" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  const cancel = async () => {
    setStage("sending");
    setError("");
    const res = await fetch("/api/bookings/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      setStage("done");
      router.refresh();
      return;
    }
    setError(data.error === "too_late" ? labels.tooLate : labels.error);
    setStage("idle");
  };

  if (stage === "done") return <p role="status" className="rounded-xl border border-ok-500/40 bg-ok-500/10 p-4 font-semibold text-ok-400">{labels.done}</p>;

  return (
    <div>
      {stage === "confirm" || stage === "sending" ? (
        <div className="rounded-2xl border border-bad-500/40 bg-bad-500/10 p-4">
          <p className="font-semibold text-ink-100">{labels.confirm}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn btn-danger flex-1" disabled={stage === "sending"} onClick={cancel}>
              {stage === "sending" ? labels.cancelling : labels.yes}
            </button>
            <button type="button" className="btn btn-secondary flex-1" disabled={stage === "sending"} onClick={() => setStage("idle")}>
              {labels.no}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-danger w-full" onClick={() => setStage("confirm")}>
          {labels.cancel}
        </button>
      )}
      {error && <p role="alert" className="field-error mt-2">{error}</p>}
    </div>
  );
}
