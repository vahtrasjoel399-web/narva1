"use client";

import { useState } from "react";
import { CircleCheck, PhoneCall } from "lucide-react";
import type { Lang } from "@/config/site";
import type { Dictionary } from "@/i18n";
import { callbackSchema, fieldErrors } from "@/lib/validation";

/** "Leave your phone, we will call you" — stored as a callback request + admin email. */
export function CallbackForm({ lang, labels, errors: errorLabels }: {
  lang: Lang;
  labels: Dictionary["booking"]["callback"];
  errors: Dictionary["booking"]["errors"];
}) {
  const [form, setForm] = useState({ name: "", phone: "", comment: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");

  const msg = (code?: string) => (code ? ((errorLabels as Record<string, string>)[code] ?? errorLabels.required) : undefined);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, lang };
    const r = callbackSchema.safeParse(payload);
    if (!r.success) return setErrors(fieldErrors(r.error));
    setErrors({});
    setState("sending");
    try {
      const res = await fetch("/api/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 201) return setState("done");
      setErrors({ _: res.status === 429 ? errorLabels.rateLimited : errorLabels.generic });
    } catch {
      setErrors({ _: errorLabels.generic });
    }
    setState("idle");
  };

  if (state === "done") {
    return (
      <p role="status" className="flex items-center gap-3 rounded-2xl border border-ok-500/40 bg-ok-500/10 p-4 font-semibold text-ok-400">
        <CircleCheck size={22} aria-hidden="true" /> {labels.success}
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-3" aria-label={labels.title}>
      <p className="font-bold text-white">{labels.title}</p>
      <p className="-mt-2 text-sm text-ink-400">{labels.text}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="cb-name" className="field-label">
            {labels.name}
          </label>
          <input id="cb-name" className="input" autoComplete="name" value={form.name} aria-invalid={!!errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {errors.name && <p className="field-error">{msg(errors.name)}</p>}
        </div>
        <div>
          <label htmlFor="cb-phone" className="field-label">
            {labels.phone}
          </label>
          <input id="cb-phone" className="input" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} aria-invalid={!!errors.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          {errors.phone && <p className="field-error">{msg(errors.phone)}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="cb-comment" className="field-label">
          {labels.comment}
        </label>
        <textarea id="cb-comment" className="input" rows={2} placeholder={labels.commentPlaceholder} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
      </div>
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <input tabIndex={-1} autoComplete="off" name="website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
      </div>
      {errors._ && (
        <p role="alert" className="field-error">
          {errors._}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={state === "sending"}>
        <PhoneCall size={18} aria-hidden="true" /> {state === "sending" ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
