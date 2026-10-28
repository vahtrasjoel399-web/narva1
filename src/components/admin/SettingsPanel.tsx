"use client";

import { useCallback, useEffect, useState } from "react";
import { Send, TriangleAlert } from "lucide-react";
import type { Lang } from "@/config/site";
import { localeNames } from "@/i18n/config";
import { acknowledgeNotifications, getSettings, saveSettings, sendTestEmail, type SettingsData } from "@/app/admin/actions";
import { useAdmin } from "./AdminI18n";
import { useBadges } from "./AdminShell";
import { Field, LoadingBlock, PageTitle, Spinner, useToast } from "./ui";

export function SettingsPanel() {
  const { d, lang, t } = useAdmin();
  const toast = useToast();
  const { refresh } = useBadges();
  const [data, setData] = useState<SettingsData | null>(null);
  const [emails, setEmails] = useState("");
  const [notifyLang, setNotifyLang] = useState<Lang>("ru");
  const [busy, setBusy] = useState<"" | "save" | "test">("");

  const load = useCallback(async () => {
    const r = await getSettings();
    if (!r.ok) return;
    setData(r.data);
    setEmails(r.data.notifyEmails.join(", "));
    setNotifyLang(r.data.notifyLang);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (!data) return <LoadingBlock label={d.common.loading} />;

  const save = async () => {
    setBusy("save");
    const r = await saveSettings({ notifyEmails: emails.split(/[,;\s]+/), notifyLang });
    setBusy("");
    toast(r.ok ? { kind: "ok", text: d.common.saved } : { kind: "error", text: d.common.error });
    if (r.ok) load();
  };

  const test = async () => {
    setBusy("test");
    const r = await sendTestEmail();
    setBusy("");
    if (r.ok && r.data.status === "sent") toast({ kind: "ok", text: d.settings.testSent });
    else toast({ kind: "error", text: t(d.settings.testFailed, { error: r.ok ? (r.data.error ?? r.data.status) : r.error }) });
    load();
    refresh();
  };

  const ack = async (ids: number[] | "all") => {
    await acknowledgeNotifications(ids);
    load();
    refresh();
  };

  const statusLabel = { sent: d.settings.statusSent, failed: d.settings.statusFailed, skipped: d.settings.statusSkipped };
  const unacked = data.log.filter((l) => l.status === "failed" && !l.acknowledged);

  return (
    <div className="max-w-3xl">
      <PageTitle>{d.settings.title}</PageTitle>

      {!data.emailConfigured && (
        <p className="mb-4 flex gap-3 rounded-2xl border border-warn-400/40 bg-warn-400/10 p-4 text-sm font-semibold text-warn-400" role="alert">
          <TriangleAlert size={18} className="shrink-0" aria-hidden="true" /> {d.settings.resendMissing}
        </p>
      )}

      <section className="card flex flex-col gap-4 p-5">
        <Field label={d.settings.emails} hint={t(d.settings.emailsHint, { env: data.envEmails.join(", ") || "—" })}>
          <textarea className="input" rows={2} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="owner@example.ee, manager@example.ee" />
        </Field>
        <Field label={d.settings.lang}>
          <select className="input" value={notifyLang} onChange={(e) => setNotifyLang(e.target.value as Lang)}>
            {(["ru", "et", "en"] as const).map((l) => (
              <option key={l} value={l}>
                {localeNames[l]}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={save} disabled={!!busy}>
            {busy === "save" && <Spinner />} {d.settings.save}
          </button>
          <button type="button" className="btn btn-secondary" onClick={test} disabled={!!busy}>
            {busy === "test" ? <Spinner /> : <Send size={17} aria-hidden="true" />} {d.settings.test}
          </button>
        </div>
      </section>

      <section id="log" className="card mt-6 p-5">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="flex-1 text-lg font-bold text-white">{d.settings.log}</h2>
          {unacked.length > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => ack("all")}>
              {d.settings.ackAll}
            </button>
          )}
        </div>
        {data.log.length === 0 ? (
          <p className="text-sm text-ink-400">{d.settings.logEmpty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-ink-800">
            {data.log.map((l) => (
              <li key={l.id} className={`flex flex-col gap-1 py-3 ${l.status === "failed" && !l.acknowledged ? "rounded-xl bg-bad-500/10 px-3" : ""}`}>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span
                    className={`chip ${
                      l.status === "sent"
                        ? "bg-ok-500/15 text-ok-400"
                        : l.status === "failed"
                          ? "bg-bad-500 text-white"
                          : "bg-ink-700 text-ink-300"
                    }`}
                  >
                    {statusLabel[l.status]}
                  </span>
                  <span className="font-semibold text-ink-100">{l.subject ?? l.event}</span>
                  <span className="ml-auto text-xs text-ink-500">{new Date(l.created_at).toLocaleString(lang)}</span>
                </div>
                <p className="text-xs text-ink-400">
                  {l.event} → {l.recipient || "—"} · {l.attempts}×
                </p>
                {l.error && <p className="text-xs font-semibold text-bad-400">{l.error}</p>}
                {l.status === "failed" && !l.acknowledged && (
                  <button type="button" className="btn btn-ghost btn-sm self-start" onClick={() => ack([l.id])}>
                    {d.settings.ack}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
