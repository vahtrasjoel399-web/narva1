"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarCheck, Car, Check, Clock, Mail, PhoneCall, RefreshCw } from "lucide-react";
import type { Lang } from "@/config/site";
import type { Dictionary } from "@/i18n";
import { t } from "@/i18n/config";
import { formatDateLong, formatDuration, formatPrice } from "@/lib/format";
import type { Service } from "@/lib/types";
import { carSchema, contactSchema, fieldErrors, MIN_CAR_YEAR, maxCarYear } from "@/lib/validation";
import { ServiceIcon } from "@/components/icons";
import { BookingCalendar } from "./BookingCalendar";
import { CallbackForm } from "./CallbackForm";

type Availability = { durationMin: number; days: Record<string, string[]> };
type Success = { number: number; date: string; time: string; manageToken: string; email: string | null };

export type BookingWizardProps = {
  lang: Lang;
  services: Service[];
  b: Dictionary["booking"];
  common: Dictionary["common"];
  phone: { display: string; href: string };
  privacyHref: string;
};

const STEPS = 4;

export function BookingWizard({ lang, services, b, common, phone, privacyHref }: BookingWizardProps) {
  const params = useSearchParams();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>(() => {
    const pre = params.get("service");
    return pre && services.some((s) => s.id === pre) ? [pre] : [];
  });
  const [avail, setAvail] = useState<Availability | null>(null);
  const [availError, setAvailError] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [car, setCar] = useState({ carMake: "", carModel: "", carYear: "", plate: "", comment: "" });
  const [contact, setContact] = useState({ name: "", phone: "", email: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<Success | null>(null);
  const [showCallback, setShowCallback] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const chosen = useMemo(() => services.filter((s) => selected.includes(s.id)), [services, selected]);
  const duration = chosen.reduce((sum, s) => sum + s.durationMin, 0);
  const price = chosen.reduce((sum, s) => sum + s.priceFrom, 0);

  const loadAvailability = useCallback(async () => {
    if (selected.length === 0) return;
    setAvail(null);
    setAvailError(false);
    try {
      const res = await fetch(`/api/availability?services=${selected.join(",")}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setAvail((await res.json()) as Availability);
    } catch {
      setAvailError(true);
    }
  }, [selected]);

  useEffect(() => {
    if (step !== 1) return;
    // Fetch fresh availability every time the time step is shown.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAvailability();
  }, [step, loadAvailability]);

  // Drop a chosen date/time that is no longer offered after a refresh.
  useEffect(() => {
    if (!avail || !date) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!avail.days[date]) setDate(null);
    else if (time && !avail.days[date].includes(time)) setTime(null);
  }, [avail, date, time]);

  const go = (next: number) => {
    setStep(next);
    setErrors({});
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const errorText = (code?: string) =>
    !code
      ? undefined
      : code === "year"
        ? t(b.errors.year, { min: MIN_CAR_YEAR, max: maxCarYear() })
        : ((b.errors as Record<string, string>)[code] ?? b.errors.required);

  const nextFromCar = () => {
    const r = carSchema.safeParse(car);
    if (!r.success) return setErrors(fieldErrors(r.error));
    go(3);
  };

  const submit = async () => {
    const r = contactSchema.safeParse(contact);
    if (!r.success) return setErrors(fieldErrors(r.error));
    if (!date || !time) return go(1);
    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceIds: selected, date, time, lang, ...car, ...contact }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201) {
        setSuccess(data as Success);
        requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
        return;
      }
      if (res.status === 409) {
        // Someone else just took this time: refresh the list and send the customer back to pick again.
        setTime(null);
        setNotice(b.errors.slotTaken);
        go(1);
        return;
      }
      if (res.status === 429) return setErrors({ _: b.errors.rateLimited });
      if (res.status === 422 && data.fields) return setErrors({ ...data.fields, _: b.errors.generic });
      setErrors({ _: b.errors.generic });
    } catch {
      setErrors({ _: b.errors.generic });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    const manage = `/${lang}/booking/manage/${success.manageToken}`;
    return (
      <div ref={topRef} className="scroll-mt-24">
        <div className="card overflow-hidden animate-pop">
          <div className="flex flex-col items-center gap-3 bg-gradient-to-b from-ok-500/15 to-transparent px-6 pb-6 pt-10 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-ok-500 text-ink-950">
              <Check size={34} strokeWidth={3} aria-hidden="true" />
            </span>
            <h2 className="text-3xl font-extrabold text-white" role="status">
              {b.success.title}
            </h2>
            <p className="text-lg text-ink-200">{t(b.success.text, { date: formatDateLong(success.date, lang), time: success.time })}</p>
            <p className="mt-1 rounded-xl border border-ink-700 bg-ink-900 px-4 py-2 font-display text-xl font-extrabold text-white">
              {b.success.number} #{success.number}
            </p>
          </div>
          <div className="flex flex-col gap-5 px-6 pb-7">
            <p className="flex items-start gap-2 text-ink-300">
              <Mail size={18} className="mt-0.5 shrink-0 text-accent-400" aria-hidden="true" />
              {success.email ? t(b.success.emailSent, { email: success.email }) : b.success.noEmail}
            </p>
            <Link href={manage} className="btn btn-secondary">
              {b.success.manage}
            </Link>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">{b.success.next}</h3>
              <ol className="mt-3 flex flex-col gap-3">
                {b.success.nextSteps.map((s, i) => (
                  <li key={s} className="flex gap-3 text-ink-200">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink-750 text-sm font-bold text-accent-400">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
            <Link href={`/${lang}`} className="btn btn-ghost">
              {b.success.home}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const noSlotsAtAll = avail && Object.keys(avail.days).length === 0;

  return (
    <div ref={topRef} className="scroll-mt-24">
      {/* Stepper */}
      <nav aria-label={t(b.stepOf, { n: step + 1, total: STEPS })} className="mb-6">
        <p className="mb-3 text-sm font-semibold text-ink-400">{t(b.stepOf, { n: step + 1, total: STEPS })}</p>
        <ol className="grid grid-cols-4 gap-2">
          {b.steps.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                disabled={i >= step}
                onClick={() => go(i)}
                aria-current={i === step ? "step" : undefined}
                className="group flex w-full flex-col gap-2 text-left disabled:cursor-default"
              >
                <span className={`h-1.5 rounded-full transition-colors ${i <= step ? "bg-accent-500" : "bg-ink-750"}`} />
                <span className={`text-xs font-bold sm:text-sm ${i === step ? "text-white" : i < step ? "text-ink-300 group-hover:text-white" : "text-ink-500"}`}>
                  {label}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* Step 1: services */}
      {step === 0 && (
        <section aria-labelledby="step-service" className="animate-fade-in">
          <h2 id="step-service" className="text-2xl font-extrabold text-white">
            {b.service.title}
          </h2>
          <p className="mt-1 text-ink-400">{b.service.hint}</p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {services.map((s) => {
              const on = selected.includes(s.id);
              return (
                <li key={s.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-colors ${
                      on ? "border-accent-500 bg-accent-500/10" : "border-ink-700 bg-ink-850 hover:border-ink-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={() => {
                        setSelected(on ? selected.filter((x) => x !== s.id) : [...selected, s.id]);
                        setDate(null);
                        setTime(null);
                      }}
                    />
                    <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${on ? "bg-accent-500 text-ink-950" : "bg-ink-750 text-accent-400"}`}>
                      {on ? <Check size={22} strokeWidth={3} aria-hidden="true" /> : <ServiceIcon name={s.icon} size={22} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-white">{s.name[lang]}</span>
                      <span className="block text-sm text-ink-400">
                        ~{formatDuration(s.durationMin, lang)} · {t(common.priceFrom, { price: formatPrice(s.priceFrom, lang) })}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <StepFooter>
            <p className="text-sm font-semibold text-ink-300" aria-live="polite">
              {selected.length
                ? t(b.service.total, { duration: formatDuration(duration, lang), price: formatPrice(price, lang) })
                : b.service.noneSelected}
            </p>
            <button type="button" className="btn btn-primary" disabled={selected.length === 0} onClick={() => go(1)}>
              {common.next} <ArrowRight size={18} aria-hidden="true" />
            </button>
          </StepFooter>
        </section>
      )}

      {/* Step 2: date & time */}
      {step === 1 && (
        <section aria-labelledby="step-time" className="animate-fade-in">
          <h2 id="step-time" className="text-2xl font-extrabold text-white">
            {b.time.title}
          </h2>
          <p className="mt-1 text-ink-400">{t(b.time.hint, { duration: formatDuration(duration, lang) })}</p>

          {notice && (
            <p role="alert" className="mt-4 rounded-2xl border border-warn-400/40 bg-warn-400/10 p-4 font-semibold text-warn-400">
              {notice}
            </p>
          )}

          {availError ? (
            <div className="mt-6 flex flex-col items-start gap-3">
              <p className="field-error">{b.time.loadError}</p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={loadAvailability}>
                <RefreshCw size={16} aria-hidden="true" /> {common.retry}
              </button>
            </div>
          ) : !avail ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]" aria-busy="true">
              <div className="skeleton h-80" />
              <p className="text-ink-400">{b.time.loading}</p>
            </div>
          ) : noSlotsAtAll ? (
            <div className="mt-6 card p-6">
              <h3 className="text-xl font-bold text-white">{b.empty.title}</h3>
              <p className="mt-2 text-ink-300">{b.empty.text}</p>
              <div className="mt-5">
                <CallbackForm lang={lang} labels={b.callback} errors={b.errors} />
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
              <BookingCalendar
                lang={lang}
                available={avail.days}
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  setTime(null);
                  setNotice(null);
                }}
                labels={{ prev: b.time.prevMonth, next: b.time.nextMonth, dayAvailable: b.time.dayAvailable, dayUnavailable: b.time.dayUnavailable }}
                weekdays={common.weekdaysShort}
              />
              <div>
                {!date ? (
                  <p className="rounded-2xl border border-dashed border-ink-700 p-6 text-center text-ink-400">{b.time.pickDate}</p>
                ) : (
                  <fieldset>
                    <legend className="mb-3 font-bold text-white">{t(b.time.freeTimes, { date: formatDateLong(date, lang) })}</legend>
                    {(avail.days[date] ?? []).length === 0 ? (
                      <p className="text-ink-400">{b.time.noTimes}</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {avail.days[date].map((x) => (
                          <button
                            key={x}
                            type="button"
                            aria-pressed={time === x}
                            onClick={() => {
                              setTime(x);
                              setNotice(null);
                            }}
                            className={`min-h-12 rounded-xl border text-base font-bold tabular-nums transition-colors ${
                              time === x
                                ? "border-accent-500 bg-accent-500 text-ink-950"
                                : "border-ink-700 bg-ink-850 text-ink-100 hover:border-accent-500/60"
                            }`}
                          >
                            {x}
                          </button>
                        ))}
                      </div>
                    )}
                  </fieldset>
                )}
                <div className="mt-6 rounded-2xl border border-ink-800 p-4">
                  <p className="text-sm text-ink-400">{b.callback.alt}</p>
                  {showCallback ? (
                    <div className="mt-3">
                      <CallbackForm lang={lang} labels={b.callback} errors={b.errors} />
                    </div>
                  ) : (
                    <button type="button" className="mt-1 inline-flex items-center gap-2 font-semibold text-accent-400 underline-offset-2 hover:underline" onClick={() => setShowCallback(true)}>
                      <PhoneCall size={16} aria-hidden="true" /> {b.callback.altLink}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <StepFooter>
            <button type="button" className="btn btn-ghost" onClick={() => go(0)}>
              <ArrowLeft size={18} aria-hidden="true" /> {common.back}
            </button>
            <button type="button" className="btn btn-primary" disabled={!date || !time} onClick={() => go(2)}>
              {common.next} <ArrowRight size={18} aria-hidden="true" />
            </button>
          </StepFooter>
        </section>
      )}

      {/* Step 3: car */}
      {step === 2 && (
        <section aria-labelledby="step-car" className="animate-fade-in">
          <h2 id="step-car" className="text-2xl font-extrabold text-white">
            {b.car.title}
          </h2>
          <Summary lang={lang} b={b} chosen={chosen} date={date} time={time} duration={duration} onChange={go} />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <TextField id="carMake" label={b.car.make} value={car.carMake} placeholder={b.car.makePlaceholder} error={errorText(errors.carMake)} autoComplete="off" onChange={(v) => setCar({ ...car, carMake: v })} />
            <TextField id="carModel" label={b.car.model} value={car.carModel} placeholder={b.car.modelPlaceholder} error={errorText(errors.carModel)} autoComplete="off" onChange={(v) => setCar({ ...car, carModel: v })} />
            <TextField id="carYear" label={b.car.year} optional={common.optional} value={car.carYear} inputMode="numeric" maxLength={4} error={errorText(errors.carYear)} onChange={(v) => setCar({ ...car, carYear: v.replace(/\D/g, "") })} />
            <TextField id="plate" label={b.car.plate} optional={common.optional} value={car.plate} error={errorText(errors.plate)} autoComplete="off" onChange={(v) => setCar({ ...car, plate: v.toUpperCase() })} />
            <div className="sm:col-span-2">
              <label htmlFor="comment" className="field-label">
                {b.car.message}
              </label>
              <textarea
                id="comment"
                className="input"
                rows={4}
                maxLength={2000}
                placeholder={b.car.messagePlaceholder}
                value={car.comment}
                onChange={(e) => setCar({ ...car, comment: e.target.value })}
              />
            </div>
          </div>
          <StepFooter>
            <button type="button" className="btn btn-ghost" onClick={() => go(1)}>
              <ArrowLeft size={18} aria-hidden="true" /> {common.back}
            </button>
            <button type="button" className="btn btn-primary" onClick={nextFromCar}>
              {common.next} <ArrowRight size={18} aria-hidden="true" />
            </button>
          </StepFooter>
        </section>
      )}

      {/* Step 4: contact */}
      {step === 3 && (
        <section aria-labelledby="step-contact" className="animate-fade-in">
          <h2 id="step-contact" className="text-2xl font-extrabold text-white">
            {b.contact.title}
          </h2>
          <Summary lang={lang} b={b} chosen={chosen} date={date} time={time} duration={duration} car={car} onChange={go} />
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <TextField id="name" label={b.contact.name} value={contact.name} autoComplete="name" error={errorText(errors.name)} onChange={(v) => setContact({ ...contact, name: v })} />
            <TextField id="phone" label={b.contact.phone} type="tel" value={contact.phone} autoComplete="tel" inputMode="tel" hint={b.contact.phoneHint} error={errorText(errors.phone)} onChange={(v) => setContact({ ...contact, phone: v })} />
            <div className="sm:col-span-2">
              <TextField id="email" label={b.contact.email} optional={common.optional} type="email" value={contact.email} autoComplete="email" inputMode="email" hint={b.contact.emailHint} error={errorText(errors.email)} onChange={(v) => setContact({ ...contact, email: v })} />
            </div>
            {/* Honeypot: hidden from people, tempting for bots. */}
            <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
              <label htmlFor="website">Website</label>
              <input id="website" name="website" tabIndex={-1} autoComplete="off" value={contact.website} onChange={(e) => setContact({ ...contact, website: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink-700 bg-ink-850 p-4">
                <input
                  type="checkbox"
                  className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent-500)]"
                  checked={contact.consent}
                  aria-invalid={!!errors.consent}
                  aria-describedby={errors.consent ? "consent-error" : undefined}
                  onChange={(e) => setContact({ ...contact, consent: e.target.checked })}
                />
                <span className="text-sm leading-relaxed text-ink-200">
                  {b.contact.consent}{" "}
                  <Link href={privacyHref} target="_blank" className="font-semibold text-accent-400 underline underline-offset-2">
                    {b.contact.consentLink}
                  </Link>
                  .
                </span>
              </label>
              {errors.consent && (
                <p id="consent-error" className="field-error">
                  {errorText(errors.consent)}
                </p>
              )}
            </div>
            {errors._ && (
              <p role="alert" className="rounded-2xl border border-bad-500/40 bg-bad-500/10 p-4 font-semibold text-bad-400 sm:col-span-2">
                {errors._}{" "}
                <a href={phone.href} className="underline">
                  {phone.display}
                </a>
              </p>
            )}
            <StepFooter className="sm:col-span-2">
              <button type="button" className="btn btn-ghost" onClick={() => go(2)}>
                <ArrowLeft size={18} aria-hidden="true" /> {common.back}
              </button>
              <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                {submitting ? b.contact.submitting : b.contact.submit}
                {!submitting && <CalendarCheck size={19} aria-hidden="true" />}
              </button>
            </StepFooter>
          </form>
        </section>
      )}
    </div>
  );
}

function StepFooter({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`sticky bottom-0 z-10 -mx-5 mt-8 flex items-center justify-between gap-3 border-t border-ink-800 bg-ink-950/95 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:backdrop-blur-none ${className}`}
    >
      {children}
    </div>
  );
}

function Summary({ lang, b, chosen, date, time, duration, car, onChange }: {
  lang: Lang;
  b: Dictionary["booking"];
  chosen: Service[];
  date: string | null;
  time: string | null;
  duration: number;
  car?: { carMake: string; carModel: string; carYear: string; plate: string };
  onChange: (step: number) => void;
}) {
  const rows: Array<{ icon: typeof Clock; label: string; value: string; step: number }> = [
    { icon: Check, label: b.summary.services, value: chosen.map((s) => s.name[lang]).join(", "), step: 0 },
    {
      icon: Clock,
      label: b.summary.when,
      value: date && time ? `${formatDateLong(date, lang)}, ${time} · ~${formatDuration(duration, lang)}` : "—",
      step: 1,
    },
  ];
  if (car) rows.push({ icon: Car, label: b.summary.car, value: [car.carMake, car.carModel, car.carYear, car.plate].filter(Boolean).join(" "), step: 2 });
  return (
    <dl className="mt-4 divide-y divide-ink-800 rounded-2xl border border-ink-700 bg-ink-850">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 px-4 py-3">
          <r.icon size={18} className="shrink-0 text-accent-400" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <dt className="text-xs font-bold uppercase tracking-wide text-ink-500">{r.label}</dt>
            <dd className="truncate font-semibold text-ink-100">{r.value}</dd>
          </div>
          <button type="button" className="text-sm font-semibold text-accent-400 hover:underline" onClick={() => onChange(r.step)}>
            {b.summary.change}
            <span className="sr-only"> — {r.label}</span>
          </button>
        </div>
      ))}
    </dl>
  );
}

function TextField({ id, label, value, onChange, error, hint, optional, ...rest }: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  optional?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label} {optional && <span className="font-normal text-ink-500">({optional})</span>}
      </label>
      <input
        id={id}
        name={id}
        className="input"
        value={value}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
