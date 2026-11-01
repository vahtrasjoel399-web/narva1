import { siteConfig } from "@/config/site";
import { localeTags } from "@/i18n";
import { adminDict } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { addDays, startOfWeek, todayInTz } from "@/lib/time";
import { AvailabilityCalendar, type AdminSlot } from "@/components/admin/availability-calendar";
import { getDictionary } from "@/i18n";

export const metadata = { title: "Calendar" };

export default async function CalendarPage({ searchParams }: PageProps<"/admin/calendar">) {
  const { t, lang } = await adminDict();
  const sp = await searchParams;
  const today = todayInTz(siteConfig.booking.timezone);
  const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const view = sp.view === "week" ? "week" : "month";
  const anchor = isDate(sp.d) ? sp.d : today;
  const sel = isDate(sp.sel) ? sp.sel : null;

  let from: string, to: string;
  if (view === "week") {
    from = startOfWeek(anchor);
    to = addDays(from, 6);
  } else {
    const first = `${anchor.slice(0, 7)}-01`;
    const [y, m] = first.split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    from = startOfWeek(first);
    to = addDays(startOfWeek(last), 6);
  }
  const qFrom = sel && sel < from ? sel : from;
  const qTo = sel && sel > to ? sel : to;

  const { data } = await supabaseAdmin()
    .from("slots")
    .select("id, date, start_time, end_time, bay, status, booking_id, booking:bookings(number, customer_name)")
    .gte("date", qFrom)
    .lte("date", qTo)
    .order("date")
    .order("start_time")
    .order("bay");

  const slots: AdminSlot[] = (data ?? []).map((s) => {
    const b = Array.isArray(s.booking) ? s.booking[0] : s.booking;
    return {
      id: s.id,
      date: s.date,
      start: s.start_time.slice(0, 5),
      end: s.end_time.slice(0, 5),
      bay: s.bay,
      status: s.status,
      bookingId: s.booking_id,
      bookingLabel: b ? `#${b.number} ${b.customer_name}` : null,
    };
  });

  return (
    <AvailabilityCalendar
      key={`${view}-${from}`}
      view={view}
      anchor={anchor}
      from={from}
      to={to}
      today={today}
      sel={sel}
      slots={slots}
      t={t}
      localeTag={localeTags[lang]}
      days={getDictionary(lang).days.short}
    />
  );
}
