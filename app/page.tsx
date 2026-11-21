import { ArrowRight, Compass, FlaskConical, Menu } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const navigation = [
  { label: "Home", href: "#main-content" },
  { label: "Catalogue", href: "/catalogue" },
  { label: "Templates", href: "/templates" },
  { label: "Protocols", href: "/protocols" },
  { label: "Cycles", href: "/cycles" },
  { label: "Calendar", href: "/calendar/week" },
  { label: "Community", href: "#community" },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(circle_at_75%_5%,oklch(0.91_0.07_83/.65),transparent_34%),radial-gradient(circle_at_5%_30%,oklch(0.9_0.06_155/.75),transparent_38%)]" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <a
          href="#main-content"
          className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          aria-label="PepPilot home"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <FlaskConical className="size-5" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-[-0.03em]">PepPilot</span>
        </a>

        <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary navigation">
          {navigation.map((item) => (
            <Button key={item.label} variant="ghost" size="sm" asChild>
              <Link href={item.href}>
                {item.label}
              </Link>
            </Button>
          ))}
          <Button variant="outline" size="sm" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </nav>

        <Button variant="outline" size="icon" className="sm:hidden" aria-label="Open navigation" disabled>
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </header>

      <section
        id="main-content"
        className="mx-auto grid w-full max-w-6xl gap-12 px-5 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:px-10 lg:pt-28"
      >
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/65 px-3.5 py-2 text-sm font-semibold text-primary shadow-sm backdrop-blur">
            <Compass className="size-4" aria-hidden="true" />
            Your journey, clearly mapped
          </div>
          <h1 className="text-balance text-5xl font-bold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Stay on course with <span className="text-primary">PepPilot.</span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
            A calm, organised home for your peptide journey—designed to make tracking feel simple and progress easier to understand.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/sign-in">
                Get started
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <p className="self-center text-sm text-muted-foreground sm:ml-2">
              Secure, password-free sign in.
            </p>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm lg:max-w-none" aria-hidden="true">
          <div className="absolute -inset-6 -z-10 rotate-3 rounded-[2.5rem] bg-secondary/70" />
          <div className="rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-[0_24px_70px_-32px_oklch(0.35_0.08_165/.4)] backdrop-blur sm:p-7">
            <div className="flex items-center justify-between border-b pb-5">
              <div>
                <div className="h-2.5 w-20 rounded-full bg-secondary" />
                <div className="mt-2.5 h-2 w-12 rounded-full bg-muted" />
              </div>
              <div className="size-10 rounded-full bg-accent" />
            </div>
            <div className="grid grid-cols-7 gap-2 py-6">
              {Array.from({ length: 28 }, (_, index) => (
                <div
                  key={index}
                  className={`aspect-square rounded-full ${
                    [4, 9, 15, 22].includes(index) ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <div className="rounded-2xl bg-secondary/65 p-4">
              <div className="h-2.5 w-28 rounded-full bg-primary/25" />
              <div className="mt-3 h-2 w-full rounded-full bg-white/80" />
              <div className="mt-2 h-2 w-3/4 rounded-full bg-white/80" />
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl flex-col gap-2 border-t px-5 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <p>© {new Date().getFullYear()} PepPilot</p>
        <p>Built with clarity and care.</p>
      </footer>
    </main>
  );
}
