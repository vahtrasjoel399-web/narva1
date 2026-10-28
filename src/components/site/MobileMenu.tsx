"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Phone, X } from "lucide-react";
import { NavLinks, type NavItem } from "./NavLinks";

export function MobileMenu({ items, labels, phone, phoneHref, bookHref }: {
  items: NavItem[];
  labels: { menu: string; close: string; call: string; book: string; nav: string };
  phone: string;
  phoneHref: string;
  bookHref: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="btn btn-ghost btn-sm !px-2.5"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(true)}
      >
        <Menu size={24} aria-hidden="true" />
        <span className="sr-only">{labels.menu}</span>
      </button>

      {open && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label={labels.menu}
          className="fixed inset-0 z-50 flex flex-col bg-ink-950/98 backdrop-blur-sm animate-fade-in"
        >
          <div className="container-x flex h-16 items-center justify-end">
            <button type="button" className="btn btn-ghost btn-sm !px-2.5" onClick={() => setOpen(false)}>
              <X size={26} aria-hidden="true" />
              <span className="sr-only">{labels.close}</span>
            </button>
          </div>
          <nav aria-label={labels.nav} className="container-x flex flex-1 flex-col">
            <NavLinks
              items={items}
              onNavigate={() => setOpen(false)}
              className="flex flex-col gap-1"
              linkClassName="block rounded-xl px-2 py-3 font-display text-3xl font-bold text-ink-300 transition-colors hover:text-white"
            />
            <div className="mt-auto flex flex-col gap-3 pb-8">
              <a href={phoneHref} className="btn btn-secondary btn-lg w-full">
                <Phone size={20} aria-hidden="true" /> {labels.call} · {phone}
              </a>
              <Link href={bookHref} onClick={() => setOpen(false)} className="btn btn-primary btn-lg w-full">
                {labels.book}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
