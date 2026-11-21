"use client";

import Link from "next/link";
import { CalendarDays, HeartPulse, Home, Menu, Syringe } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", icon: Home, label: "Home", matches: ["/dashboard"] },
  { href: "/calendar/week", icon: CalendarDays, label: "Calendar", matches: ["/calendar"] },
  { href: "/injections", icon: Syringe, label: "Injections", matches: ["/injections"] },
  { href: "/journal", icon: HeartPulse, label: "Journal", matches: ["/journal"] },
  { href: "/more", icon: Menu, label: "More", matches: ["/more", "/protocols", "/cycles", "/catalogue", "/account"] },
];

export function AppNavigation() {
  const pathname = usePathname();
  const active = (matches: string[]) => matches.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return (
    <>
      <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
        {items.map((item) => <Link key={item.href} href={item.href} aria-current={active(item.matches) ? "page" : undefined} className={cn("rounded-full px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40", active(item.matches) ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>{item.label}</Link>)}
      </nav>
      <nav data-mobile-nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-1.5 shadow-[0_-8px_24px_-20px_oklch(0.25_0.03_166/.5)] backdrop-blur md:hidden" aria-label="Main navigation">
        {items.map((item) => { const Icon = item.icon; const selected = active(item.matches); return <Link key={item.href} href={item.href} aria-current={selected ? "page" : undefined} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40", selected ? "bg-secondary/70 text-primary" : "text-muted-foreground")}><Icon className="size-5" aria-hidden="true" />{item.label}</Link>; })}
      </nav>
    </>
  );
}
