"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight, Copy, Layers, Lock, LockOpen, Trash2 } from "lucide-react";
import { formatDateLong, formatDateShort, formatMonth } from "@/lib/format";
import { addDays, addMonths, hhmm, monthGrid, shopNow, startOfWeek, type ISODate } from "@/lib/time";
import { listSlots, updateDay, updateSlots, type AdminSlot } from "@/app/admin/actions";
import { useAdmin } from "./AdminI18n";
import { AddSlotsSheet, BulkSlotsSheet, CopySheet, useWeekdayLetters } from "./SlotForms";
import { ConfirmButton, PageTitle, Sheet, Spinner, useToast } from "./ui";

type View = "month" | "week";

const slotColors = {
  free: "border-ok-500/50 bg-ok-500/15 text-ok-400",
  booked: "border-accent-500/60 bg-accent-500/20 text-accent-300",
  blocked: "border-ink-600 bg-ink-750 text-ink-400 [background-image:repeating-linear-gradient(135deg,transparent_0_6px,rgba(255,255,255,.04)_6px_12px)]",
} as const;

function counts(slots: AdminSlot[]) {
  let free = 0,
    booked = 0,
    blocked = 0;
  for (const s of slots) {
    if (s.status === "free") free++;
    else if (s.status === "booked") booked++;
    else blocked++;
  }
  return { free, booked, blocked, total: slots.length };
}

