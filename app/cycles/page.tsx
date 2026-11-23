import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight, BookOpen, CalendarRange, CirclePause, CircleStop, FlaskConical, Plus } from "lucide-react";

import { CycleHeader } from "@/components/protocol-cycle/cycle-header";
import { Button } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/session";
import { getProtocolCycles } from "@/lib/protocol-cycle/service";

export const metadata: Metadata = { title: "My protocol cycles" };

const statusIcons = {
  active: Activity,
  paused: CirclePause,
  completed: CalendarRange,
  cancelled: CircleStop,
};

export default async function CyclesPage() {
  const actor = await requireActor();
  const cycles = await getProtocolCycles(actor);

  return (
    <main className="min-h-screen bg-secondary/20">
      <CycleHeader />
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-8 sm:pt-10 lg:px-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary sm:text-sm">Private workspace</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] sm:text-5xl">My protocol cycles</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:mt-3 sm:text-base sm:leading-7">Run multiple independent cycles without changing or stopping the cycles already in progress.</p></div><Button size="lg" asChild><Link href="/protocols?start=1"><Plus className="size-4" aria-hidden="true" />Start new cycle</Link></Button></div>
        <nav className="mt-5 flex flex-wrap gap-2" aria-label="New cycle options"><Button variant="outline" size="sm" asChild><Link href="/templates"><BookOpen className="size-4" aria-hidden="true" />Browse protocol library</Link></Button><Button variant="outline" size="sm" asChild><Link href="/protocols/new"><FlaskConical className="size-4" aria-hidden="true" />Create custom protocol</Link></Button></nav>

        {cycles.length > 0 ? (
          <div className="mt-7 grid gap-3 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
            {cycles.map((cycle) => {
              const Icon = statusIcons[cycle.status];
              return (
                <Link key={cycle.id} href={`/cycles/${cycle.id}`} className="group flex flex-col rounded-2xl border bg-background p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 sm:min-h-60 sm:rounded-[1.75rem] sm:p-6">
                  <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold capitalize"><Icon className="size-3.5" aria-hidden="true" />{cycle.status}</span>{cycle.sourceTemplateVersionId ? <span className="text-xs font-semibold text-primary">Template v{cycle.sourceTemplateVersionNumber}</span> : null}</div>
                  <h2 className="mt-4 text-xl font-bold tracking-[-0.035em] sm:mt-6 sm:text-2xl">{cycle.name}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{cycle.startDate} → {cycle.plannedEndDate ?? "Ongoing"}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{cycle.firstDeviatedOn ? `Template changed from ${cycle.firstDeviatedOn}` : cycle.templateInitiallyMatching ? "Original template schedule" : "Custom schedule"}</p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold">View cycle <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-dashed bg-background p-6 text-center sm:mt-10 sm:rounded-[2rem] sm:p-12"><CalendarRange className="mx-auto size-8 text-primary" aria-hidden="true" /><h2 className="mt-4 text-xl font-bold sm:mt-5 sm:text-2xl">No cycles yet</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">Choose a saved protocol, browse the approved library or create a custom schedule.</p><Button className="mt-5" asChild><Link href="/protocols?start=1"><Plus className="size-4" aria-hidden="true" />Start new cycle</Link></Button></div>
        )}
      </section>
    </main>
  );
}
