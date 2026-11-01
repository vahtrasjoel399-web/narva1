"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";

type Item = { href: string; label: string };

export function MobileMenu({ items, labels, phone }: { items: Item[]; labels: { menu: string; close: string }; phone: { display: string; href: string } }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="btn btn-ghost btn-sm -mr-2 px-2"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? labels.close : labels.menu}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={open ? "x" : "menu"} size={24} />
      </button>
      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 top-16 bottom-0 z-40 animate-rise overflow-y-auto border-t border-line bg-ink">
          <nav className="container-x flex flex-col py-4">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className="flex min-h-14 items-center border-b border-line text-xl font-semibold aria-[current=page]:text-accent"
              >
                {item.label}
              </Link>
            ))}
            <a href={phone.href} className="mt-6 flex min-h-14 items-center gap-3 font-mono text-lg">
              <Icon name="phone" />
              {phone.display}
            </a>
          </nav>
        </div>
      )}
    </div>
  );
}
