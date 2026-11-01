"use client";
import { useState } from "react";
import type { Locale } from "@/config/site";
import type { Dictionary } from "@/i18n";
import { callbackSchema, fieldErrors } from "@/lib/validation";
import { Icon } from "@/components/ui/icon";

/** "Leave your phone, we will call you" fallback. Stored as a callback request + admin email. */
export function CallbackForm({ lang, t, v, phone }: { lang: Locale; t: Dictionary["booking"]; v: Dictionary["validation"]; phone: { display: string } }) {
  const [form, setForm] = useState({ name: "", phone: "", comment: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const msg = (k?: string) => (k ? ((v as Record<string, string>)[k] ?? v.required) : undefined);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = callbackSchema.safeParse({ ...form, lang });
    if (!r.success) return setErrors(fieldErrors(r.error));
    setErrors({});
    setState("sending");
    const res = await fetch("/api/callback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, lang }) }).catch(() => null);
    setState(res?.ok ? "done" : "error");
  };

  if (state === "done") {
    return (
      <p role="status" className="mt-5 flex items-center gap-3 text-lg">
        <Icon name="check" className="text-ok" /> {t.callbackDone}
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-5 grid gap-4 sm:grid-cols-2">
      <p className="font-semibold sm:col-span-2">{t.callbackTitle}</p>
      <div>
        <label htmlFor="cb-name" className="field-label">
          {t.callbackName}
        </label>
        <input id="cb-name" className="field" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} />
        {errors.name && <p className="field-error">{msg(errors.name)}</p>}
      </div>
      <div>
        <label htmlFor="cb-phone" className="field-label">
          {t.callbackPhone}
        </label>
        <input id="cb-phone" type="tel" inputMode="tel" className="field font-mono" autoComplete="tel" placeholder={t.phonePh} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} aria-invalid={!!errors.phone} />
        {errors.phone && <p className="field-error">{msg(errors.phone)}</p>}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="cb-comment" className="field-label">
          {t.callbackComment}
        </label>
        <textarea id="cb-comment" className="field" rows={3} maxLength={1000} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
      </div>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
      </div>
      {state === "error" && (
        <p role="alert" className="text-danger sm:col-span-2">
          {t.genericError.replace("{phone}", phone.display)}
        </p>
      )}
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={state === "sending"}>
          {state === "sending" ? t.submitting : t.callbackSubmit}
        </button>
      </div>
    </form>
  );
}
