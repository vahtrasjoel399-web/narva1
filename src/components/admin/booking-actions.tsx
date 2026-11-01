"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AdminDictionary } from "@/i18n/admin";
import { saveBookingNotes, setBookingStatus } from "@/app/admin/actions";

export function BookingActions({ id, status, notes, t }: { id: string; status: string; notes: string; t: AdminDictionary }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState(notes);
  const [msg, setMsg] = useState<string | null>(null);
  const tb = t.bookings;
  const act = (next: Parameters<typeof setBookingStatus>[1], ask?: string) => {
    if (ask && !confirm(ask)) return;
    start(async () => {
      const r = await setBookingStatus(id, next);
      setMsg(r.ok ? t.common.saved : `${t.common.error}: ${r.message}`);
      router.refresh();
    });
  };
  const open = status === "new" || status === "confirmed";

  return (
    <section className="mt-6 space-y-6">
      {status !== "cancelled" && (
        <div className="flex flex-wrap gap-2">
          {status === "new" && (
            <button type="button" className="btn btn-primary" disabled={pending} onClick={() => act("confirmed")}>
              {tb.confirm}
            </button>
          )}
          {open && (
            <>
              <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => act("done")}>
                {tb.markDone}
              </button>
              <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => act("no_show")}>
                {tb.noShow}
              </button>
              {status === "new" ? (
                <button type="button" className="btn btn-danger" disabled={pending} onClick={() => act("declined", tb.confirmDecline)}>
                  {tb.decline}
                </button>
              ) : (
                <button type="button" className="btn btn-danger" disabled={pending} onClick={() => act("cancelled", tb.confirmCancel)}>
                  {tb.cancelBooking}
                </button>
              )}
            </>
          )}
          {!open && (
            <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => act("confirmed")}>
              {t.status.confirmed}
            </button>
          )}
        </div>
      )}
      {msg && (
        <p role="status" className="text-sm text-muted">
          {msg}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await saveBookingNotes(id, text);
            setMsg(r.ok ? t.common.saved : `${t.common.error}: ${r.message}`);
          });
        }}
      >
        <label htmlFor="notes" className="field-label">
          {tb.notes}
        </label>
        <textarea id="notes" className="field min-h-24" placeholder={tb.notesPh} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} />
        <button type="submit" className="btn btn-secondary btn-sm mt-2" disabled={pending}>
          {t.common.save}
        </button>
      </form>
    </section>
  );
}
