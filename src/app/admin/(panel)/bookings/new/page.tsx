import { adminDict } from "@/lib/auth";
import { getServices } from "@/lib/services";
import { getDictionary, localeTags } from "@/i18n";
import { ManualBookingForm } from "@/components/admin/manual-booking-form";

export const metadata = { title: "Phone booking" };

export default async function NewBookingPage() {
  const { t, lang } = await adminDict();
  const services = await getServices();
  const d = getDictionary(lang);
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold md:text-3xl">{t.manual.title}</h1>
      <p className="mt-2 text-muted">{t.manual.intro}</p>
      <ManualBookingForm services={services.map((s) => ({ id: s.id, name: s.name[lang], duration: s.duration_min }))} t={t} booking={d.booking} localeTag={localeTags[lang]} defaultLang={lang} />
    </div>
  );
}
