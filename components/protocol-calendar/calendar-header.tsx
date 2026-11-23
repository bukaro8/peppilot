import { Bell } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AppBrand } from "@/components/brand/app-brand";
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
    <header className="app-topbar mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8 lg:px-10">
      <div className="lg:hidden"><AppBrand compact href="/dashboard" /></div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" asChild><Link href="/dashboard#pending-actions" className="relative" aria-label={resolvedPendingCount ? `${resolvedPendingCount} pending injection action${resolvedPendingCount === 1 ? "" : "s"}` : "No pending injection actions"}><Bell className="size-4" aria-hidden="true" />{resolvedPendingCount ? <span className="absolute right-1 top-1 size-2.5 rounded-full border-2 border-background bg-red-600" aria-hidden="true" /> : null}</Link></Button>
        <AppNavigation />
      </div>
    </header>
  );
}
