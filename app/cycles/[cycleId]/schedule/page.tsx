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

export const metadata: Metadata = { title: "Revise cycle schedule" };

type SchedulePageProps = {
  params: Promise<{ cycleId: string }>;
  searchParams: Promise<{ error?: string }>;
};

function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

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
          <div className="mt-9"><CycleScheduleForm catalogue={(await getCatalogueEntries()).map(({ id, displayName }) => ({ id, displayName }))} cycleId={cycle.id} initial={latest.steps} minimumDate={nextDate(latest.effectiveFrom)} plannedEndDate={cycle.plannedEndDate} /></div>
        </div>
      </section>
    </main>
  );
}
