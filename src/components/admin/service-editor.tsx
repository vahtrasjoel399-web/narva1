"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AdminDictionary } from "@/i18n/admin";
import type { L10n } from "@/config/site";
import { saveService } from "@/app/admin/actions";
import { Icon } from "@/components/ui/icon";

type S = { id: string; name: L10n; description: L10n; duration_min: number; price_from: number | null; sort: number; active: boolean };
const empty: S = { id: "", name: { et: "", ru: "", en: "" }, description: { et: "", ru: "", en: "" }, duration_min: 60, price_from: null, sort: 100, active: true };
const LANGS = ["et", "ru", "en"] as const;

export function ServiceEditor({ services, t }: { services: S[]; t: AdminDictionary }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="mt-6">
      <ul className="divide-y divide-line border-y border-line">
        {services.map((s) => (
          <li key={s.id}>
            <button type="button" className="flex min-h-14 w-full items-center gap-3 text-left" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id}>
              <span className={`flex-1 font-semibold ${s.active ? "" : "text-faint line-through"}`}>{s.name.et}</span>
              {!s.active && <span className="text-xs text-faint">{t.services.hidden}</span>}
              <span className="font-mono text-sm text-muted">{s.duration_min}′</span>
              <span className="w-16 text-right font-mono text-sm">{s.price_from != null ? `€${s.price_from}` : ""}</span>
              <Icon name="chevronDown" size={18} className={`transition-transform ${open === s.id ? "rotate-180" : ""}`} />
            </button>
            {open === s.id && <ServiceForm initial={s} t={t} onDone={() => setOpen(null)} />}
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-secondary mt-4" onClick={() => setOpen(open === "__new" ? null : "__new")}>
        <Icon name="plus" size={18} /> {t.services.add}
      </button>
      {open === "__new" && <ServiceForm initial={empty} isNew t={t} onDone={() => setOpen(null)} />}
    </div>
  );
}

function ServiceForm({ initial, isNew, t, onDone }: { initial: S; isNew?: boolean; t: AdminDictionary; onDone: () => void }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const ts = t.services;
  return (
    <form
      className="grid animate-rise gap-4 pb-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveService({ ...s, price_from: s.price_from ?? "" });
          if (!r.ok) return setErr(`${t.common.error}: ${r.message}`);
          router.refresh();
          onDone();
        });
      }}
    >
      {isNew && (
        <label className="block">
          <span className="field-label text-sm">{ts.id}</span>
          <input className="field font-mono" pattern="[a-z0-9-]{2,40}" required value={s.id} onChange={(e) => setS({ ...s, id: e.target.value.toLowerCase() })} />
        </label>
      )}
      <div className="grid gap-3 md:grid-cols-3">
        {LANGS.map((l) => (
          <div key={l} className="space-y-2">
            <label className="block">
              <span className="field-label text-sm">
                {ts.name} <span className="font-mono text-faint">{l.toUpperCase()}</span>
              </span>
              <input className="field" required={l === "et"} value={s.name[l]} onChange={(e) => setS({ ...s, name: { ...s.name, [l]: e.target.value } })} />
            </label>
            <label className="block">
              <span className="field-label text-sm">
                {ts.description} <span className="font-mono text-faint">{l.toUpperCase()}</span>
              </span>
              <textarea className="field" rows={3} value={s.description[l]} onChange={(e) => setS({ ...s, description: { ...s.description, [l]: e.target.value } })} />
            </label>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="field-label text-sm">{ts.duration}</span>
          <input type="number" min={15} max={600} step={15} className="field font-mono" value={s.duration_min} onChange={(e) => setS({ ...s, duration_min: Number(e.target.value) })} />
        </label>
        <label className="block">
          <span className="field-label text-sm">{ts.price}</span>
          <input type="number" min={0} step="0.01" className="field font-mono" value={s.price_from ?? ""} onChange={(e) => setS({ ...s, price_from: e.target.value === "" ? null : Number(e.target.value) })} />
        </label>
        <label className="block">
          <span className="field-label text-sm">{ts.sort}</span>
          <input type="number" min={0} className="field font-mono" value={s.sort} onChange={(e) => setS({ ...s, sort: Number(e.target.value) })} />
        </label>
      </div>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={s.active} onChange={(e) => setS({ ...s, active: e.target.checked })} />
        {ts.active}
      </label>
      {err && <p className="text-danger">{err}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {t.common.save}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          {t.common.cancel}
        </button>
      </div>
    </form>
  );
}
