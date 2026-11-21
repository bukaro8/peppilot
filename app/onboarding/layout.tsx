import Link from "next/link";
import { FlaskConical } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function OnboardingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-secondary/20">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] bg-[radial-gradient(circle_at_78%_4%,oklch(0.91_0.07_83/.65),transparent_34%),radial-gradient(circle_at_3%_35%,oklch(0.9_0.06_155/.75),transparent_38%)]" />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/onboarding" className="inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><FlaskConical className="size-5" aria-hidden="true" /></span>
          <span className="text-xl font-bold tracking-[-0.03em]">PepPilot</span>
        </Link>
        <Button variant="ghost" size="sm" asChild><Link href="/dashboard">Save and exit</Link></Button>
      </header>
      {children}
    </main>
  );
}
