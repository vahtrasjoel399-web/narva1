"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Lang } from "@/config/site";
import { t } from "@/i18n/config";
import { formatDateLong, formatMonth } from "@/lib/format";
import { addMonths, monthGrid, shopNow, startOfMonth } from "@/lib/time";

/** Month calendar where only dates with at least one suitable free time are clickable. */
export function BookingCalendar({ lang, available, selected, onSelect, labels, weekdays }: {
  lang: Lang;
  available: Record<string, string[]>;
  selected: string | null;
  onSelect: (date: string) => void;
  labels: { prev: string; next: string; dayAvailable: string; dayUnavailable: string };
  weekdays: string[];
}) {
  const dates = Object.keys(available).sort();
  const today = shopNow().date;
  const firstMonth = startOfMonth(today);
  const lastMonth = startOfMonth(dates[dates.length - 1] ?? today);
  const [month, setMonth] = useState(() => startOfMonth(selected ?? dates[0] ?? today));
  const grid = monthGrid(month);
  // Drop a trailing week that belongs entirely to the next month.
  const visible = grid.slice(35).every((d) => d.slice(0, 7) !== month.slice(0, 7)) ? grid.slice(0, 35) : grid;

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="btn btn-ghost btn-sm !px-2.5"
          disabled={month <= firstMonth}
          onClick={() => setMonth(addMonths(month, -1))}
          aria-label={labels.prev}
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <h3 className="text-lg font-bold text-white" aria-live="polite">
          {formatMonth(month, lang)}
        </h3>
        <button
          type="button"
          className="btn btn-ghost btn-sm !px-2.5"
          disabled={month >= lastMonth}
          onClick={() => setMonth(addMonths(month, 1))}
          aria-label={labels.next}
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-ink-500" aria-hidden="true">
        {weekdays.map((w) => (
          <span key={w} className="py-1">
            {w}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1" role="group" aria-label={formatMonth(month, lang)}>
        {visible.map((date) => {
          const inMonth = date.slice(0, 7) === month.slice(0, 7);
          const times = available[date]?.length ?? 0;
          const enabled = inMonth && times > 0;
          const isSel = date === selected;
          const label = t(enabled ? labels.dayAvailable : labels.dayUnavailable, { date: formatDateLong(date, lang), n: times });
          if (!inMonth) return <span key={date} aria-hidden="true" />;
          return (
            <button
              key={date}
              type="button"
              disabled={!enabled}
              aria-pressed={isSel}
              aria-label={label}
              onClick={() => onSelect(date)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-base font-bold tabular-nums transition-all ${
                isSel
                  ? "bg-accent-500 text-ink-950 shadow-lg"
                  : enabled
                    ? "border border-ink-600 bg-ink-800 text-white hover:border-accent-500"
                    : "text-ink-600 line-through decoration-ink-700"
              } ${date === today && !isSel ? "ring-1 ring-accent-500/60" : ""}`}
            >
              {Number(date.slice(8))}
              {enabled && !isSel && <span className="absolute bottom-1.5 size-1.5 rounded-full bg-ok-400" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
