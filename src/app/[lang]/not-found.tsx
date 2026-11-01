"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getDictionary, isLocale } from "@/i18n";

export default function NotFound() {
  const params = useParams<{ lang?: string }>();
  const lang = isLocale(params?.lang) ? params.lang : "et";
  const t = getDictionary(lang).notFound;
  return (
    <div className="container-x py-24 md:py-32">
      <p className="font-mono text-6xl text-accent">404</p>
      <h1 className="mt-4 text-3xl font-bold md:text-4xl">{t.title}</h1>
      <p className="mt-3 text-muted">{t.text}</p>
      <Link href={`/${lang}`} className="btn btn-primary mt-8">
        {t.home}
      </Link>
    </div>
  );
}
