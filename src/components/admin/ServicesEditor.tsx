"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { Lang } from "@/config/site";
import { localeNames } from "@/i18n/config";
import { formatPrice } from "@/lib/format";
import type { Service } from "@/lib/types";
import { serviceIconNames, ServiceIcon } from "@/components/icons";
import { listAllServices, saveService } from "@/app/admin/actions";
import { useAdmin } from "./AdminI18n";
import { Field, LoadingBlock, PageTitle, Sheet, Spinner, useToast } from "./ui";

const LANGS: Lang[] = ["et", "ru", "en"];
const blank: Service = {
  id: "",
  name: { et: "", ru: "", en: "" },
  description: { et: "", ru: "", en: "" },
  icon: "wrench",
  durationMin: 60,
  priceFrom: 0,
  sort: 100,
  active: true,
};

export function ServicesEditor() {
  const { d, lang } = useAdmin();
  const toast = useToast();
  const [rows, setRows] = useState<Service[] | null>(null);
  const [edit, setEdit] = useState<{ s: Service; isNew: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await listAllServices();
    if (r.ok) setRows(r.data);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const save = async () => {
    if (!edit) return;
    setBusy(true);
    const r = await saveService(edit.s, edit.isNew);
    setBusy(false);
    if (!r.ok) return toast({ kind: "error", text: r.error === "E_EXISTS" ? d.services.exists : d.common.error });
    toast({ kind: "ok", text: d.services.saved });
    setEdit(null);
    load();
  };

  const s = edit?.s;
  const upd = (patch: Partial<Service>) => edit && setEdit({ ...edit, s: { ...edit.s, ...patch } });

  return (
    <div>
      <PageTitle
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdit({ s: { ...blank, sort: ((rows?.length ?? 0) + 1) * 10 }, isNew: true })}>
            <Plus size={17} aria-hidden="true" /> {d.services.add}
          </button>
        }
      >
        {d.services.title}
      </PageTitle>
      {!rows ? (
        <LoadingBlock label={d.common.loading} />
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {rows.map((x) => (
            <li key={x.id}>
              <button type="button" onClick={() => setEdit({ s: x, isNew: false })} className={`card card-hover flex w-full items-center gap-4 p-4 text-left ${x.active ? "" : "opacity-50"}`}>
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink-750 text-accent-400">
                  <ServiceIcon name={x.icon} size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-white">{x.name[lang]}</span>
                  <span className="block text-sm text-ink-400">
                    {x.durationMin} {d.common.minutes} · {formatPrice(x.priceFrom, lang)}
                    {!x.active && ` · ${d.services.inactive}`}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={!!edit}
        onClose={() => setEdit(null)}
        wide
        title={edit?.isNew ? d.services.add : (s?.name[lang] ?? "")}
        footer={
          <button type="button" className="btn btn-primary w-full" disabled={busy || !s?.id || !s.name.et || !s.name.ru || !s.name.en} onClick={save}>
            {busy && <Spinner />} {d.common.save}
          </button>
        }
      >
        {s && (
          <div className="flex flex-col gap-4">
            <Field label={d.services.id}>
              <input
                className="input"
                value={s.id}
                disabled={!edit?.isNew}
                onChange={(e) => upd({ id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
              />
            </Field>
            {LANGS.map((l) => (
              <div key={l} className="grid gap-3 rounded-2xl border border-ink-700 p-3">
                <Field label={`${d.services.name} — ${localeNames[l]}`}>
                  <input className="input" value={s.name[l]} onChange={(e) => upd({ name: { ...s.name, [l]: e.target.value } })} />
                </Field>
                <Field label={`${d.services.description} — ${localeNames[l]}`}>
                  <textarea className="input" rows={2} value={s.description[l]} onChange={(e) => upd({ description: { ...s.description, [l]: e.target.value } })} />
                </Field>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <Field label={d.services.duration}>
                <input className="input" type="number" min={5} step={5} value={s.durationMin} onChange={(e) => upd({ durationMin: Number(e.target.value) })} />
              </Field>
              <Field label={d.services.price}>
                <input className="input" type="number" min={0} step={1} value={s.priceFrom} onChange={(e) => upd({ priceFrom: Number(e.target.value) })} />
              </Field>
              <Field label={d.services.sort}>
                <input className="input" type="number" min={0} value={s.sort} onChange={(e) => upd({ sort: Number(e.target.value) })} />
              </Field>
              <label className="flex items-center gap-3 self-end rounded-xl border border-ink-700 px-3 py-3">
                <input type="checkbox" className="size-5 accent-[var(--color-accent-500)]" checked={s.active} onChange={(e) => upd({ active: e.target.checked })} />
                <span className="text-sm font-semibold">{d.services.active}</span>
              </label>
            </div>
            <div>
              <p className="field-label">{d.services.icon}</p>
              <div className="flex flex-wrap gap-2">
                {serviceIconNames.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    aria-pressed={s.icon === icon}
                    aria-label={icon}
                    onClick={() => upd({ icon })}
                    className={`grid size-12 place-items-center rounded-xl border ${
                      s.icon === icon ? "border-accent-500 bg-accent-500 text-ink-950" : "border-ink-700 bg-ink-850 text-ink-200"
                    }`}
                  >
                    <ServiceIcon name={icon} size={22} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
