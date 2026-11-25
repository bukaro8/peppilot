import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { CycleScheduleForm } from "@/components/protocol-cycle/cycle-schedule-form";
import { CycleHeader } from "@/components/protocol-cycle/cycle-header";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { AuthorizationError } from "@/lib/auth/policy";
import { requireActor } from "@/lib/auth/session";
import { getCatalogueEntries } from "@/lib/catalogue/service";
import { getProtocolCycle, ProtocolCycleError } from "@/lib/protocol-cycle/service";
import { revisionDateBounds } from "@/lib/protocol-cycle/revision-dates";

export const metadata: Metadata = { title: "Revise cycle schedule" };

type SchedulePageProps = {
  params: Promise<{ cycleId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function CycleSchedulePage({ params, searchParams }: SchedulePageProps) {
  const actor = await requireActor();
  const { cycleId } = await params;
  let cycle;
  try {
    cycle = await getProtocolCycle(actor, cycleId);
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ProtocolCycleError) notFound();
    throw error;
  }
  if (!cycle || cycle.status !== "active") notFound();
  const latest = cycle.revisions.at(-1);
  if (!latest) notFound();
  const query = await searchParams;
  const bounds = revisionDateBounds({ startDate: cycle.startDate, plannedEndDate: cycle.plannedEndDate, latestEffectiveFrom: latest.effectiveFrom, lastInterruptionDate: cycle.pauses.map((pause) => pause.resumedOn ?? pause.pausedOn).sort().at(-1) });

  return (
    <main className="min-h-screen bg-secondary/20">
      <CycleHeader />
      <section className="mx-auto w-full max-w-5xl px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <Button variant="ghost" size="sm" asChild><Link href={`/cycles/${cycle.id}`}><ArrowLeft className="size-4" aria-hidden="true" />Back to cycle</Link></Button>
        <div className="mt-6 rounded-[2rem] border bg-background p-6 shadow-sm sm:p-9">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Schedule history</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em]">Revise {cycle.name}</h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Create a new effective-dated schedule. Revision {latest.revisionNumber} remains intact for all earlier dates.</p>
          {query.error ? <div className="mt-6"><FormMessage tone="error">{query.error}</FormMessage></div> : null}
          <div className="mt-9"><CycleScheduleForm catalogue={(await getCatalogueEntries({ ownerUserId: actor.userId })).map(({ id, displayName }) => ({ id, displayName }))} cycleId={cycle.id} initial={latest.steps} minimumDate={bounds.minimumDate} plannedEndDate={bounds.maximumDate} /></div>
        </div>
      </section>
    </main>
  );
}
