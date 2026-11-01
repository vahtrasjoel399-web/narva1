"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";

/** Sticky bottom bar on phones: Call + Book. Hidden inside the booking flow. */
export function MobileCta({ bookHref, telHref, labels }: { bookHref: string; telHref: string; labels: { book: string; call: string } }) {
  const pathname = usePathname() ?? "";
  if (pathname.includes("/booking")) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <a href={telHref} className="btn btn-secondary px-4" aria-label={labels.call}>
          <Icon name="phone" />
          <span>{labels.call}</span>
        </a>
        <Link href={bookHref} className="btn btn-primary">
          {labels.book}
        </Link>
      </div>
    </div>
  );
}
