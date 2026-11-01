"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { AdminDictionary } from "@/i18n/admin";
import { addSlots, copyDay, copyWeek, setDayClosed, updateSlots, type ActionResult } from "@/app/admin/actions";
import { Icon } from "@/components/ui/icon";

export type AdminSlot = {
  id: string;
  date: string;
  start: string;
  end: string;
  bay: number;
  status: "free" | "booked" | "blocked";
  bookingId: string | null;
  bookingLabel: string | null;
};

type Props = {
  view: "month" | "week";
  anchor: string;
  from: string;
  to: string;
  today: string;
  sel: string | null;
  slots: AdminSlot[];
  t: AdminDictionary;
  localeTag: string;
  days: string[];
};

const pad = (n: number) => String(n).padStart(2, "0");
function addDays(d: string, n: number) {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
function rangeDays(from: string, to: string) {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

const statusStyle = {
  free: "border-ok/50 bg-ok/10 text-ok",
  booked: "border-accent/60 bg-accent/15 text-accent",
  blocked: "border-line-strong text-faint hatch",
} as const;

export function AvailabilityCalendar({ view, anchor, from, to, today, sel, slots, t, localeTag, days }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulk, setShowBulk] = useState(false);
  const tc = t.calendar;

  const byDate = useMemo(() => {
    const m = new Map<string, AdminSlot[]>();
    for (const s of slots) m.set(s.date, [...(m.get(s.date) ?? []), s]);
    return m;
  }, [slots]);

  const url = (params: { view?: string; d?: string; sel?: string | null }) => {
    const q = new URLSearchParams({ view: params.view ?? view, d: params.d ?? anchor });
    const s = params.sel === undefined ? sel : params.sel;
    if (s) q.set("sel", s);
    return `/admin/calendar?${q}`;
  };

  const run = (fn: () => Promise<ActionResult>, okText: (r: ActionResult) => string) =>
    start(async () => {
      const r = await fn();
      setToast({ ok: r.ok, text: r.ok ? okText(r) : `${t.common.error}: ${r.message ?? ""}` });
      if (r.ok) setSelected(new Set());
      router.refresh();
    });

  const shift = (dir: -1 | 1) => {
    if (view === "week") return url({ d: addDays(anchor, 7 * dir) });
    const [y, m] = anchor.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + dir, 1));
    return url({ d: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01` });
  };

  const title =
    view === "month"
      ? new Intl.DateTimeFormat(localeTag, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${anchor.slice(0, 7)}-01T00:00:00Z`))
      : `${new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${from}T00:00:00Z`))} – ${new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${to}T00:00:00Z`))}`;
  const longDate = (d: string) => new Intl.DateTimeFormat(localeTag, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const allDays = rangeDays(from, to);
  const inMonth = (d: string) => view === "week" || d.slice(0, 7) === anchor.slice(0, 7);
  const counts = (d: string) => {
    const list = byDate.get(d) ?? [];
    return { free: list.filter((s) => s.status === "free").length, booked: list.filter((s) => s.status === "booked").length, blocked: list.filter((s) => s.status === "blocked").length };
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold md:text-3xl">{tc.title}</h1>
        <div className="flex rounded-sm border border-line" role="group">
          {(["month", "week"] as const).map((v) => (
            <Link key={v} href={url({ view: v })} aria-current={view === v ? "true" : undefined} className="min-h-10 px-3 py-2 text-sm text-muted aria-[current=true]:bg-panel-2 aria-[current=true]:text-fg">
              {v === "month" ? tc.month : tc.week}
            </Link>
          ))}
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowBulk((s) => !s)} aria-expanded={showBulk}>
          <Icon name="plus" size={18} /> {tc.bulkAdd}
        </button>
      </div>

      {toast && (
        <div role="status" className={`mt-4 flex items-center gap-3 rounded-md border p-3 ${toast.ok ? "border-ok/50 bg-ok/10" : "border-danger/60 bg-danger/10"}`}>
          <Icon name={toast.ok ? "check" : "alert"} className={toast.ok ? "text-ok" : "text-danger"} />
          <span className="flex-1">{toast.text}</span>
          <button type="button" className="btn btn-ghost btn-sm size-9 px-0" onClick={() => setToast(null)} aria-label={t.common.close}>
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      {showBulk && (
        <BulkForm
          t={t}
          days={days}
          today={today}
          pending={pending}
          onSubmit={(v) =>
            run(
              () => addSlots({ mode: "bulk", ...v }),
              (r) => `${fill(tc.added, { n: r.count ?? 0 })}${r.skipped ? `. ${fill(tc.skipped, { n: r.skipped })}` : ""}`,
            )
          }
        />
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_24rem]">
        {/* Calendar grid */}
        <section className="panel p-3 md:p-4" aria-busy={pending}>
          <div className="mb-3 flex items-center gap-2">
            <Link href={shift(-1)} className="btn btn-ghost btn-sm size-10 px-0" aria-label={t.common.prev} scroll={false}>
              <Icon name="chevronLeft" />
            </Link>
            <p className="flex-1 text-center font-semibold capitalize">{title}</p>
            <Link href={shift(1)} className="btn btn-ghost btn-sm size-10 px-0" aria-label={t.common.next} scroll={false}>
              <Icon name="chevronRight" />
            </Link>
            <Link href={url({ d: today, sel: today })} className="btn btn-secondary btn-sm" scroll={false}>
              {t.common.today}
            </Link>
          </div>

          {view === "month" ? (
            <div className="grid grid-cols-7 gap-1">
              {days.map((d) => (
                <div key={d} className="pb-1 text-center font-mono text-xs text-faint">
                  {d}
                </div>
              ))}
              {allDays.map((d) => {
                const c = counts(d);
                const past = d < today;
                return (
                  <Link
                    key={d}
                    href={url({ sel: d })}
                    scroll={false}
                    aria-current={d === sel ? "date" : undefined}
                    className={`flex min-h-16 flex-col rounded-sm border p-1.5 transition-colors md:min-h-20 ${d === sel ? "border-accent" : "border-line hover:border-line-strong"} ${inMonth(d) ? "" : "opacity-40"} ${past ? "opacity-50" : ""}`}
                  >
                    <span className={`font-mono text-sm ${d === today ? "font-semibold text-accent" : ""}`}>{Number(d.slice(8))}</span>
                    <span className="mt-auto flex flex-wrap gap-x-1.5 font-mono text-xs leading-tight md:text-xs">
                      {c.free > 0 && <span className="text-ok">{c.free}</span>}
                      {c.booked > 0 && <span className="text-accent">{c.booked}</span>}
                      {c.blocked > 0 && <span className="text-faint">{c.blocked}</span>}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <>
              <div className="grid gap-2 md:grid-cols-7">
                {allDays.map((d, i) => {
                  const list = byDate.get(d) ?? [];
                  return (
                    <div key={d} className={`rounded-sm border p-2 ${d === sel ? "border-accent" : "border-line"}`}>
                      <Link href={url({ sel: d })} scroll={false} className="flex items-baseline justify-between gap-2 md:block">
                        <span className="font-mono text-xs text-faint">{days[i]}</span>{" "}
                        <span className={`font-mono ${d === today ? "text-accent" : ""}`}>{Number(d.slice(8))}</span>
                      </Link>
                      <ul className="mt-2 flex flex-wrap gap-1 md:flex-col">
                        {list.map((s) => (
                          <li key={s.id}>
                            {s.bookingId ? (
                              <Link href={`/admin/bookings/${s.bookingId}`} title={s.bookingLabel ?? ""} className={`block rounded-sm border px-1.5 py-1 font-mono text-xs ${statusStyle.booked}`}>
                                {s.start}
                                <span className="hidden truncate text-xs md:block">{s.bookingLabel}</span>
                              </Link>
                            ) : (
                              <Link href={url({ sel: d })} scroll={false} className={`block rounded-sm border px-1.5 py-1 font-mono text-xs ${statusStyle[s.status]}`}>
                                {s.start}
                                {s.bay > 1 && <sup className="ml-0.5">{s.bay}</sup>}
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
              <CopyWeekForm t={t} pending={pending} onSubmit={(n) => run(() => copyWeek(from, n), (r) => fill(tc.copied, { n: r.count ?? 0 }))} />
            </>
          )}
          <p className="mt-3 flex items-center gap-3 font-mono text-xs text-faint">
            <span className="text-ok">■</span>
            <span className="text-accent">■</span>
            <span>■</span>
            {tc.legend}
          </p>
        </section>

        {/* Day panel */}
        <section className="panel p-4" aria-labelledby="day-title">
          {!sel ? (
            <p className="text-muted">{tc.pickDay}</p>
          ) : (
            <DayPanel
              key={sel}
              date={sel}
              title={longDate(sel)}
              slots={byDate.get(sel) ?? []}
              past={sel < today}
              selected={selected}
              setSelected={setSelected}
              t={t}
              pending={pending}
              onAdd={(v) =>
                run(
                  () => addSlots({ mode: "days", dates: [sel], ...v }),
                  (r) => `${fill(tc.added, { n: r.count ?? 0 })}${r.skipped ? `. ${fill(tc.skipped, { n: r.skipped })}` : ""}`,
                )
              }
              onUpdate={(action) => {
                if (action === "delete" && !confirm(fill(tc.confirmDelete, { n: selected.size }))) return;
                run(() => updateSlots([...selected], action), (r) => `${t.common.done}: ${r.count ?? 0}`);
              }}
              onClose={(closed) => {
                if (closed && !confirm(tc.confirmClose)) return;
                run(() => setDayClosed(sel, closed), (r) => `${t.common.done}: ${r.count ?? 0}`);
              }}
              onCopy={(targets) => run(() => copyDay(sel, targets), (r) => fill(tc.copied, { n: r.count ?? 0 }))}
            />
          )}
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

type SlotFormValues = { start: string; end: string; length: 30 | 60 | 90; parallel: number; lunchStart: string; lunchEnd: string };

function SlotFields({ t, value, onChange }: { t: AdminDictionary; value: SlotFormValues; onChange: (v: SlotFormValues) => void }) {
  const tc = t.calendar;
  const [lunch, setLunch] = useState(Boolean(value.lunchStart));
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className="field-label text-sm">{tc.start}</span>
        <input type="time" step={1800} className="field font-mono" value={value.start} onChange={(e) => onChange({ ...value, start: e.target.value })} required />
      </label>
      <label className="block">
        <span className="field-label text-sm">{tc.end}</span>
        <input type="time" step={1800} className="field font-mono" value={value.end} onChange={(e) => onChange({ ...value, end: e.target.value })} required />
      </label>
      <label className="block">
        <span className="field-label text-sm">{tc.length}</span>
        <select className="field font-mono" value={value.length} onChange={(e) => onChange({ ...value, length: Number(e.target.value) as 30 | 60 | 90 })}>
          {[30, 60, 90].map((n) => (
            <option key={n} value={n}>
              {n} {t.common.minutes}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="field-label text-sm">{tc.parallel}</span>
        <input type="number" min={1} max={10} className="field font-mono" value={value.parallel} onChange={(e) => onChange({ ...value, parallel: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })} />
      </label>
      <label className="col-span-2 flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          className="size-5 accent-[var(--accent)]"
          checked={lunch}
          onChange={(e) => {
            setLunch(e.target.checked);
            onChange({ ...value, lunchStart: e.target.checked ? "12:00" : "", lunchEnd: e.target.checked ? "13:00" : "" });
          }}
        />
        {tc.lunch}
      </label>
      {lunch && (
        <>
          <input type="time" step={1800} aria-label={`${tc.lunch} ${tc.start}`} className="field font-mono" value={value.lunchStart} onChange={(e) => onChange({ ...value, lunchStart: e.target.value })} />
          <input type="time" step={1800} aria-label={`${tc.lunch} ${tc.end}`} className="field font-mono" value={value.lunchEnd} onChange={(e) => onChange({ ...value, lunchEnd: e.target.value })} />
        </>
      )}
    </div>
  );
}

const defaults: SlotFormValues = { start: "09:00", end: "17:00", length: 60, parallel: 1, lunchStart: "", lunchEnd: "" };

function BulkForm({ t, days, today, pending, onSubmit }: { t: AdminDictionary; days: string[]; today: string; pending: boolean; onSubmit: (v: SlotFormValues & { weekdays: number[]; weeks: number; from: string }) => void }) {
  const tc = t.calendar;
  const [v, setV] = useState<SlotFormValues>({ ...defaults, lunchStart: "12:00", lunchEnd: "13:00" });
  const [weekdays, setWeekdays] = useState([1, 2, 3, 4, 5]);
  const [weeks, setWeeks] = useState(4);
  const [from, setFrom] = useState(today);
  return (
    <form
      className="panel mt-4 grid animate-rise gap-5 p-4 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ ...v, weekdays, weeks, from });
      }}
    >
      <div>
        <p className="field-label">{tc.weekdays}</p>
        <div className="flex flex-wrap gap-1.5">
          {days.map((d, i) => {
            const n = i + 1;
            const on = weekdays.includes(n);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => setWeekdays((w) => (on ? w.filter((x) => x !== n) : [...w, n].sort()))}
                className={`min-h-11 min-w-11 rounded-sm border px-2 font-mono text-sm ${on ? "border-accent bg-accent text-on-accent" : "border-line-strong text-muted"}`}
              >
                {d}
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="field-label text-sm">{tc.startDate}</span>
            <input type="date" min={today} className="field font-mono" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="block">
            <span className="field-label text-sm">{tc.weeks}</span>
            <input type="number" min={1} max={26} className="field font-mono" value={weeks} onChange={(e) => setWeeks(Math.max(1, Math.min(26, Number(e.target.value) || 1)))} />
          </label>
        </div>
      </div>
      <div>
        <SlotFields t={t} value={v} onChange={setV} />
        <button type="submit" className="btn btn-primary mt-4 w-full" disabled={pending || !weekdays.length}>
          {tc.addSlots}
        </button>
      </div>
    </form>
  );
}

function CopyWeekForm({ t, pending, onSubmit }: { t: AdminDictionary; pending: boolean; onSubmit: (weeks: number) => void }) {
  const [n, setN] = useState(1);
  return (
    <form
      className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(n);
      }}
    >
      <Icon name="copy" size={18} className="text-muted" />
      <span className="text-sm text-muted">{t.calendar.copyWeek}:</span>
      <select className="field w-auto min-h-10 py-1.5 font-mono" value={n} onChange={(e) => setN(Number(e.target.value))} aria-label={t.calendar.copyWeeks}>
        {Array.from({ length: 8 }, (_, i) => i + 1).map((i) => (
          <option key={i} value={i}>
            +{i}
          </option>
        ))}
      </select>
      <button type="submit" className="btn btn-secondary btn-sm" disabled={pending}>
        {t.calendar.copyWeek}
      </button>
    </form>
  );
}

function DayPanel(props: {
  date: string;
  title: string;
  slots: AdminSlot[];
  past: boolean;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  t: AdminDictionary;
  pending: boolean;
  onAdd: (v: SlotFormValues) => void;
  onUpdate: (a: "block" | "unblock" | "delete") => void;
  onClose: (closed: boolean) => void;
  onCopy: (targets: string[]) => void;
}) {
  const { date, title, slots, past, selected, setSelected, t, pending } = props;
  const tc = t.calendar;
  const [form, setForm] = useState<SlotFormValues>(defaults);
  const [copyTarget, setCopyTarget] = useState("");
  const [copyWeeks, setCopyWeeks] = useState(0);
  const hasFree = slots.some((s) => s.status === "free");
  const hasBlocked = slots.some((s) => s.status === "blocked");
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const selSlots = slots.filter((s) => selected.has(s.id));

  return (
    <div>
      <h2 id="day-title" className="text-lg font-semibold capitalize">
        {title}
      </h2>

      {!past && (
        <div className="mt-3 flex flex-wrap gap-2">
          {hasFree && (
            <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => props.onClose(true)}>
              <Icon name="lock" size={16} /> {tc.closeDay}
            </button>
          )}
          {hasBlocked && (
            <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => props.onClose(false)}>
              {tc.openDay}
            </button>
          )}
        </div>
      )}

      {/* Slot list */}
      <div className="mt-4">
        {slots.length === 0 ? (
          <p className="text-muted">{tc.noSlots}</p>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between text-sm">
              <button type="button" className="link text-muted" onClick={() => setSelected(new Set(slots.filter((s) => s.status !== "booked").map((s) => s.id)))}>
                {tc.selectAll}
              </button>
              {selected.size > 0 && (
                <button type="button" className="link text-muted" onClick={() => setSelected(new Set())}>
                  {tc.clear}
                </button>
              )}
            </div>
            <ul className="divide-y divide-line rounded-sm border border-line">
              {slots.map((s) => (
                <li key={s.id} className="flex min-h-12 items-center gap-3 px-3">
                  {s.status === "booked" ? (
                    <span className="size-5" />
                  ) : (
                    <input type="checkbox" aria-label={`${s.start}–${s.end}`} className="size-5 accent-[var(--accent)]" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                  )}
                  <span className="font-mono">
                    {s.start}–{s.end}
                  </span>
                  {s.bay > 1 || slots.some((x) => x.bay > 1) ? <span className="font-mono text-xs text-faint">{tc.bay} {s.bay}</span> : null}
                  {s.bookingId ? (
                    <Link href={`/admin/bookings/${s.bookingId}`} className={`ml-auto truncate rounded-sm border px-2 py-1 text-sm ${statusStyle.booked}`}>
                      {s.bookingLabel}
                    </Link>
                  ) : (
                    <span className={`ml-auto rounded-sm border px-2 py-0.5 text-xs ${statusStyle[s.status]}`}>{t.slot[s.status]}</span>
                  )}
                </li>
              ))}
            </ul>
            {selected.size > 0 && (
              <div className="sticky bottom-20 mt-3 flex flex-wrap items-center gap-2 rounded-sm border border-line-strong bg-panel-2 p-2 lg:bottom-3">
                <span className="mr-auto px-1 text-sm">{fill(tc.selected, { n: selected.size })}</span>
                {selSlots.some((s) => s.status === "free") && (
                  <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => props.onUpdate("block")}>
                    {tc.block}
                  </button>
                )}
                {selSlots.some((s) => s.status === "blocked") && (
                  <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => props.onUpdate("unblock")}>
                    {tc.unblock}
                  </button>
                )}
                <button type="button" className="btn btn-danger btn-sm" disabled={pending} onClick={() => props.onUpdate("delete")}>
                  <Icon name="trash" size={16} /> {tc.deleteSel}
                </button>
              </div>
            )}
            {slots.some((s) => s.status === "booked") && <p className="mt-2 text-xs text-faint">{tc.bookedNote}</p>}
          </>
        )}
      </div>

      {!past && (
        <>
          <form
            className="mt-6 border-t border-line pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              props.onAdd(form);
            }}
          >
            <h3 className="mb-3 font-semibold">{tc.addSlots}</h3>
            <SlotFields t={t} value={form} onChange={setForm} />
            <button type="submit" className="btn btn-primary mt-4 w-full" disabled={pending}>
              <Icon name="plus" size={18} /> {tc.addSlots}
            </button>
          </form>

          {slots.length > 0 && (
            <div className="mt-6 border-t border-line pt-4">
              <h3 className="mb-3 font-semibold">{tc.copyDay}</h3>
              <div className="flex gap-2">
                <input type="date" aria-label={tc.copyTo} className="field font-mono" value={copyTarget} min={date} onChange={(e) => setCopyTarget(e.target.value)} />
                <button type="button" className="btn btn-secondary" disabled={pending || !copyTarget} onClick={() => props.onCopy([copyTarget])}>
                  <Icon name="copy" size={18} />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <select className="field font-mono" value={copyWeeks} onChange={(e) => setCopyWeeks(Number(e.target.value))} aria-label={tc.copyWeeks}>
                  <option value={0}>{tc.copyWeeks}</option>
                  {[1, 2, 3, 4, 6, 8].map((n) => (
                    <option key={n} value={n}>
                      +{n}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={pending || !copyWeeks}
                  onClick={() => props.onCopy(Array.from({ length: copyWeeks }, (_, i) => addDays(date, 7 * (i + 1))))}
                >
                  <Icon name="copy" size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
