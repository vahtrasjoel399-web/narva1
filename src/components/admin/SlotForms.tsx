"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateShort, formatMonth } from "@/lib/format";
import { slotsForDates, weeklyDates, type SlotPattern } from "@/lib/slot-gen";
import { addDays, addMonths, monthGrid, shopNow, startOfMonth, type ISODate } from "@/lib/time";
import { copySlots, createSlots } from "@/app/admin/actions";
import { useAdmin } from "./AdminI18n";
import { Field, Sheet, Spinner, useToast } from "./ui";

const PATTERN_KEY = "admin_slot_pattern";
const defaultPattern: SlotPattern & { lunch: boolean } = {
  start: "09:00",
  end: "17:00",
  lengthMin: 60,
  parallel: 1,
  lunch: true,
  lunchFrom: "12:00",
  lunchTo: "13:00",
};

function usePattern() {
  const [p, setP] = useState(defaultPattern);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PATTERN_KEY);
      // Restores the last-used pattern (browser-only) after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setP({ ...defaultPattern, ...JSON.parse(saved) });
    } catch {
      // ignore
    }
  }, []);
  const save = (next: typeof defaultPattern) => {
    setP(next);
    try {
      localStorage.setItem(PATTERN_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };
  return [p, save] as const;
}

function PatternFields({ p, onChange }: { p: typeof defaultPattern; onChange: (p: typeof defaultPattern) => void }) {
  const { d } = useAdmin();
  const f = d.calendar.form;
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={f.start}>
        <input type="time" className="input" step={300} value={p.start} onChange={(e) => onChange({ ...p, start: e.target.value })} />
      </Field>
      <Field label={f.end}>
        <input type="time" className="input" step={300} value={p.end} onChange={(e) => onChange({ ...p, end: e.target.value })} />
      </Field>
      <Field label={f.length}>
        <select className="input" value={p.lengthMin} onChange={(e) => onChange({ ...p, lengthMin: Number(e.target.value) })}>
          {[30, 45, 60, 90, 120].map((m) => (
            <option key={m} value={m}>
              {m} {d.common.minutes}
            </option>
          ))}
        </select>
      </Field>
      <Field label={f.parallel}>
        <select className="input" value={p.parallel} onChange={(e) => onChange({ ...p, parallel: Number(e.target.value) })}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </Field>
      <label className="col-span-2 flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-850 px-3 py-3">
        <input type="checkbox" className="size-5 accent-[var(--color-accent-500)]" checked={p.lunch} onChange={(e) => onChange({ ...p, lunch: e.target.checked })} />
        <span className="font-semibold text-ink-100">{f.lunch}</span>
      </label>
      {p.lunch && (
        <>
          <Field label={f.lunchFrom}>
            <input type="time" className="input" step={300} value={p.lunchFrom} onChange={(e) => onChange({ ...p, lunchFrom: e.target.value })} />
          </Field>
          <Field label={f.lunchTo}>
            <input type="time" className="input" step={300} value={p.lunchTo} onChange={(e) => onChange({ ...p, lunchTo: e.target.value })} />
          </Field>
        </>
      )}
    </div>
  );
}

function toPayload(p: typeof defaultPattern, dates: ISODate[]) {
  return {
    dates,
    start: p.start,
    end: p.end,
    lengthMin: p.lengthMin,
    parallel: p.parallel,
    ...(p.lunch && p.lunchFrom && p.lunchTo ? { lunchFrom: p.lunchFrom, lunchTo: p.lunchTo } : {}),
  };
}

function useSubmit(onDone: () => void) {
  const { d, t } = useAdmin();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const submit = async (fn: () => ReturnType<typeof createSlots>) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (!r.ok) return toast({ kind: "error", text: d.common.error });
    toast({
      kind: "ok",
      text: t(d.calendar.form.created, { n: r.data.created }) + (r.data.skipped ? ` · ${t(d.calendar.form.skipped, { n: r.data.skipped })}` : ""),
    });
    onDone();
  };
  return { busy, submit };
}

