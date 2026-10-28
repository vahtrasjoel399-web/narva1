"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

export function NavLinks({ items, className, linkClassName, onNavigate }: {
  items: NavItem[];
  className?: string;
  linkClassName?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <ul className={className}>
      {items.map((item) => {
        const active = item.href.split("/").length <= 2 ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`${linkClassName ?? ""} ${active ? "text-white" : ""}`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function StaticNavLinks({ items, className, linkClassName }: {
  items: NavItem[];
  className?: string;
  linkClassName?: string;
}) {
  return (
    <ul className={className}>
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className={linkClassName}>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
