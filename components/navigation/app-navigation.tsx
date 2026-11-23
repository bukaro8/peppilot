"use client";

import Link from "next/link";
import { BookOpen, CalendarDays, CalendarRange, ChevronRight, HeartPulse, Home, Menu, Settings, Syringe, UserRound, Workflow } from "lucide-react";
import { usePathname } from "next/navigation";

import { AppBrand } from "@/components/brand/app-brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

export const mobileNavigationItems = [
  { href: "/dashboard", icon: Home, label: "Home", matches: ["/dashboard"] },
  { href: "/calendar/week", icon: CalendarDays, label: "Calendar", matches: ["/calendar"] },
  { href: "/injections", icon: Syringe, label: "Injections", matches: ["/injections"] },
  { href: "/journal", icon: HeartPulse, label: "Journal", matches: ["/journal"] },
  { href: "/more", icon: Menu, label: "More", matches: ["/more", "/protocols", "/cycles", "/templates", "/catalogue", "/account"] },
];

export const desktopNavigationItems = [
  { href: "/dashboard", icon: Home, label: "Home", matches: ["/dashboard"] },
  { href: "/calendar/week", icon: CalendarDays, label: "Calendar", matches: ["/calendar"] },
  { href: "/injections", icon: Syringe, label: "Injections", matches: ["/injections"] },
  { href: "/journal", icon: HeartPulse, label: "Journal", matches: ["/journal"] },
  { href: "/templates", icon: BookOpen, label: "Protocol library", matches: ["/templates"] },
  { href: "/protocols", icon: Workflow, label: "My protocols", matches: ["/protocols"] },
  { href: "/cycles", icon: CalendarRange, label: "My cycles", matches: ["/cycles"] },
  { href: "/account", icon: UserRound, label: "Profile", matches: ["/account"] },
  { href: "/account#settings", icon: Settings, label: "Settings", matches: ["/account/settings"] },
];

export function AppNavigation() {
  const pathname = usePathname();
  const active = (matches: string[]) => matches.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return (
    <>
      <aside data-app-sidebar className="fixed inset-y-0 left-0 z-50 hidden w-72 flex-col overflow-y-auto bg-[#20284b] px-5 py-6 text-white shadow-[16px_0_50px_-28px_rgba(25,31,67,.7)] lg:flex">
        <div className="px-2"><AppBrand href="/dashboard" inverse /></div>
        <nav className="mt-10 space-y-1" aria-label="Main navigation">
          {desktopNavigationItems.map((item) => { const Icon = item.icon; const selected = active(item.matches); return <Link key={item.href} href={item.href} aria-current={selected ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-4 text-[0.95rem] font-semibold text-indigo-100/80 transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-violet-300/60", selected ? "bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-lg shadow-violet-950/25" : "hover:bg-white/10 hover:text-white")}><Icon className="size-5" aria-hidden="true" />{item.label}</Link>; })}
        </nav>
        <div className="mt-auto space-y-3 pt-8">
          <Link href="/cycles" className="block rounded-2xl border border-white/15 bg-white/[0.07] p-4 transition hover:bg-white/10"><div className="flex items-center justify-between"><CalendarRange className="size-5 text-violet-300" aria-hidden="true" /><ChevronRight className="size-4 text-indigo-200" aria-hidden="true" /></div><p className="mt-3 text-xs font-semibold uppercase tracking-wider text-indigo-200/70">Your journey</p><p className="mt-1 font-bold">View active cycles</p></Link>
          <ThemeToggle inverse />
        </div>
      </aside>
      <nav data-mobile-nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-violet-200/70 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-1.5 shadow-[0_-12px_30px_-22px_rgba(53,45,110,.5)] backdrop-blur lg:hidden dark:border-white/10 dark:bg-[#252c52]/95" aria-label="Main navigation">
        {mobileNavigationItems.map((item) => { const Icon = item.icon; const selected = active(item.matches); return <Link key={item.href} href={item.href} aria-current={selected ? "page" : undefined} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40", selected ? "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200" : "text-muted-foreground")}><Icon className="size-5" aria-hidden="true" />{item.label}</Link>; })}
      </nav>
    </>
  );
}