// ─── Add slots for one or more specific days ────────────────────────────────
export function AddSlotsSheet({ open, onClose, date, onDone }: { open: boolean; onClose: () => void; date: ISODate; onDone: () => void }) {
  const { d, lang, t } = useAdmin();
  const [p, setP] = usePattern();
  const [dates, setDates] = useState<ISODate[]>([date]);
  const { busy, submit } = useSubmit(() => {
    onDone();
    onClose();
  });
  useEffect(() => {
    // Reset the target day each time the sheet opens for a different day.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setDates([date]);
  }, [open, date]);

  const count = useMemo(() => slotsForDates(dates, toPayload(p, dates)).length, [p, dates]);
  const invalid = p.end <= p.start;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={d.calendar.addSlots}
      footer={
        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={busy || invalid || count === 0}
          onClick={() => submit(() => createSlots(toPayload(p, dates)))}
        >
          {busy && <Spinner />} {d.calendar.form.create} · {count}
        </button>
      }
    >
      <p className="mb-2 field-label">{d.calendar.form.dates}</p>
      <MultiDatePicker selected={dates} onChange={setDates} initialMonth={date} />
      <p className="mb-4 mt-2 text-sm text-ink-400">{dates.map((x) => formatDateShort(x, lang)).join(", ")}</p>
      <PatternFields p={p} onChange={setP} />
      {invalid ? (
        <p className="field-error mt-3">{d.calendar.form.invalid}</p>
      ) : (
        <p className="mt-4 text-sm font-semibold text-ink-300">{t(d.calendar.form.preview, { n: count })}</p>
      )}
    </Sheet>
  );
}

// ─── Bulk: every Mon–Fri … for N weeks ──────────────────────────────────────
export function BulkSlotsSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { d, t } = useAdmin();
  const letters = useWeekdayLetters();
  const [p, setP] = usePattern();
  const [from, setFrom] = useState(() => addDays(shopNow().date, 1));
  const [weeks, setWeeks] = useState(4);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const { busy, submit } = useSubmit(() => {
    onDone();
    onClose();
  });

  const dates = useMemo(() => weeklyDates(from, weeks, weekdays), [from, weeks, weekdays]);
  const count = useMemo(() => slotsForDates(dates, toPayload(p, dates)).length, [p, dates]);
  const invalid = p.end <= p.start;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={d.calendar.bulkAdd}
      footer={
        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={busy || invalid || count === 0}
          onClick={() => submit(() => createSlots(toPayload(p, dates)))}
        >
          {busy && <Spinner />} {d.calendar.form.create} · {count}
        </button>
      }
    >
      <p className="field-label">{d.calendar.form.weekdays}</p>
      <div className="mb-4 grid grid-cols-7 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const on = weekdays.includes(day);
            return (
              <button
                key={day}
                type="button"
                aria-pressed={on}
                onClick={() => setWeekdays(on ? weekdays.filter((x) => x !== day) : [...weekdays, day].sort())}
                className={`rounded-xl border py-2.5 text-sm font-bold ${
                  on ? "border-accent-500 bg-accent-500 text-ink-950" : "border-ink-700 bg-ink-850 text-ink-300"
                }`}
              >
                {letters[day - 1]}
              </button>
            );
          })}
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Field label={d.calendar.form.fromDate}>
          <input type="date" className="input" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        </Field>
        <Field label={d.calendar.form.weeks}>
          <select className="input" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <PatternFields p={p} onChange={setP} />
      {invalid ? (
        <p className="field-error mt-3">{d.calendar.form.invalid}</p>
      ) : (
        <p className="mt-4 text-sm font-semibold text-ink-300">{t(d.calendar.form.preview, { n: count })}</p>
      )}
    </Sheet>
  );
}

const weekdayLetters: Record<string, string[]> = {
  ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
  et: ["E", "T", "K", "N", "R", "L", "P"],
  en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
};
export function useWeekdayLetters() {
  const { lang } = useAdmin();
  return weekdayLetters[lang];
}

