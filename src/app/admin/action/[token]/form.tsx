"use client";
import { useActionState } from "react";
import type { AdminDictionary } from "@/i18n/admin";
import { runEmailAction, type EmailActionState } from "./actions";

export function EmailActionForm({ token, action, t }: { token: string; action: "confirm" | "decline"; t: AdminDictionary["action"] }) {
  const [state, formAction, pending] = useActionState<EmailActionState>(() => runEmailAction(token), { status: "idle" });
  const messages: Record<string, string> = {
    confirmed: t.confirmed,
    declined: t.declined,
    link_used: t.used,
    link_expired: t.expired,
    invalid_link: t.invalid,
    booking_closed: t.closed,
    error: t.invalid,
  };
  if (state.status !== "idle") {
    return (
      <p role="status" className={`mt-6 rounded-md border p-4 ${state.status === "confirmed" ? "border-ok text-ok" : state.status === "declined" ? "border-accent" : "border-line-strong"}`}>
        {messages[state.status]}
      </p>
    );
  }
  return (
    <form action={formAction} className="mt-6">
      <p className="text-lg font-semibold">{action === "confirm" ? t.confirmQ : t.declineQ}</p>
      <button type="submit" disabled={pending} className={`btn mt-4 w-full ${action === "confirm" ? "btn-primary" : "btn-danger"}`}>
        {action === "confirm" ? t.confirmBtn : t.declineBtn}
      </button>
    </form>
  );
}
