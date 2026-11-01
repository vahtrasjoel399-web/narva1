"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/config/site";
import type { Dictionary } from "@/i18n";
import { carSchema, contactSchema, fieldErrors } from "@/lib/validation";
import { Icon } from "@/components/ui/icon";
import { Calendar } from "./calendar";
import { CallbackForm } from "./callback-form";

type ServiceOption = { id: string; name: string; description: string; duration: number; price: number | null };

type Props = {
  lang: Locale;
  localeTag: string;
  services: ServiceOption[];
  preselected: string[];
  t: Dictionary["booking"];
  common: Dictionary["common"];
  days: string[];
  v: Dictionary["validation"];
  phone: { display: string; href: string };
  cancelHours: number;
  privacyHref: string;
};

type Availability =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; starts: Record<string, string[]>; from: string; to: string };

type Done = { number: number; token: string; date: string; time: string; end: string; email: string };

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));

function duration(min: number, c: Dictionary["common"]) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h ? `${h} ${c.hour}` : "", m ? `${m} ${c.min}` : ""].filter(Boolean).join(" ");
}

export function BookingFlow({ lang, localeTag, services, preselected, t, common, days, v, phone, cancelHours, privacyHref }: Props) {
  const [step, setStep] = useState(preselected.length ? 1 : 0);
  const [selected, setSelected] = useState<string[]>(preselected);
  const [avail, setAvail] = useState<Availability>({ status: "loading" });
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [car, setCar] = useState({ car_make: "", car_model: "", car_year: "", plate: "", comment: "" });
  const [contact, setContact] = useState({ name: "", phone: "", email: "", consent: false });
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const startedAt = useRef(Date.now());
  const topRef = useRef<HTMLDivElement>(null);

  const totalMin = useMemo(() => services.filter((s) => selected.includes(s.id)).reduce((a, s) => a + s.duration, 0), [services, selected]);
  const priceFrom = useMemo(() => services.filter((s) => selected.includes(s.id)).reduce((a, s) => a + (s.price ?? 0), 0), [services, selected]);
  const money = (n: number) => new Intl.NumberFormat(localeTag, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  const fullDate = (d: string) => new Intl.DateTimeFormat(localeTag, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const msg = (key?: string) => (key ? fill((v as Record<string, string>)[key] ?? v.required, { max: new Date().getFullYear() + 1 }) : undefined);

  const loadAvailability = useCallback(async () => {
    setAvail({ status: "loading" });
    try {
      const res = await fetch(`/api/availability?services=${selected.join(",")}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setAvail({ status: "ready", starts: data.starts, from: data.from, to: data.to });
      return data.starts as Record<string, string[]>;
    } catch {
      setAvail({ status: "error" });
      return null;
    }
  }, [selected]);

  // Refresh free times whenever the service choice changes or the user returns to step 2.
  useEffect(() => {
    if (step === 1 && selected.length) void loadAvailability();
  }, [step, selected, loadAvailability]);

  // Drop a chosen date/time that no longer fits the new service length.
  useEffect(() => {
    if (avail.status !== "ready" || !date) return;
    const times = avail.starts[date];
    if (!times) {
      setDate(null);
      setTime(null);
    } else if (time && !times.includes(time)) setTime(null);
  }, [avail, date, time]);

  const go = (n: number) => {
    setStep(n);
    setErrors({});
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const next = () => {
    if (step === 0) {
      if (!selected.length) return setErrors({ services: "services" });
      setNotice(null);
      return go(1);
    }
    if (step === 1) {
      if (!date || !time) return setErrors({ slot: "slot" });
      return go(2);
    }
    if (step === 2) {
      const r = carSchema.safeParse(car);
      if (!r.success) return setErrors(fieldErrors(r.error));
      return go(3);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = contactSchema.safeParse(contact);
    if (!r.success) return setErrors(fieldErrors(r.error));
    setSubmitting(true);
    setNotice(null);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services: selected, date, time, ...car, ...contact, lang, website, startedAt: startedAt.current }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setDone({ number: data.number, token: data.token, date: date!, time: time!, end: data.end, email: contact.email });
        requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth" }));
        return;
      }
      if (res.status === 409) {
        // Someone else got this time first: refresh the list and send the user back to pick another.
        setTime(null);
        setNotice(t.slotTaken);
        await loadAvailability();
        go(1);
        return;
      }
      if (res.status === 429) return setNotice(t.rateLimited);
      if (res.status === 400 && data.fields) {
        setErrors(data.fields);
        if (data.fields.date || data.fields.time) go(1);
        else if (["car_make", "car_model", "car_year", "plate", "comment"].some((k) => k in data.fields)) go(2);
        return;
      }
      setNotice(fill(t.genericError, { phone: phone.display }));
    } catch {
      setNotice(fill(t.genericError, { phone: phone.display }));
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------------------------ done
  if (done) {
    const manage = `/${lang}/booking/${done.token}`;
    return (
      <div ref={topRef} className="mt-8 max-w-2xl animate-rise" role="status">
        <div className="panel p-6 md:p-8">
          <span className="grid size-12 place-items-center rounded-sm bg-accent text-on-accent">
            <Icon name="check" size={26} strokeWidth={2.2} />
          </span>
          <h2 className="mt-5 text-3xl font-bold">{t.doneTitle}</h2>
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y border-line py-5">
            <dt className="text-muted">{t.doneNumber}</dt>
            <dd className="font-mono text-2xl text-accent">#{done.number}</dd>
            <dt className="text-muted">{t.pickTime}</dt>
            <dd className="font-mono">
              <span className="capitalize">{fullDate(done.date)}</span> · {done.time}–{done.end}
            </dd>
          </dl>
          <p className="mt-5 text-muted">{fill(t.doneText, { h: cancelHours })}</p>
          {done.email && <p className="mt-2 text-muted">{fill(t.doneEmail, { email: done.email })}</p>}
          <p className="mt-5 text-sm text-faint">{t.doneSaveLink}</p>
          <Link href={manage} className="btn btn-primary mt-3">
            {t.doneManage}
          </Link>
        </div>
      </div>
    );
  }

  const chosenServices = services.filter((s) => selected.includes(s.id));
  const noSlotsAtAll = avail.status === "ready" && Object.keys(avail.starts).length === 0;

  // ------------------------------------------------------------------ flow
  return (
    <div ref={topRef} className="mt-6 scroll-mt-24 lg:grid lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-8">
        {/* Stepper */}
        <ol className="mb-8 grid grid-cols-4 gap-1.5" aria-label={fill(t.stepOf, { n: step + 1, total: 4 })}>
          {t.steps.map((label, i) => {
            const state = i < step ? "done" : i === step ? "current" : "todo";
            return (
              <li key={label}>
                <button
                  type="button"
                  disabled={i >= step}
                  onClick={() => go(i)}
                  aria-current={state === "current" ? "step" : undefined}
                  className="group block w-full text-left disabled:cursor-default"
                >
                  <span className={`block h-1 rounded-full transition-colors ${state === "todo" ? "bg-line" : "bg-accent"}`} />
                  <span className={`mt-2 block truncate text-xs sm:text-sm ${state === "current" ? "font-semibold text-fg" : state === "done" ? "text-muted group-hover:text-fg" : "text-faint"}`}>
                    <span className="font-mono">{i + 1}</span> {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {notice && (
          <div role="alert" className="mb-6 flex gap-3 rounded-md border border-accent/60 bg-accent/10 p-4">
            <Icon name="alert" className="mt-0.5 shrink-0 text-accent" />
            <p>{notice}</p>
          </div>
        )}

        {/* Step 1: services */}
        {step === 0 && (
          <fieldset className="animate-rise">
            <legend className="text-2xl font-bold">{t.chooseServices}</legend>
            <p className="mt-1 text-muted">{t.chooseServicesHint}</p>
            <div className="mt-6 grid gap-2">
              {services.map((s) => {
                const on = selected.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex min-h-16 cursor-pointer items-start gap-4 rounded-md border p-4 transition-colors ${on ? "border-accent bg-accent/[0.07]" : "border-line hover:border-line-strong"}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-5 shrink-0 accent-[var(--accent)]"
                      checked={on}
                      onChange={(e) => {
                        setErrors({});
                        setSelected((cur) => (e.target.checked ? [...cur, s.id] : cur.filter((x) => x !== s.id)));
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{s.name}</span>
                      <span className="mt-0.5 block text-sm text-muted">{s.description}</span>
                    </span>
                    <span className="shrink-0 text-right font-mono text-sm">
                      <span className="block text-muted">{duration(s.duration, common)}</span>
                      {s.price != null && (
                        <span className="block">
                          <span className="text-faint">{common.from} </span>
                          {money(s.price)}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.services && <p className="field-error">{msg(errors.services)}</p>}
          </fieldset>
        )}

        {/* Step 2: date + time */}
        {step === 1 && (
          <section className="animate-rise" aria-labelledby="pick-title">
            <h2 id="pick-title" className="text-2xl font-bold">
              {t.pickDate}
            </h2>
            {avail.status === "loading" && (
              <div className="mt-6" aria-busy="true" aria-label={t.loadingSlots}>
                <div className="skeleton mb-3 h-11 w-full" />
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="skeleton aspect-square" />
                  ))}
                </div>
              </div>
            )}
            {avail.status === "error" && (
              <div className="mt-6 panel p-5">
                <p>{t.loadError}</p>
                <button type="button" className="btn btn-secondary btn-sm mt-4" onClick={() => void loadAvailability()}>
                  {t.retry}
                </button>
              </div>
            )}
            {noSlotsAtAll && (
              <div className="mt-6 panel p-5 md:p-6">
                <h3 className="text-xl font-semibold">{t.noSlotsTitle}</h3>
                <p className="mt-1 text-muted">{t.noSlotsText}</p>
                <CallbackForm lang={lang} t={t} v={v} phone={phone} />
              </div>
            )}
            {avail.status === "ready" && !noSlotsAtAll && (
              <div className="mt-6 grid gap-8 md:grid-cols-2">
                <Calendar
                  available={avail.starts}
                  from={avail.from}
                  to={avail.to}
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    setTime(null);
                    setErrors({});
                  }}
                  localeTag={localeTag}
                  days={days}
                  labels={{ prev: t.prevMonth, next: t.nextMonth, legend: t.legendFree }}
                />
                <div>
                  <h3 className="font-semibold">{t.pickTime}</h3>
                  {!date ? (
                    <p className="mt-2 text-muted">{t.pickDateFirst}</p>
                  ) : (
                    <>
                      <p className="mt-1 text-sm capitalize text-muted">{fullDate(date)}</p>
                      {(avail.starts[date] ?? []).length ? (
                        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-3" role="radiogroup" aria-label={t.pickTime}>
                          {avail.starts[date].map((tm) => (
                            <button
                              key={tm}
                              type="button"
                              role="radio"
                              aria-checked={tm === time}
                              onClick={() => {
                                setTime(tm);
                                setErrors({});
                              }}
                              className={`min-h-12 rounded-sm border font-mono transition-colors ${tm === time ? "border-accent bg-accent text-on-accent" : "border-line-strong hover:border-accent"}`}
                            >
                              {tm}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-muted">{t.noTimesThisDay}</p>
                      )}
                    </>
                  )}
                  {errors.slot && <p className="field-error">{msg(errors.slot)}</p>}
                </div>
              </div>
            )}
            {avail.status === "ready" && !noSlotsAtAll && (
              <details className="mt-10 border-t border-line pt-5">
                <summary className="cursor-pointer text-muted hover:text-fg">{t.callbackLink}</summary>
                <CallbackForm lang={lang} t={t} v={v} phone={phone} />
              </details>
            )}
          </section>
        )}

        {/* Step 3: car */}
        {step === 2 && (
          <fieldset className="animate-rise">
            <legend className="text-2xl font-bold">{t.carTitle}</legend>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field id="car_make" label={t.carMake} error={msg(errors.car_make)}>
                <input id="car_make" className="field" autoComplete="off" placeholder={t.carMakePh} value={car.car_make} onChange={(e) => setCar({ ...car, car_make: e.target.value })} aria-invalid={!!errors.car_make} required />
              </Field>
              <Field id="car_model" label={t.carModel} error={msg(errors.car_model)}>
                <input id="car_model" className="field" autoComplete="off" placeholder={t.carModelPh} value={car.car_model} onChange={(e) => setCar({ ...car, car_model: e.target.value })} aria-invalid={!!errors.car_model} required />
              </Field>
              <Field id="car_year" label={t.carYear} optional={common.optional} error={msg(errors.car_year)}>
                <input id="car_year" className="field font-mono" inputMode="numeric" maxLength={4} placeholder="2016" value={car.car_year} onChange={(e) => setCar({ ...car, car_year: e.target.value.replace(/\D/g, "") })} aria-invalid={!!errors.car_year} />
              </Field>
              <Field id="plate" label={t.plate} optional={common.optional} error={msg(errors.plate)}>
                <input id="plate" className="field font-mono uppercase" autoComplete="off" maxLength={15} placeholder={t.platePh} value={car.plate} onChange={(e) => setCar({ ...car, plate: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field id="comment" label={t.comment} error={msg(errors.comment)}>
                  <textarea id="comment" className="field min-h-32" rows={4} maxLength={2000} placeholder={t.commentPh} value={car.comment} onChange={(e) => setCar({ ...car, comment: e.target.value })} />
                </Field>
              </div>
            </div>
          </fieldset>
        )}

        {/* Step 4: contact */}
        {step === 3 && (
          <form id="contact-form" onSubmit={submit} noValidate className="animate-rise">
            <fieldset>
              <legend className="text-2xl font-bold">{t.contactTitle}</legend>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field id="name" label={t.name} error={msg(errors.name)}>
                  <input id="name" className="field" autoComplete="name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} aria-invalid={!!errors.name} required />
                </Field>
                <Field id="phone" label={t.phone} error={msg(errors.phone)}>
                  <input id="phone" type="tel" className="field font-mono" autoComplete="tel" inputMode="tel" placeholder={t.phonePh} value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} aria-invalid={!!errors.phone} required />
                </Field>
                <div className="sm:col-span-2">
                  <Field id="email" label={t.email} optional={common.optional} hint={t.emailHint} error={msg(errors.email)}>
                    <input id="email" type="email" className="field" autoComplete="email" inputMode="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} aria-invalid={!!errors.email} />
                  </Field>
                </div>
              </div>
              {/* Honeypot: hidden from people, bots fill it in. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="website">Website</label>
                <input id="website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <label className="mt-6 flex cursor-pointer gap-3">
                <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--accent)]" checked={contact.consent} onChange={(e) => setContact({ ...contact, consent: e.target.checked })} aria-invalid={!!errors.consent} />
                <span className="text-muted">
                  {t.consent.split("{privacy}")[0]}
                  <a href={privacyHref} target="_blank" className="link text-fg">
                    {t.consentLink}
                  </a>
                  {t.consent.split("{privacy}")[1]}
                </span>
              </label>
              {errors.consent && <p className="field-error">{msg(errors.consent)}</p>}
            </fieldset>
          </form>
        )}

        {/* Actions: sticky at the bottom on phones */}
        {!(step === 1 && noSlotsAtAll) && (
          <div className="sticky bottom-0 z-10 -mx-5 mt-8 flex items-center gap-3 border-t border-line bg-ink/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            {step > 0 && (
              <button type="button" className="btn btn-secondary" onClick={() => go(step - 1)}>
                <Icon name="chevronLeft" size={18} />
                <span className="sr-only sm:not-sr-only">{common.back}</span>
              </button>
            )}
            <div className="min-w-0 flex-1 text-sm lg:hidden">
              {totalMin > 0 && <p className="truncate font-mono text-muted">{fill(t.totalDuration, { d: duration(totalMin, common) })}</p>}
              {date && time && step > 1 && <p className="truncate font-mono capitalize">{`${new Intl.DateTimeFormat(localeTag, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))} ${time}`}</p>}
            </div>
            {step < 3 ? (
              <button type="button" className="btn btn-primary ml-auto min-w-32" onClick={next} disabled={step === 1 && avail.status !== "ready"}>
                {common.next}
              </button>
            ) : (
              <button type="submit" form="contact-form" className="btn btn-primary ml-auto min-w-40" disabled={submitting}>
                {submitting ? t.submitting : t.submit}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Job ticket summary (desktop) */}
      <aside className="hidden lg:col-span-4 lg:block">
        <div className="panel sticky top-24 p-5">
          <p className="eyebrow">{t.summary}</p>
          {chosenServices.length ? (
            <ul className="mt-3 divide-y divide-line">
              {chosenServices.map((s) => (
                <li key={s.id} className="flex justify-between gap-3 py-2.5">
                  <span>{s.name}</span>
                  <span className="shrink-0 font-mono text-sm text-muted">{duration(s.duration, common)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-faint">{t.chooseServicesHint}</p>
          )}
          {totalMin > 0 && (
            <div className="mt-2 flex justify-between border-t border-line-strong pt-3 font-mono text-sm">
              <span>{fill(t.totalDuration, { d: duration(totalMin, common) })}</span>
              {priceFrom > 0 && <span>{fill(common.priceFrom, { p: money(priceFrom) })}</span>}
            </div>
          )}
          {date && time && (
            <p className="mt-4 border-t border-line pt-4 font-mono">
              <span className="capitalize">{fullDate(date)}</span>
              <br />
              <span className="text-2xl text-accent">{time}</span>
            </p>
          )}
          <a href={phone.href} className="mt-5 flex min-h-11 items-center gap-2 border-t border-line pt-4 text-sm text-muted hover:text-fg">
            <Icon name="phone" size={16} />
            <span className="font-mono">{phone.display}</span>
          </a>
        </div>
      </aside>
    </div>
  );
}

function Field({ id, label, optional, hint, error, children }: { id: string; label: string; optional?: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {optional && <span className="ml-1.5 font-normal text-faint">({optional})</span>}
      </label>
      {children}
      {error ? (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}