// ─── Copy a day to dates / a week to following weeks ───────────────────────
export function CopySheet({ open, onClose, source, onDone }: { open: boolean; onClose: () => void; source: ISODate; onDone: () => void }) {
  const { d, lang, t } = useAdmin();
  const toast = useToast();
  const [mode, setMode] = useState<"day" | "week">("day");
  const [targets, setTargets] = useState<ISODate[]>([]);
  const [weeks, setWeeks] = useState(1);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setTargets([]);
  }, [open, source]);

  const go = async () => {
    setBusy(true);
    const r = await copySlots({ mode, source, targets, weeks });
    setBusy(false);
    if (!r.ok) return toast({ kind: "error", text: d.common.error });
    toast({ kind: "ok", text: t(d.calendar.copyForm.done, { n: r.data.created }) });
    onDone();
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={d.calendar.copyForm.title}
      footer={
        <button type="button" className="btn btn-primary w-full" disabled={busy || (mode === "day" && targets.length === 0)} onClick={go}>
          {busy && <Spinner />} {d.calendar.copyForm.submit}
        </button>
      }
    >
      <p className="field-label">{d.calendar.copyForm.mode}</p>
      <div className="mb-5 grid grid-cols-2 gap-2">
        {(["day", "week"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-xl border px-3 py-3 text-sm font-bold ${
              mode === m ? "border-accent-500 bg-accent-500/15 text-white" : "border-ink-700 bg-ink-850 text-ink-300"
            }`}
          >
            {t(m === "day" ? d.calendar.copyForm.day : d.calendar.copyForm.week, { date: formatDateShort(source, lang) })}
          </button>
        ))}
      </div>
      {mode === "day" ? (
        <>
          <p className="field-label">{d.calendar.copyForm.target}</p>
          <MultiDatePicker selected={targets} onChange={setTargets} initialMonth={source} exclude={source} />
          <p className="mt-2 text-sm text-ink-400">{targets.map((x) => formatDateShort(x, lang)).join(", ")}</p>
        </>
      ) : (
        <Field label={`${d.calendar.copyForm.times} (${d.calendar.copyForm.nextWeeks})`}>
          <select className="input" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
            {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
      )}
    </Sheet>
  );
}

// ─── Multi-date picker ──────────────────────────────────────────────────────
export function MultiDatePicker({ selected, onChange, initialMonth, exclude }: {
  selected: ISODate[];
  onChange: (dates: ISODate[]) => void;
  initialMonth: ISODate;
  exclude?: ISODate;
}) {
  const { d, lang } = useAdmin();
  const letters = useWeekdayLetters();
  const [month, setMonth] = useState(startOfMonth(initialMonth));
  const today = shopNow().date;
  const grid = monthGrid(month);
  const toggle = (date: ISODate) =>
    onChange(selected.includes(date) ? selected.filter((x) => x !== date) : [...selected, date].sort());

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-850 p-3">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className="btn btn-ghost btn-sm !px-2" onClick={() => setMonth(addMonths(month, -1))} aria-label={d.calendar.prev}>
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <span className="text-sm font-bold first-letter:uppercase text-white">{formatMonth(month, lang)}</span>
        <button type="button" className="btn btn-ghost btn-sm !px-2" onClick={() => setMonth(addMonths(month, 1))} aria-label={d.calendar.next}>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[0.6875rem] font-bold text-ink-500">
        {letters.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {grid.map((date) => {
          const inMonth = date.slice(0, 7) === month.slice(0, 7);
          const on = selected.includes(date);
          const disabled = date < today || date === exclude;
          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              aria-pressed={on}
              onClick={() => toggle(date)}
              className={`aspect-square rounded-lg text-sm font-semibold tabular-nums transition-colors ${
                on
                  ? "bg-accent-500 text-ink-950"
                  : disabled
                    ? "text-ink-700"
                    : inMonth
                      ? "text-ink-100 hover:bg-ink-750"
                      : "text-ink-500 hover:bg-ink-750"
              }`}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
