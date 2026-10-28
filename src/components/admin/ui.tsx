"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleAlert, CircleCheck, LoaderCircle, X } from "lucide-react";
import type { BookingStatus } from "@/lib/types";
import { useAdmin } from "./AdminI18n";

// ─── Sheet (bottom sheet on phones, centered dialog on desktop) ─────────────
export function Sheet({ open, onClose, title, children, wide, footer }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
  footer?: React.ReactNode;
}) {
  const { d } = useAdmin();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:p-6">
      <button type="button" aria-label={d.common.close} className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-ink-700 bg-ink-900 shadow-2xl outline-none animate-fade-up md:rounded-3xl ${
          wide ? "md:max-w-3xl" : "md:max-w-lg"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-ink-800 px-5 py-4">
          <h2 id={titleId} className="flex-1 text-lg font-bold text-white">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm !px-2" aria-label={d.common.close}>
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="border-t border-ink-800 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ─── Toasts ──────────────────────────────────────────────────────────────────
type Toast = { id: number; text: string; kind: "ok" | "error" | "info"; action?: { label: string; onClick: () => void } };
const ToastContext = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), t.action ? 9000 : 4000);
  }, []);
  return (
    <ToastContext value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-3 top-3 z-[80] flex flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xl animate-pop ${
              t.kind === "error"
                ? "border-bad-500/40 bg-[#2a1416] text-bad-400"
                : t.kind === "ok"
                  ? "border-ok-500/40 bg-[#122318] text-ok-400"
                  : "border-accent-500/50 bg-ink-850 text-white"
            }`}
          >
            {t.kind === "error" ? <CircleAlert size={18} aria-hidden="true" /> : <CircleCheck size={18} aria-hidden="true" />}
            <span className="flex-1">{t.text}</span>
            {t.action && (
              <button type="button" className="btn btn-primary btn-sm" onClick={t.action.onClick}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export const useToast = () => useContext(ToastContext);

// ─── Small pieces ────────────────────────────────────────────────────────────
export function Spinner({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <LoaderCircle size={size} className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-400" role="status">
      <Spinner /> {label}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-ink-700 px-6 py-12 text-center text-ink-400">{children}</div>;
}

const statusStyles: Record<BookingStatus, string> = {
  new: "bg-accent-500/15 text-accent-300 border-accent-500/30",
  confirmed: "bg-ok-500/15 text-ok-400 border-ok-500/30",
  done: "bg-info-500/15 text-info-400 border-info-500/30",
  cancelled: "bg-ink-700/60 text-ink-400 border-ink-600",
  no_show: "bg-bad-500/15 text-bad-400 border-bad-500/30",
};

export function StatusChip({ status, label }: { status: BookingStatus; label: string }) {
  return <span className={`chip ${statusStyles[status]}`}>{label}</span>;
}

export function NewBadge({ label }: { label: string }) {
  return (
    <span className="chip animate-pulse border-accent-400 bg-accent-500 text-ink-950" aria-label={label}>
      {label}
    </span>
  );
}

export function PageTitle({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <h1 className="flex-1 text-2xl font-extrabold text-white md:text-3xl">{children}</h1>
      {actions}
    </div>
  );
}

export function Field({ label, children, hint, error }: { label: string; children: React.ReactNode; hint?: string; error?: string }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="field-hint block">{hint}</span>}
      {error && <span className="field-error block">{error}</span>}
    </label>
  );
}

/** Two-step destructive button: first tap arms, second tap confirms. */
export function ConfirmButton({ children, confirmLabel, onConfirm, className = "btn btn-danger btn-sm", disabled }: {
  children: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      disabled={disabled}
      className={className}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
