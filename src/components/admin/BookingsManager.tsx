"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Car, CheckCheck, Copy, Mail, MessageSquare, Phone, Plus, Search } from "lucide-react";
import type { Lang } from "@/config/site";
import { localeNames } from "@/i18n/config";
import { formatDateLong, formatDateShort, formatDuration } from "@/lib/format";
import { hhmm, shopNow, type ISODate } from "@/lib/time";
import { bookingStatuses, type BookingRow, type BookingStatus, type Service } from "@/lib/types";
import {
  createManualBooking,
  getAdminAvailability,
  getBooking,
  getManageLink,
  listAllServices,
  listBookings,
  markAllSeen,
  saveNotes,
  setBookingStatus,
  type BookingFilters,
} from "@/app/admin/actions";
import { useAdmin } from "./AdminI18n";
import { useBadges } from "./AdminShell";
import { ConfirmButton, Empty, Field, LoadingBlock, NewBadge, PageTitle, Sheet, Spinner, StatusChip, useToast } from "./ui";

export function useServiceNames() {
  const [services, setServices] = useState<Service[]>([]);
  useEffect(() => {
    listAllServices().then((r) => r.ok && setServices(r.data));
  }, []);
  const name = useCallback((id: string, lang: Lang) => services.find((s) => s.id === id)?.name[lang] ?? id, [services]);
  return { services, name };
}

