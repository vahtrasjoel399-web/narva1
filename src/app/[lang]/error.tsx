"use client";

import { useParams } from "next/navigation";
import { getDictionary } from "@/i18n";
import { isLocale } from "@/i18n/config";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams<{ lang: string }>();
  const d = getDictionary(isLocale(params.lang) ? params.lang : "et");
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center" role="alert">
      <h1 className="text-3xl font-extrabold text-white">{d.error.title}</h1>
      <p className="mt-2 max-w-md text-ink-400">{d.error.text}</p>
      <button type="button" className="btn btn-primary mt-8" onClick={reset}>
        {d.error.retry}
      </button>
    </div>
  );
}
