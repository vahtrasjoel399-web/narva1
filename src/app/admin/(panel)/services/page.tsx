import { adminDict } from "@/lib/auth";
import { getServices } from "@/lib/services";
import { ServiceEditor } from "@/components/admin/service-editor";

export const metadata = { title: "Services" };

export default async function ServicesAdmin() {
  const { t } = await adminDict();
  const services = await getServices({ includeInactive: true });
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold md:text-3xl">{t.services.title}</h1>
      <p className="mt-2 text-sm text-muted">{t.services.note}</p>
      <ServiceEditor services={services} t={t} />
    </div>
  );
}