export function BookingsManager() {
  const { d, lang } = useAdmin();
  const toast = useToast();
  const { refresh: refreshBadges, badges } = useBadges();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const openId = params.get("id");
  const { services, name } = useServiceNames();

  const [filters, setFilters] = useState<BookingFilters>({ status: "all", upcoming: true, q: "" });
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<BookingRow[] | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setFilters((f) => ({ ...f, q: query })), 300);
    return () => clearTimeout(id);
  }, [query]);

  const load = useCallback(async () => {
    const r = await listBookings(filters);
    if (r.ok) setRows(r.data);
    else toast({ kind: "error", text: d.common.error });
  }, [filters, toast, d]);

  useEffect(() => {
    // Reload whenever filters change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Reload the list when a new booking arrives while the page is open.
  const latest = badges?.latestNumber;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (latest) load();
  }, [latest, load]);

  const open = (id: string | null) => {
    const sp = new URLSearchParams(params.toString());
    if (id) sp.set("id", id);
    else sp.delete("id");
    router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
  };

  const onChanged = () => {
    load();
    refreshBadges();
  };

  const unseenCount = rows?.filter((r) => !r.seen_by_admin).length ?? 0;

  return (
    <div>
      <PageTitle
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setManualOpen(true)}>
            <Plus size={17} aria-hidden="true" /> {d.bookings.newBooking}
          </button>
        }
      >
        {d.bookings.title}
      </PageTitle>

      <div className="card mb-4 grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_auto_auto_auto]">
        <label className="relative sm:col-span-2 lg:col-span-1">
          <span className="sr-only">{d.common.search}</span>
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" aria-hidden="true" />
          <input
            className="input !pl-9"
            type="search"
            placeholder={d.bookings.filters.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">{d.bookings.filters.status}</span>
          <select
            className="input"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as BookingFilters["status"] })}
          >
            <option value="all">
              {d.bookings.filters.status}: {d.common.all}
            </option>
            {bookingStatuses.map((s) => (
              <option key={s} value={s}>
                {d.bookings.status[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-900 px-3">
          <input
            type="checkbox"
            className="size-5 accent-[var(--color-accent-500)]"
            checked={!!filters.upcoming}
            onChange={(e) => setFilters({ ...filters, upcoming: e.target.checked })}
          />
          <span className="py-3 text-sm font-semibold">{d.bookings.filters.upcoming}</span>
        </label>
        <input
          className="input"
          type="date"
          aria-label={d.bookings.filters.from}
          value={filters.from ?? ""}
          onChange={(e) => setFilters({ ...filters, from: e.target.value || undefined })}
        />
        <input
          className="input"
          type="date"
          aria-label={d.bookings.filters.to}
          value={filters.to ?? ""}
          onChange={(e) => setFilters({ ...filters, to: e.target.value || undefined })}
        />
      </div>

      {unseenCount > 0 && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={async () => {
              await markAllSeen();
              onChanged();
            }}
          >
            <CheckCheck size={16} aria-hidden="true" /> {d.settings.ackAll}
          </button>
        </div>
      )}

      {rows === null ? (
        <LoadingBlock label={d.common.loading} />
      ) : rows.length === 0 ? (
        <Empty>{d.bookings.empty}</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => open(b.id)}
                className={`card card-hover flex w-full flex-col gap-2 p-4 text-left md:flex-row md:items-center md:gap-4 ${
                  !b.seen_by_admin ? "border-accent-500/70 bg-accent-500/[0.06]" : ""
                } ${b.status === "cancelled" ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-2 md:w-48 md:flex-col md:items-start md:gap-0.5">
                  <span className="text-base font-extrabold first-letter:uppercase text-white">{formatDateShort(b.date, lang)}</span>
                  <span className="text-base font-bold tabular-nums text-accent-300">
                    {hhmm(b.start_time)}–{hhmm(b.end_time)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {!b.seen_by_admin && <NewBadge label={d.bookings.newBadge} />}
                    <span className="font-bold text-white">{b.customer_name}</span>
                    <span className="text-sm text-ink-500">#{b.number}</span>
                    <StatusChip status={b.status} label={d.bookings.status[b.status]} />
                  </div>
                  <p className="mt-1 truncate text-sm text-ink-300">{b.service_ids.map((id) => name(id, lang)).join(", ")}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-ink-400">
                    <Car size={14} aria-hidden="true" /> {[b.car_make, b.car_model, b.car_year].filter(Boolean).join(" ")}
                    {b.plate && ` · ${b.plate}`}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-ink-300">{b.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <BookingDetail id={openId} onClose={() => open(null)} onChanged={onChanged} serviceName={name} />
      <ManualBookingSheet
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        services={services}
        onCreated={(b) => {
          onChanged();
          open(b.id);
        }}
      />
    </div>
  );
}

function BookingDetail({ id, onClose, onChanged, serviceName }: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
  serviceName: (id: string, lang: Lang) => string;
}) {
  const { d, lang, t } = useAdmin();
  const toast = useToast();
  const [b, setB] = useState<BookingRow | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setB(null);
      return;
    }
    getBooking(id).then((r) => {
      if (r.ok) {
        setB(r.data);
        setNotes(r.data.admin_notes ?? "");
        onChanged();
      } else toast({ kind: "error", text: d.common.error });
    });
    // onChanged only refreshes badges/list; not a dependency for refetching.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const change = async (status: BookingStatus) => {
    if (!b) return;
    setBusy(true);
    const r = await setBookingStatus(b.id, status);
    setBusy(false);
    if (!r.ok) return toast({ kind: "error", text: d.common.error });
    setB(r.data.booking);
    toast({ kind: "ok", text: `${d.bookings.status[status]}${r.data.emailed ? ` · ${d.bookings.detail.clientEmailed}` : ""}` });
    onChanged();
  };

  const copyLink = async () => {
    if (!b) return;
    const r = await getManageLink(b.id);
    if (r.ok) {
      await navigator.clipboard?.writeText(r.data).catch(() => {});
      toast({ kind: "ok", text: r.data });
    }
  };

  const dd = d.bookings.detail;
  const actions: Array<{ status: BookingStatus; label: string; cls: string }> = [];
  if (b) {
    if (b.status === "new") actions.push({ status: "confirmed", label: d.bookings.actions.confirm, cls: "btn btn-ok" });
    if (b.status === "new" || b.status === "confirmed" || b.status === "no_show")
      actions.push({ status: "done", label: d.bookings.actions.done, cls: "btn btn-secondary" });
    if (b.status === "new" || b.status === "confirmed" || b.status === "done")
      actions.push({ status: "no_show", label: d.bookings.actions.noShow, cls: "btn btn-secondary" });
    if (b.status === "done" || b.status === "no_show")
      actions.push({ status: "confirmed", label: d.bookings.status.confirmed, cls: "btn btn-ghost" });
  }

  return (
    <Sheet open={!!id} onClose={onClose} wide title={b ? t(dd.title, { number: b.number }) : d.common.loading}>
      {!b ? (
        <LoadingBlock label={d.common.loading} />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip status={b.status} label={d.bookings.status[b.status]} />
            {b.cancelled_by && (
              <span className="text-sm text-ink-400">
                {dd.cancelledBy}: {b.cancelled_by === "client" ? dd.cancelledByClient : dd.cancelledByAdmin}
              </span>
            )}
          </div>

          <div>
            <p className="text-2xl font-extrabold first-letter:uppercase text-white">{formatDateLong(b.date, lang)}</p>
            <p className="text-xl font-bold tabular-nums text-accent-300">
              {hhmm(b.start_time)}–{hhmm(b.end_time)} · ~{formatDuration(b.duration_min, lang)}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`} className="btn btn-primary btn-lg">
              <Phone size={20} aria-hidden="true" /> {b.phone}
            </a>
            {b.email && (
              <a href={`mailto:${b.email}`} className="btn btn-secondary btn-lg truncate">
                <Mail size={19} aria-hidden="true" /> <span className="truncate">{b.email}</span>
              </a>
            )}
          </div>

          <dl className="grid gap-x-6 gap-y-3 rounded-2xl border border-ink-700 bg-ink-850 p-4 sm:grid-cols-2">
            {[
              [dd.client, b.customer_name],
              [dd.car, [b.car_make, b.car_model, b.car_year].filter(Boolean).join(" ") || "—"],
              [dd.plate, b.plate || "—"],
              [dd.services, b.service_ids.map((s) => serviceName(s, lang)).join(", ")],
              [dd.lang, localeNames[b.lang]],
              [dd.source, b.source === "web" ? dd.sourceWeb : dd.sourceAdmin],
              [dd.created, new Date(b.created_at).toLocaleString(lang)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-bold uppercase tracking-wide text-ink-500">{k}</dt>
                <dd className="mt-0.5 font-semibold text-ink-100">{v}</dd>
              </div>
            ))}
          </dl>

          <div>
            <p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-500">
              <MessageSquare size={14} aria-hidden="true" /> {dd.clientWrote}
            </p>
            <p className="whitespace-pre-wrap rounded-2xl border-l-4 border-accent-500 bg-accent-500/[0.07] p-4 text-lg leading-relaxed text-ink-50">
              {b.comment || "—"}
            </p>
          </div>

          {b.status !== "cancelled" && (
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <button key={a.status + a.label} type="button" className={a.cls} disabled={busy} onClick={() => change(a.status)}>
                  {a.label}
                </button>
              ))}
              <ConfirmButton
                className="btn btn-danger"
                confirmLabel={t(d.bookings.actions.confirmCancel, { number: b.number })}
                onConfirm={() => change("cancelled")}
                disabled={busy}
              >
                {d.bookings.actions.cancel}
              </ConfirmButton>
              {busy && <Spinner className="self-center" />}
            </div>
          )}

          <div>
            <Field label={dd.notes}>
              <textarea className="input" rows={3} placeholder={dd.notesPlaceholder} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  const r = await saveNotes(b.id, notes);
                  toast(r.ok ? { kind: "ok", text: d.common.saved } : { kind: "error", text: d.common.error });
                }}
              >
                {dd.saveNotes}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={copyLink}>
                <Copy size={15} aria-hidden="true" /> {dd.manageLink}
              </button>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function ManualBookingSheet({ open, onClose, services, onCreated }: {
  open: boolean;
  onClose: () => void;
  services: Service[];
  onCreated: (b: BookingRow) => void;
}) {
  const { d, lang, t } = useAdmin();
  const toast = useToast();
  const m = d.bookings.manual;
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState<ISODate>(shopNow().date);
  const [times, setTimes] = useState<string[] | null>(null);
  const [time, setTime] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", carMake: "", carModel: "", carYear: "", plate: "", comment: "" });
  const [clientLang, setClientLang] = useState<Lang>(lang);
  const [sendEmail, setSendEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const active = useMemo(() => services.filter((s) => s.active), [services]);

  useEffect(() => {
    if (!open || serviceIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimes(null);
      return;
    }
    setTimes(null);
    setTime("");
    getAdminAvailability(serviceIds, date).then((r) => setTimes(r.ok ? r.data : []));
  }, [open, serviceIds, date]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setBusy(true);
    const r = await createManualBooking({ ...form, serviceIds, date, time, lang: clientLang, sendEmail });
    setBusy(false);
    if (!r.ok) {
      toast({ kind: "error", text: r.error === "E_SLOT_TAKEN" ? m.slotTaken : d.common.error });
      if (r.error === "E_SLOT_TAKEN") getAdminAvailability(serviceIds, date).then((x) => setTimes(x.ok ? x.data : []));
      return;
    }
    toast({ kind: "ok", text: t(m.created, { number: r.data.number }) });
    setForm({ name: "", phone: "", email: "", carMake: "", carModel: "", carYear: "", plate: "", comment: "" });
    setServiceIds([]);
    onClose();
    onCreated(r.data);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      wide
      title={m.title}
      footer={
        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={busy || !time || !form.name.trim() || form.phone.trim().length < 5}
          onClick={submit}
        >
          {busy && <Spinner />} {m.submit}
        </button>
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="field-label">{m.services}</p>
          <div className="flex flex-wrap gap-2">
            {active.map((s) => {
              const on = serviceIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setServiceIds(on ? serviceIds.filter((x) => x !== s.id) : [...serviceIds, s.id])}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                    on ? "border-accent-500 bg-accent-500 text-ink-950" : "border-ink-700 bg-ink-850 text-ink-200"
                  }`}
                >
                  {s.name[lang]} · {s.durationMin}′
                </button>
              );
            })}
          </div>
        </div>
        <Field label={m.date}>
          <input className="input" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </Field>
        {serviceIds.length > 0 && (
          <div>
            <p className="field-label">{m.time}</p>
            {times === null ? (
              <Spinner className="text-ink-400" />
            ) : times.length === 0 ? (
              <p className="text-sm text-ink-400">{m.noTimes}</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {times.map((x) => (
                  <button
                    key={x}
                    type="button"
                    aria-pressed={time === x}
                    onClick={() => setTime(x)}
                    className={`rounded-xl border py-2.5 text-sm font-bold tabular-nums ${
                      time === x ? "border-accent-500 bg-accent-500 text-ink-950" : "border-ink-700 bg-ink-850 text-ink-100"
                    }`}
                  >
                    {x}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={d.bookings.detail.client}>
            <input className="input" value={form.name} onChange={set("name")} autoComplete="off" />
          </Field>
          <Field label={d.bookings.detail.phone}>
            <input className="input" type="tel" value={form.phone} onChange={set("phone")} autoComplete="off" />
          </Field>
          <Field label={d.bookings.detail.email}>
            <input className="input" type="email" value={form.email} onChange={set("email")} autoComplete="off" />
          </Field>
          <Field label={d.bookings.detail.lang}>
            <select className="input" value={clientLang} onChange={(e) => setClientLang(e.target.value as Lang)}>
              {(["et", "ru", "en"] as const).map((l) => (
                <option key={l} value={l}>
                  {localeNames[l]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={d.bookings.detail.make}>
            <input className="input" value={form.carMake} onChange={set("carMake")} />
          </Field>
          <Field label={d.bookings.detail.model}>
            <input className="input" value={form.carModel} onChange={set("carModel")} />
          </Field>
          <Field label={d.bookings.detail.plate}>
            <input className="input" value={form.plate} onChange={set("plate")} />
          </Field>
          <Field label={d.bookings.detail.year}>
            <input className="input" inputMode="numeric" value={form.carYear} onChange={set("carYear")} />
          </Field>
        </div>
        <Field label={d.bookings.detail.clientWrote}>
          <textarea className="input" rows={3} value={form.comment} onChange={set("comment")} />
        </Field>
        {form.email && (
          <label className="flex items-center gap-3">
            <input type="checkbox" className="size-5 accent-[var(--color-accent-500)]" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
            <span className="text-sm font-semibold">{d.bookings.detail.sendEmail}</span>
          </label>
        )}
      </div>
    </Sheet>
  );
}
