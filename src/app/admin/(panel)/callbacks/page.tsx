import { localeTags } from "@/i18n";
import { emailDictionaries } from "@/i18n/email";
import { adminDict } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Icon } from "@/components/ui/icon";
import { NewBadge, telHref } from "@/components/admin/ui";
import { CallbackToggle } from "@/components/admin/callback-toggle";

export const metadata = { title: "Callbacks" };

export default async function CallbacksPage() {
  const { t, lang } = await adminDict();
  const db = supabaseAdmin();
  const { data } = await db.from("callback_requests").select("*").order("status").order("created_at", { ascending: false }).limit(100);
  const unseen = (data ?? []).filter((c) => !c.seen_by_admin).map((c) => c.id);
  if (unseen.length) await db.from("callback_requests").update({ seen_by_admin: true }).in("id", unseen);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold md:text-3xl">{t.callbacks.title}</h1>
      {!data?.length ? (
        <p className="mt-6 text-muted">{t.callbacks.empty}</p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {data.map((c) => (
            <li key={c.id} className={`flex flex-wrap items-start gap-3 py-4 ${c.status === "done" ? "opacity-55" : ""}`}>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {c.name} {unseen.includes(c.id) && <NewBadge label={t.common.new} />}
                </p>
                <p className="font-mono text-sm text-muted">
                  {c.phone} · {new Date(c.created_at).toLocaleString(localeTags[lang], { timeZone: "Europe/Tallinn", dateStyle: "short", timeStyle: "short" })} · {emailDictionaries[lang].langNames[c.lang as "et" | "ru" | "en"]}
                </p>
                {c.comment && <p className="mt-2 whitespace-pre-wrap">{c.comment}</p>}
              </div>
              <a href={telHref(c.phone)} className="btn btn-primary btn-sm">
                <Icon name="phone" size={16} /> {t.common.call}
              </a>
              <CallbackToggle id={c.id} done={c.status === "done"} labels={{ done: t.callbacks.markDone, reopen: t.callbacks.reopen }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
