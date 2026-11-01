"use client";
import { useParams } from "next/navigation";
import { siteConfig } from "@/config/site";
import { getDictionary, isLocale } from "@/i18n";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams<{ lang?: string }>();
  const t = getDictionary(isLocale(params?.lang) ? params.lang : "et").error;
  return (
    <div className="container-x py-24">
      <h1 className="text-3xl font-bold">{t.title}</h1>
      <p className="mt-3 text-muted">{t.text}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">
          {t.retry}
        </button>
        <a href={`tel:${siteConfig.phone.tel}`} className="btn btn-secondary font-mono">
          {siteConfig.phone.display}
        </a>
      </div>
    </div>
  );
}
