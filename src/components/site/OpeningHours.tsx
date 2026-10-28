import { siteConfig } from "@/config/site";
import type { Dictionary } from "@/i18n";

/** Groups consecutive days with equal hours: "Mon–Fri 08:00–18:00". */
export function hoursRows(dict: Dictionary): Array<{ days: string; hours: string }> {
  const perDay = Array.from({ length: 7 }, (_, i) => {
    const h = siteConfig.hours.find((x) => x.days.includes(i + 1));
    return h ? `${h.open}–${h.close}` : dict.common.closed;
  });
  const rows: Array<{ days: string; hours: string }> = [];
  let start = 0;
  for (let i = 1; i <= 7; i++) {
    if (i === 7 || perDay[i] !== perDay[start]) {
      const from = dict.common.weekdaysShort[start];
      const to = dict.common.weekdaysShort[i - 1];
      rows.push({ days: start === i - 1 ? from : `${from}–${to}`, hours: perDay[start] });
      start = i;
    }
  }
  return rows;
}

export function OpeningHours({ dict, className }: { dict: Dictionary; className?: string }) {
  return (
    <dl className={className}>
      {hoursRows(dict).map((r) => (
        <div key={r.days} className="flex justify-between gap-6 py-1.5">
          <dt className="text-ink-400">{r.days}</dt>
          <dd className="font-semibold tabular-nums text-ink-100">{r.hours}</dd>
        </div>
      ))}
    </dl>
  );
}
