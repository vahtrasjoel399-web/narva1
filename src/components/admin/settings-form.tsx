"use client";
import { useState, useTransition } from "react";
import type { AdminDictionary } from "@/i18n/admin";
import { saveSettings, sendTestEmail } from "@/app/admin/actions";

export function SettingsForm({ t, emails, envEmails, lang }: { t: AdminDictionary; emails: string; envEmails: string; lang: string }) {
  const [pending, start] = useTransition();
  const [v, setV] = useState({ emails, lang });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const ts = t.settings;
  return (
    <form
      className="panel space-y-5 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveSettings(v);
          setMsg({ ok: r.ok, text: r.ok ? t.common.saved : `${t.common.error}: ${r.message}` });
        });
      }}
    >
      <label className="block">
        <span className="field-label">{ts.emails}</span>
        <textarea className="field font-mono" rows={3} value={v.emails} onChange={(e) => setV({ ...v, emails: e.target.value })} placeholder="owner@example.ee" />
        <span className="field-hint block">{ts.emailsHint.replace("{env}", envEmails)}</span>
      </label>
      <label className="block">
        <span className="field-label">{ts.lang}</span>
        <select className="field" value={v.lang} onChange={(e) => setV({ ...v, lang: e.target.value })}>
          <option value="et">Eesti</option>
          <option value="ru">Русский</option>
          <option value="en">English</option>
        </select>
      </label>
      {msg && (
        <p role="status" className={msg.ok ? "text-ok" : "text-danger"}>
          {msg.text}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {t.common.save}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await sendTestEmail();
              setMsg({ ok: r.ok, text: r.ok ? ts.testSent : ts.testFailed.replace("{error}", r.message ?? "") });
            })
          }
        >
          {ts.test}
        </button>
      </div>
    </form>
  );
}