export function AvailabilityCalendar() {
  const { d, lang, t } = useAdmin();
  const toast = useToast();
  const letters = useWeekdayLetters();
  const today = shopNow().date;
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState<ISODate>(today);
  const [selected, setSelected] = useState<ISODate>(today);
  const [slots, setSlots] = useState<AdminSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<null | "add" | "bulk" | "copy">(null);
  const [activeSlot, setActiveSlot] = useState<AdminSlot | null>(null);
  const [busy, setBusy] = useState(false);

  const range = useMemo(() => {
    if (view === "month") {
      const grid = monthGrid(anchor);
      return { from: grid[0], to: grid[41], days: grid };
    }
    const from = startOfWeek(anchor);
    return { from, to: addDays(from, 6), days: Array.from({ length: 7 }, (_, i) => addDays(from, i)) };
  }, [view, anchor]);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await listSlots(range.from, range.to);
    setLoading(false);
    if (r.ok) setSlots(r.data);
    else toast({ kind: "error", text: d.common.error });
  }, [range.from, range.to, toast, d]);

  useEffect(() => {
    // Fetch slots whenever the visible range changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const byDay = useMemo(() => {
    const m = new Map<ISODate, AdminSlot[]>();
    for (const s of slots) {
      const list = m.get(s.date);
      if (list) list.push(s);
      else m.set(s.date, [s]);
    }
    return m;
  }, [slots]);

  const move = (dir: -1 | 1) => setAnchor(view === "month" ? addMonths(anchor, dir) : addDays(startOfWeek(anchor), dir * 7));

  const dayAction = async (op: "close" | "open" | "deleteFree") => {
    setBusy(true);
    const r = await updateDay(selected, op);
    setBusy(false);
    if (!r.ok) return toast({ kind: "error", text: d.common.error });
    toast({ kind: "ok", text: `${d.common.saved} · ${r.data.count}` });
    load();
  };

  const slotAction = async (slot: AdminSlot, op: "block" | "unblock" | "delete") => {
    setBusy(true);
    const r = await updateSlots([slot.id], op);
    setBusy(false);
    setActiveSlot(null);
    if (!r.ok) return toast({ kind: "error", text: d.common.error });
    load();
  };

  const daySlots = byDay.get(selected) ?? [];
  const dayCounts = counts(daySlots);
  const title = view === "month" ? formatMonth(anchor, lang) : `${formatDateShort(range.from, lang)} – ${formatDateShort(range.to, lang)}`;

  return (
    <div>
      <PageTitle
        actions={
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSheet("bulk")}>
              <Layers size={17} aria-hidden="true" /> {d.calendar.bulkAdd}
            </button>
          </div>
        }
      >
        {d.calendar.title}
      </PageTitle>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button type="button" className="btn btn-secondary btn-sm !px-2.5" onClick={() => move(-1)} aria-label={d.calendar.prev}>
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button type="button" className="btn btn-secondary btn-sm !px-2.5" onClick={() => move(1)} aria-label={d.calendar.next}>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setAnchor(today);
              setSelected(today);
            }}
          >
            {d.calendar.today}
          </button>
        </div>
        <h2 className="order-first w-full text-lg font-bold text-white first-letter:uppercase sm:order-none sm:w-auto sm:min-w-0 sm:flex-1 sm:truncate">{title}</h2>
        {loading && <Spinner className="text-ink-400" />}
        <span className="flex-1 sm:hidden" />
        <div className="flex rounded-xl border border-ink-700 bg-ink-900 p-0.5" role="group">
          {(["month", "week"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => {
                setView(v);
                setAnchor(selected);
              }}
              className={`rounded-[10px] px-3 py-1.5 text-sm font-bold ${view === v ? "bg-ink-700 text-white" : "text-ink-400"}`}
            >
              {v === "month" ? d.calendar.month : d.calendar.week}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-3 text-xs font-semibold text-ink-400">
        {(["free", "booked", "blocked"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`inline-block size-3 rounded border ${slotColors[s]}`} /> {d.calendar[s]}
          </span>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
        {/* Calendar */}
        <div className="min-w-0">
          {view === "month" ? (
            <div className="card p-2 md:p-3">
              <div className="grid grid-cols-7 gap-1 pb-1 text-center text-xs font-bold text-ink-500">
                {letters.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {range.days.map((date) => {
                  const c = counts(byDay.get(date) ?? []);
                  const inMonth = date.slice(0, 7) === anchor.slice(0, 7);
                  const isSel = date === selected;
                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setSelected(date)}
                      aria-pressed={isSel}
                      aria-label={`${formatDateLong(date, lang)}: ${t(d.calendar.slotsCount, { free: c.free, total: c.total })}`}
                      className={`flex min-h-16 flex-col items-stretch rounded-xl border p-1.5 text-left transition-colors md:min-h-24 md:p-2 ${
                        isSel ? "border-accent-500 bg-ink-750" : "border-ink-800 bg-ink-900 hover:border-ink-600"
                      } ${inMonth ? "" : "opacity-45"} ${date < today ? "opacity-40" : ""}`}
                    >
                      <span
                        className={`text-sm font-bold tabular-nums ${date === today ? "grid size-6 place-items-center rounded-full bg-accent-500 text-ink-950" : "text-ink-100"}`}
                      >
                        {Number(date.slice(8))}
                      </span>
                      {c.total > 0 && (
                        <span className="mt-auto flex flex-col gap-0.5 text-[0.625rem] font-bold leading-tight md:text-xs">
                          {c.free > 0 && <span className="text-ok-400">● {c.free}</span>}
                          {c.booked > 0 && <span className="text-accent-300">● {c.booked}</span>}
                          {c.blocked > 0 && <span className="text-ink-400">● {c.blocked}</span>}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-7">
              {range.days.map((date, i) => {
                const list = byDay.get(date) ?? [];
                return (
                  <div key={date} className={`card p-2 ${date === selected ? "border-accent-500" : ""}`}>
                    <button type="button" onClick={() => setSelected(date)} className="mb-2 flex w-full items-baseline gap-2 text-left">
                      <span className="text-xs font-bold uppercase text-ink-400">{letters[i]}</span>
                      <span className={`text-lg font-extrabold ${date === today ? "text-accent-400" : "text-white"}`}>{Number(date.slice(8))}</span>
                    </button>
                    <div className="flex flex-wrap gap-1 md:flex-col">
                      {list.length === 0 && <span className="text-xs text-ink-500">{d.calendar.noSlots}</span>}
                      {list.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelected(date);
                            setActiveSlot(s);
                          }}
                          className={`rounded-lg border px-1.5 py-1 text-left text-xs font-bold tabular-nums ${slotColors[s.status]}`}
                        >
                          {hhmm(s.start_time)}
                          <span className="hidden font-semibold opacity-80 md:inline"> · {s.bay}</span>
                          {s.booking && <span className="block truncate font-semibold">#{s.booking.number}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Day panel */}
        <section className="card self-start p-4 lg:sticky lg:top-6" aria-label={formatDateLong(selected, lang)}>
          <h3 className="text-lg font-bold first-letter:uppercase text-white">{formatDateLong(selected, lang)}</h3>
          <p className="mt-0.5 text-sm text-ink-400">
            {t(d.calendar.slotsCount, { free: dayCounts.free, total: dayCounts.total })}
            {dayCounts.booked > 0 && ` · ${d.calendar.booked}: ${dayCounts.booked}`}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-primary btn-sm col-span-2" onClick={() => setSheet("add")}>
              <CalendarPlus size={17} aria-hidden="true" /> {d.calendar.addSlots}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSheet("copy")} disabled={dayCounts.total === 0}>
              <Copy size={16} aria-hidden="true" /> {d.calendar.copy}
            </button>
            {dayCounts.free > 0 ? (
              <ConfirmButton
                className="btn btn-secondary btn-sm"
                confirmLabel={`${d.calendar.closeDay}?`}
                onConfirm={() => dayAction("close")}
                disabled={busy}
              >
                <Lock size={16} aria-hidden="true" /> {d.calendar.closeDay}
              </ConfirmButton>
            ) : (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => dayAction("open")} disabled={busy || dayCounts.blocked === 0}>
                <LockOpen size={16} aria-hidden="true" /> {d.calendar.openDay}
              </button>
            )}
            {dayCounts.free + dayCounts.blocked > 0 && (
              <ConfirmButton
                className="btn btn-danger btn-sm col-span-2"
                confirmLabel={t(d.calendar.confirmDeleteFree, { date: formatDateShort(selected, lang) })}
                onConfirm={() => dayAction("deleteFree")}
                disabled={busy}
              >
                <Trash2 size={16} aria-hidden="true" /> {d.calendar.deleteFree}
              </ConfirmButton>
            )}
          </div>

          <ul className="mt-5 flex flex-col gap-1.5">
            {daySlots.length === 0 && <li className="py-6 text-center text-sm text-ink-500">{d.calendar.noSlots}</li>}
            {groupByTime(daySlots).map(([time, group]) => (
              <li key={time} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-sm font-bold tabular-nums text-ink-200">{time}</span>
                <span className="flex flex-1 flex-wrap gap-1.5">
                  {group.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveSlot(s)}
                      className={`min-h-9 rounded-lg border px-2.5 text-xs font-bold ${slotColors[s.status]}`}
                    >
                      {group.length > 1 || s.bay > 1 ? `${t(d.calendar.bay, { n: s.bay })} · ` : ""}
                      {s.booking ? `#${s.booking.number} ${s.booking.customer_name}` : d.calendar[s.status]}
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Slot actions */}
      <Sheet
        open={!!activeSlot}
        onClose={() => setActiveSlot(null)}
        title={activeSlot ? `${formatDateShort(activeSlot.date, lang)} · ${hhmm(activeSlot.start_time)}–${hhmm(activeSlot.end_time)} · ${t(d.calendar.bay, { n: activeSlot.bay })}` : ""}
      >
        {activeSlot && (
          <div className="flex flex-col gap-2">
            <p className={`chip self-start ${slotColors[activeSlot.status]}`}>{d.calendar[activeSlot.status]}</p>
            {activeSlot.status === "booked" && activeSlot.booking && (
              <Link href={`/admin/bookings?id=${activeSlot.booking.id}`} className="btn btn-primary">
                {d.calendar.openBooking} #{activeSlot.booking.number} · {activeSlot.booking.customer_name}
              </Link>
            )}
            {activeSlot.status === "free" && (
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => slotAction(activeSlot, "block")}>
                <Lock size={17} aria-hidden="true" /> {d.calendar.block}
              </button>
            )}
            {activeSlot.status === "blocked" && (
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => slotAction(activeSlot, "unblock")}>
                <LockOpen size={17} aria-hidden="true" /> {d.calendar.unblock}
              </button>
            )}
            {activeSlot.status !== "booked" && (
              <button type="button" className="btn btn-danger" disabled={busy} onClick={() => slotAction(activeSlot, "delete")}>
                <Trash2 size={17} aria-hidden="true" /> {d.calendar.deleteSlot}
              </button>
            )}
          </div>
        )}
      </Sheet>

      <AddSlotsSheet open={sheet === "add"} onClose={() => setSheet(null)} date={selected} onDone={load} />
      <BulkSlotsSheet open={sheet === "bulk"} onClose={() => setSheet(null)} onDone={load} />
      <CopySheet open={sheet === "copy"} onClose={() => setSheet(null)} source={selected} onDone={load} />
    </div>
  );
}

function groupByTime(slots: AdminSlot[]): Array<[string, AdminSlot[]]> {
  const m = new Map<string, AdminSlot[]>();
  for (const s of [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time) || a.bay - b.bay)) {
    const key = `${hhmm(s.start_time)}–${hhmm(s.end_time)}`;
    const list = m.get(key);
    if (list) list.push(s);
    else m.set(key, [s]);
  }
  return [...m.entries()];
}
