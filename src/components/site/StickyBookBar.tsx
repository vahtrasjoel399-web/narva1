"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Phone } from "lucide-react";

/** Mobile-only sticky "Call / Book now" bar (hidden on the booking flow itself). */
export function StickyBookBar({ lang, labels, phoneHref }: {
  lang: string;
  labels: { call: string; book: string };
  phoneHref: string;
}) {
  const pathname = usePathname();
  if (pathname.startsWith(`/${lang}/booking`)) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-800 bg-ink-950/92 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md md:hidden">
      <div className="flex gap-3">
        <a href={phoneHref} className="btn btn-secondary flex-1">
          <Phone size={18} aria-hidden="true" /> {labels.call}
        </a>
        <Link href={`/${lang}/booking`} className="btn btn-primary flex-[1.6]">
          <CalendarDays size={18} aria-hidden="true" /> {labels.book}
        </Link>
      </div>
    </div>
  );
}
