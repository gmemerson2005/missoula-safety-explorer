"use client";
// Client Component — the nav needs usePathname to mark the current page.
// Display-only: what each destination actually renders is decided on the
// server (proxy gate + server components), never by this component.

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home", isActive: (p: string) => p === "/" },
  {
    href: "/map",
    label: "Map",
    // District drill-downs are part of the map experience.
    isActive: (p: string) => p.startsWith("/map") || p.startsWith("/district"),
  },
  {
    href: "/analyst",
    label: "Analyst",
    isActive: (p: string) => p.startsWith("/analyst") || p.startsWith("/login"),
  },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="flex items-center gap-1 font-mono text-xs uppercase tracking-widest"
    >
      {LINKS.map((link) => {
        const active = link.isActive(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`border-b-2 px-3 py-1.5 transition-colors duration-150 ${
              active
                ? "border-foreground text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
