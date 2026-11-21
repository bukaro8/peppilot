import { Bell, FlaskConical } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AppNavigation } from "@/components/navigation/app-navigation";
import { requireActor } from "@/lib/auth/session";
import { getDashboardInjectionActions } from "@/lib/injection/service";

export async function CalendarHeader({ pendingCount }: { pendingCount?: number }) {
  const resolvedPendingCount = pendingCount ?? (
    await getDashboardInjectionActions(
      await requireActor(),
      new Date().toISOString().slice(0, 10),
    )
  ).pendingCount;

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8 lg:px-10">
      <Link href="/dashboard" className="inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40" aria-label="PepPilot dashboard">
        <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><FlaskConical className="size-5" aria-hidden="true" /></span>
        <span className="text-xl font-bold tracking-[-0.03em]">PepPilot</span>
      </Link>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" asChild><Link href="/dashboard#pending-actions" className="relative" aria-label={resolvedPendingCount ? `${resolvedPendingCount} pending injection action${resolvedPendingCount === 1 ? "" : "s"}` : "No pending injection actions"}><Bell className="size-4" aria-hidden="true" />{resolvedPendingCount ? <span className="absolute right-1 top-1 size-2.5 rounded-full border-2 border-background bg-red-600" aria-hidden="true" /> : null}</Link></Button>
        <AppNavigation />
      </div>
    </header>
  );
}
