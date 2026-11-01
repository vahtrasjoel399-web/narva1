"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import type { Dictionary } from "@/i18n";
import type { AdminDictionary } from "@/i18n/admin";
import { createManualBooking } from "@/app/admin/actions";

type Svc = { id: string; name: string; duration: number };

export function ManualBookingForm({ services, t, booking, localeTag, defaultLang }: { services: Svc[]; t: AdminDictionary; booking: Dictionary["booking"]; localeTag: string; defaultLang: string }) {
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  const [starts, setStarts] = useState<Record<string, string[]> | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [f, setF] = useState({ name: "", phone: "", email: "", car_make: "", car_model: "", car_year: "", plate: "", comment: "", lang: defaultLang });
  const [result, setResult] = useState<{ ok: boolean; text: string; id?: string } | null>(null);

  const load = useCallback(async () => {
    if (!selected.length) return setStarts(null);
    const res = await fetch(`/api/availability?services=${selected.join(",")}`, { cache: "no-store" });
    const data = await res.json();
    setStarts(data.starts ?? {});
  }, [selected]);
  useEffect(() => {
    void load();
  }, [load]);

  const dates = starts ? Object.keys(starts) : [];
  const label = (d: string) => new Intl.DateTimeFormat(localeTag, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await createManualBooking({ services: selected, date, time, ...f, lang: f.lang as "et" | "ru" | "en" });
      if (r.ok) setResult({ ok: true, text: t.manual.created.replace("{n}", String(r.number)), id: r.message });
      else {
        setResult({ ok: false, text: r.message === "slot_taken" ? t.manual.taken : `${t.common.error}: ${r.message}` });
        setTime("");
        void load();
      }
    });
  };

  if (result?.ok) {
    return (
      <div className="panel mt-6 p-5" role="status">
        <p className="text-lg font-semibold">{result.text}</p>
        <div className="mt-4 flex gap-2">
          <Link href={`/admin/bookings/${result.id}`} className="btn btn-primary btn-sm">
            {t.common.open}
          </Link>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.location.reload()}>
            {t.bookings.newBooking}
          </button>
        </div>
      </div>
    );
  }

  const input = (k: keyof typeof f, lbl: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="field-label text-sm">{lbl}</span>
      <input className="field" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} />
    </label>
  );

  return (
    <form onSubmit={submit} className="mt-6 space-y-8">
      <fieldset>
        <legend className="font-semibold">{booking.chooseServices}</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {services.map((s) => (
            <label key={s.id} className={`flex min-h-12 items-center gap-3 rounded-sm border px-3 ${selected.includes(s.id) ? "border-accent" : "border-line"}`}>
              <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={selected.includes(s.id)} onChange={(e) => { setSelected((c) => (e.target.checked ? [...c, s.id] : c.filter((x) => x !== s.id))); setDate(""); setTime(""); }} />
              <span className="flex-1">{s.name}</span>
              <span className="font-mono text-sm text-muted">{s.duration}′</span>
            </label>
          ))}
        </div>
      </fieldset>

      {selected.length > 0 && (
        <fieldset>
          <legend className="font-semibold">{t.manual.pick}</legend>
          {starts === null ? (
            <div className="skeleton mt-3 h-12" />
          ) : dates.length === 0 ? (
            <p className="mt-2 text-muted">
              {t.manual.noTimes}{" "}
              <Link href="/admin/calendar" className="link">
                {t.nav.calendar}
              </Link>
            </p>
          ) : (
            <>
              <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-2">
                {dates.map((d) => (
                  <button key={d} type="button" onClick={() => { setDate(d); setTime(""); }} className={`min-h-12 shrink-0 rounded-sm border px-3 font-mono text-sm capitalize ${d === date ? "border-accent bg-accent text-on-accent" : "border-line-strong"}`}>
                    {label(d)}
                  </button>
                ))}
              </div>
              {date && (
                <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                  {starts[date].map((tm) => (
                    <button key={tm} type="button" onClick={() => setTime(tm)} className={`min-h-11 rounded-sm border font-mono ${tm === time ? "border-accent bg-accent text-on-accent" : "border-line-strong"}`}>
                      {tm}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </fieldset>
      )}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-semibold">{t.manual.customer}</legend>
        {input("name", booking.name, { required: true, autoComplete: "off" })}
        {input("phone", booking.phone, { required: true, type: "tel", inputMode: "tel" })}
        {input("email", booking.email, { type: "email" })}
        <label className="block">
          <span className="field-label text-sm">{t.bookings.lang}</span>
          <select className="field" value={f.lang} onChange={(e) => setF({ ...f, lang: e.target.value })}>
            <option value="et">Eesti</option>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </label>
        {input("car_make", booking.carMake, { required: true })}
        {input("car_model", booking.carModel, { required: true })}
        {input("car_year", booking.carYear, { inputMode: "numeric", maxLength: 4 })}
        {input("plate", booking.plate)}
        <label className="block sm:col-span-2">
          <span className="field-label text-sm">{booking.comment}</span>
          <textarea className="field" rows={3} value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} />
        </label>
      </fieldset>

      {result && !result.ok && (
        <p role="alert" className="text-danger">
          {result.text}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending || !time || !date}>
        {t.manual.create}
      </button>
    </form>
  );
}
