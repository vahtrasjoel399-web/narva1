import Link from "next/link";
import { lang } from "next/root-params";
import { getDictionary } from "@/i18n";
import { isLocale } from "@/i18n/config";

export default async function NotFound() {
  const current = await lang();
  const l = isLocale(current) ? current : "et";
  const d = getDictionary(l);
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-8xl font-extrabold text-accent-500">404</p>
      <h1 className="mt-4 text-3xl font-extrabold text-white">{d.notFound.title}</h1>
      <p className="mt-2 text-ink-400">{d.notFound.text}</p>
      <Link href={`/${l}`} className="btn btn-primary mt-8">
        {d.notFound.home}
      </Link>
    </div>
  );
}
