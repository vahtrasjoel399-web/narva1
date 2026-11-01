"use client";
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";

type Props = {
  available: Record<string, string[]>; // date -> start times
  from: string;
  to: string;
  selected: string | null;
  onSelect: (date: string) => void;
  localeTag: string;
  days: string[];
  labels: { prev: string; next: string; legend: string };
};

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m0: number, d: number) => `${y}-${pad(m0 + 1)}-${pad(d)}`;

/** Month grid. Only dates with at least one valid start time are clickable. */
export function Calendar({ available, from, to, selected, onSelect, localeTag, days, labels }: Props) {
  const firstAvailable = Object.keys(available)[0] ?? from;
  const initial = (selected ?? firstAvailable).slice(0, 7);
  const [month, setMonth] = useState(initial); // "YYYY-MM"
  const [y, m0] = [Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1];

  const minMonth = from.slice(0, 7);
  const maxMonth = to.slice(0, 7);
  const shift = (delta: number) => {
    const d = new Date(Date.UTC(y, m0 + delta, 1));
    setMonth(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`);
  };

  const cells = useMemo(() => {
    const firstWeekday = (new Date(Date.UTC(y, m0, 1)).getUTCDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
    const list: (string | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) list.push(ymd(y, m0, d));
    while (list.length % 7) list.push(null);
    return list;
  }, [y, m0]);

  const title = new Intl.DateTimeFormat(localeTag, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m0, 1)));
  const full = new Intl.DateTimeFormat(localeTag, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

  return (
    <div className="select-none">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className="btn btn-ghost btn-sm size-11 px-0" onClick={() => shift(-1)} disabled={month <= minMonth} aria-label={labels.prev}>
          <Icon name="chevronLeft" />
        </button>
        <p className="font-semibold capitalize" aria-live="polite">
          {title}
        </p>
        <button type="button" className="btn btn-ghost btn-sm size-11 px-0" onClick={() => shift(1)} disabled={month >= maxMonth} aria-label={labels.next}>
          <Icon name="chevronRight" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center" role="grid">
        {days.map((d) => (
          <div key={d} className="pb-1 font-mono text-xs text-faint" role="columnheader">
            {d}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} />;
          const count = available[date]?.length ?? 0;
          const isSel = date === selected;
          const day = Number(date.slice(8));
          if (!count) {
            return (
              <div key={date} className="grid aspect-square place-items-center rounded-sm font-mono text-sm text-faint/50 line-through decoration-transparent" aria-disabled="true">
                {day}
              </div>
            );
          }
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-pressed={isSel}
              aria-label={`${full.format(new Date(`${date}T00:00:00Z`))}, ${count}`}
              className={`relative grid aspect-square place-items-center rounded-sm border font-mono text-sm font-medium transition-colors ${
                isSel ? "border-accent bg-accent text-on-accent" : "border-line-strong bg-panel-2 text-fg hover:border-accent"
              }`}
            >
              {day}
              {!isSel && <span aria-hidden="true" className="absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-accent" />}
            </button>
          );
        })}
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-faint">
        <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-accent" /> {labels.legend}
      </p>
    </div>
  );
}
