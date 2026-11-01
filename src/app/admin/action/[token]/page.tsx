import { siteConfig } from "@/config/site";
import { fmt, localeTags } from "@/i18n";
import { adminDict } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/notify";
import { getServices, serviceName } from "@/lib/services";
import { formatDate, hhmm } from "@/lib/time";
import { EmailActionForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Booking action", robots: { index: false } };

export default async function EmailActionPage({ params }: PageProps<"/admin/action/[token]">) {
  const { token } = await params;
  const { t, lang } = await adminDict();
  const ta = t.action;

  const valid = /^[A-Za-z0-9_-]{40,60}$/.test(token);
  const { data: action } = valid
    ? await supabaseAdmin().from("email_actions").select("action, used_at, expires_at, booking_id").eq("token_hash", hashToken(token)).maybeSingle()
    : { data: null };
  const { data: b } = action ? await supabaseAdmin().from("bookings").select("*").eq("id", action.booking_id).single() : { data: null };

  let problem: string | null = null;
  if (!action || !b) problem = ta.invalid;
  else if (action.used_at) problem = ta.used;
  else if (new Date(action.expires_at) <= new Date()) problem = ta.expired;
  else if (!["new", "confirmed"].includes(b.status)) problem = ta.closed;

  const services = b ? await getServices({ includeInactive: true }) : [];

  return (
    <main className="mx-auto max-w-lg p-5 py-10">
      <p className="eyebrow">{siteConfig.name}</p>
      {b && (
        <>
          <h1 className="mt-2 font-mono text-2xl">{fmt(ta.title, { n: b.number })}</h1>
          <dl className="mt-5 divide-y divide-line border-y border-line">
            <div className="py-3">
              <dt className="sr-only">{t.bookings.when}</dt>
              <dd className="font-mono text-lg capitalize">
                {formatDate(b.date, localeTags[lang], { weekday: "long", day: "numeric", month: "long" })} {hhmm(b.start_time)}–{hhmm(b.end_time)}
              </dd>
            </div>
            <div className="py-3">
              <dt className="sr-only">{t.bookings.customer}</dt>
              <dd>
                <strong>{b.customer_name}</strong> ·{" "}
                <a className="link font-mono" href={`tel:${b.phone.replace(/[^\d+]/g, "")}`}>
                  {b.phone}
                </a>
              </dd>
            </div>
            <div className="py-3 text-muted">
              {b.car_make} {b.car_model} · {(b.service_ids as string[]).map((id) => serviceName(services.find((s) => s.id === id), lang)).join(", ")}
            </div>
            {b.comment && <div className="whitespace-pre-wrap py-3">{b.comment}</div>}
          </dl>
        </>
      )}
      {problem ? (
        <p role="alert" className="mt-6 rounded-md border border-line-strong p-4">
          {problem}
        </p>
      ) : (
        <EmailActionForm token={token} action={action!.action as "confirm" | "decline"} t={ta} />
      )}
      {b && (
        <a href={`/admin/bookings/${b.id}`} className="btn btn-secondary mt-6">
          {ta.openAdmin}
        </a>
      )}
    </main>
  );
}
