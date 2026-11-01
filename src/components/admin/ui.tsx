import type { AdminDictionary } from "@/i18n/admin";

const colors: Record<string, string> = {
  new: "border-info/60 text-info",
  confirmed: "border-ok/60 text-ok",
  done: "border-line-strong text-muted",
  cancelled: "border-danger/60 text-danger",
  no_show: "border-danger/60 text-danger",
};

export function StatusBadge({ status, t }: { status: string; t: AdminDictionary }) {
  return <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold ${colors[status] ?? ""}`}>{t.status[status as keyof AdminDictionary["status"]] ?? status}</span>;
}

export function NewBadge({ label }: { label: string }) {
  return <span className="inline-flex animate-pulse-ring items-center rounded-sm bg-accent px-1.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-on-accent">{label}</span>;
}

export const telHref = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;
