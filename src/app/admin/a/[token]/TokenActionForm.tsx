"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { t } from "@/i18n/config";
import type { BookingStatus } from "@/lib/types";
import { Spinner } from "@/components/admin/ui";
import { performTokenAction, type TokenActionResult } from "./actions";

export function TokenActionForm({ token, action, labels }: {
  token: string;
  action: "confirm" | "decline";
  labels: {
    question: string;
    button: string;
    confirmed: string;
    declined: string;
    used: string;
    expired: string;
    invalid: string;
    error: string;
    notApplicable: string;
    statuses: Record<BookingStatus, string>;
  };
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TokenActionResult | null>(null);

  if (result?.ok) {
    return (
      <p className="flex items-start gap-3 rounded-xl border border-ok-500/40 bg-ok-500/10 p-4 font-semibold text-ok-400" role="status">
        <CircleCheck size={22} className="shrink-0" aria-hidden="true" />
        {result.action === "confirm" ? labels.confirmed : labels.declined}
      </p>
    );
  }

  const errorText = result && !result.ok
    ? result.error === "used"
      ? labels.used
      : result.error === "expired"
        ? labels.expired
        : result.error === "invalid"
          ? labels.invalid
          : result.error === "not_applicable" && result.status
            ? t(labels.notApplicable, { status: labels.statuses[result.status] })
            : labels.error
    : null;

  return (
    <div>
      <p className="mb-3 text-lg font-bold text-white">{labels.question}</p>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setResult(await performTokenAction(token));
          setBusy(false);
        }}
        className={`btn btn-lg w-full ${action === "confirm" ? "btn-ok" : "btn-danger"}`}
      >
        {busy && <Spinner />} {labels.button}
      </button>
      {errorText && (
        <p className="field-error mt-3" role="alert">
          {errorText}
        </p>
      )}
    </div>
  );
}
