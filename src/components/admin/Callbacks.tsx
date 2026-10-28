"use client";

import { useCallback, useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { localeNames } from "@/i18n/config";
import type { CallbackRow } from "@/lib/types";
import { listCallbacks, setCallbackStatus } from "@/app/admin/actions";
import { useAdmin } from "./AdminI18n";
import { useBadges } from "./AdminShell";
import { Empty, LoadingBlock, PageTitle, useToast } from "./ui";

export function Callbacks() {
  const { d, lang } = useAdmin();
  const toast = useToast();
  const { refresh } = useBadges();
  const [rows, setRows] = useState<CallbackRow[] | null>(null);

  const load = useCallback(async () => {
    const r = await listCallbacks();
    if (r.ok) setRows(r.data);
    else toast({ kind: "error", text: d.common.error });
  }, [toast, d]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const toggle = async (c: CallbackRow) => {
    const r = await setCallbackStatus(c.id, c.status === "new" ? "done" : "new");
    if (!r.ok) return toast({ kind: "error", text: d.common.error });
    load();
    refresh();
  };

  return (
    <div>
      <PageTitle>{d.callbacks.title}</PageTitle>
      {rows === null ? (
        <LoadingBlock label={d.common.loading} />
      ) : rows.length === 0 ? (
        <Empty>{d.callbacks.empty}</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((c) => (
            <li key={c.id} className={`card flex flex-col gap-3 p-4 md:flex-row md:items-center ${c.status === "done" ? "opacity-55" : "border-accent-500/50"}`}>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-white">{c.name}</span>
                  <span className="text-xs text-ink-500">
                    {new Date(c.created_at).toLocaleString(lang)} · {localeNames[c.lang]}
                  </span>
                </p>
                {c.comment && <p className="mt-1 whitespace-pre-wrap text-ink-200">{c.comment}</p>}
              </div>
              <div className="flex gap-2">
                <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="btn btn-primary btn-sm flex-1">
                  <Phone size={16} aria-hidden="true" /> {c.phone}
                </a>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggle(c)}>
                  {c.status === "new" ? d.callbacks.markDone : d.callbacks.reopen}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
