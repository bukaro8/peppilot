import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight, CalendarRange, CirclePause, CircleStop } from "lucide-react";

import { CycleHeader } from "@/components/protocol-cycle/cycle-header";
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
      <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8 lg:px-10">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-primary">Private workspace</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">My protocol cycles</h1><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Each cycle is independent, with its own dates, pauses, status and schedule history.</p></div>

        {cycles.length > 0 ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cycles.map((cycle) => {
              const Icon = statusIcons[cycle.status];
              return (
                <Link key={cycle.id} href={`/cycles/${cycle.id}`} className="group flex min-h-60 flex-col rounded-[1.75rem] border bg-background p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
                  <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold capitalize"><Icon className="size-3.5" aria-hidden="true" />{cycle.status}</span>{cycle.sourceTemplateVersionId ? <span className="text-xs font-semibold text-primary">Template v{cycle.sourceTemplateVersionNumber}</span> : null}</div>
                  <h2 className="mt-6 text-2xl font-bold tracking-[-0.035em]">{cycle.name}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{cycle.startDate} → {cycle.plannedEndDate ?? "Ongoing"}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{cycle.firstDeviatedOn ? `Template changed from ${cycle.firstDeviatedOn}` : cycle.templateInitiallyMatching ? "Original template schedule" : "Custom schedule"}</p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold">View cycle <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-10 rounded-[2rem] border border-dashed bg-background p-8 text-center sm:p-12"><CalendarRange className="mx-auto size-8 text-primary" aria-hidden="true" /><h2 className="mt-5 text-2xl font-bold">No cycles yet</h2><p className="mx-auto mt-2 max-w-lg leading-7 text-muted-foreground">Open one of your saved protocol drafts to start an independent cycle.</p><Link className="mt-5 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline" href="/protocols">Choose a saved protocol</Link></div>
        )}
      </section>
    </main>
  );
}
