import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowLeft, ArrowRight, CalendarDays, CalendarPlus, CheckCircle2 } from "lucide-react";

import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { requireCompletedProfile } from "@/lib/auth/session";
import { getMemberProtocols } from "@/lib/member-protocol/service";
import { getProtocolCycles } from "@/lib/protocol-cycle/service";

export const metadata: Metadata = { title: "Start your cycles" };

export default async function OnboardingCyclesPage({ searchParams }: { searchParams: Promise<{ started?: string }> }) {
  const { actor } = await requireCompletedProfile();
  const [protocols, cycles, query] = await Promise.all([getMemberProtocols(actor), getProtocolCycles(actor), searchParams]);
  const runningCycles = cycles.filter((cycle) => cycle.status === "active" || cycle.status === "paused");
  const runningByProtocol = new Map<string, typeof runningCycles>();
  for (const cycle of runningCycles) {
    if (!cycle.sourceProtocolId) continue;
    const current = runningByProtocol.get(cycle.sourceProtocolId) ?? [];
    current.push(cycle);
    runningByProtocol.set(cycle.sourceProtocolId, current);
  }
  return (
    <section className="mx-auto w-full max-w-5xl px-5 pb-16 pt-4 sm:px-8 lg:px-10">
      <OnboardingProgress currentStep={4} />
      <div className="mt-8 rounded-[2rem] border bg-background p-5 shadow-sm sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Step 4 of 5</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Start your cycles</h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Choose independent start dates for any saved protocols you want to activate. Each cycle keeps its own schedule and history.</p>
        {query.started ? <div className="mt-6"><FormMessage tone="success">Cycle started. Start another or head to your dashboard.</FormMessage></div> : null}
        {runningCycles.length ? <div className="mt-7 rounded-2xl border border-emerald-600/20 bg-emerald-50 p-5 text-emerald-950 dark:bg-emerald-950/25 dark:text-emerald-100"><p className="inline-flex items-center gap-2 font-bold"><Activity className="size-5" aria-hidden="true" />{runningCycles.length} active cycle{runningCycles.length === 1 ? "" : "s"}</p><p className="mt-1 text-sm opacity-80">Your dashboard is ready with schedule-based next actions.</p></div> : null}
        <div className="mt-7 grid gap-4 sm:grid-cols-2">{protocols.map((protocol) => { const active = runningByProtocol.get(protocol.id) ?? []; return <article key={protocol.id} className="flex flex-col rounded-2xl border bg-muted/20 p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{protocol.name}</h2><p className="mt-1 text-sm text-muted-foreground">{protocol.durationDays} days</p></div>{active.length ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"><CheckCircle2 className="size-3.5" aria-hidden="true" />Active</span> : null}</div>{active.length ? <ul className="mt-4 space-y-2 text-sm text-muted-foreground">{active.map((cycle) => <li key={cycle.id}>{cycle.startDate} → {cycle.plannedEndDate} · <span className="capitalize">{cycle.status}</span></li>)}</ul> : <p className="mt-4 text-sm text-muted-foreground">Not active yet.</p>}<Button className="mt-5 w-full" variant={active.length ? "outline" : "default"} asChild><Link href={`/cycles/new?protocolId=${protocol.id}&onboarding=1`}><CalendarPlus className="size-4" aria-hidden="true" />{active.length ? "Start another cycle" : "Start cycle"}</Link></Button></article>; })}</div>
        {!protocols.length ? <div className="mt-7 rounded-2xl border border-dashed p-8 text-center"><CalendarPlus className="mx-auto size-8 text-primary" aria-hidden="true" /><h2 className="mt-4 text-xl font-bold">No saved protocols yet</h2><p className="mt-2 text-sm text-muted-foreground">Create a protocol first, or skip and return whenever you are ready.</p><Button className="mt-5" asChild><Link href="/onboarding/protocols">Create a protocol</Link></Button></div> : null}
        <div className="mt-9 flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"><Button variant="ghost" asChild><Link href="/onboarding/protocols"><ArrowLeft className="size-4" aria-hidden="true" />Back</Link></Button><div className="flex flex-col gap-3 sm:flex-row">{runningCycles.length ? <Button variant="outline" asChild><Link href="/calendar/week"><CalendarDays className="size-4" aria-hidden="true" />View calendar</Link></Button> : <Button variant="ghost" asChild><Link href="/dashboard?onboarding=skipped">Skip for now</Link></Button>}<Button size="lg" asChild><Link href="/dashboard?welcome=1">Go to dashboard<ArrowRight className="size-4" aria-hidden="true" /></Link></Button></div></div>
      </div>
    </section>
  );
}
