import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowLeft, CalendarClock, CalendarDays, CalendarPlus, CheckCircle2, Clock3, History, PencilLine, Target } from "lucide-react";
import { notFound } from "next/navigation";

import {
  cancelProtocolCycleAction,
  completeProtocolCycleAction,
  pauseProtocolCycleAction,
  resumeProtocolCycleAction,
} from "@/app/cycles/actions";
import { CycleHeader } from "@/components/protocol-cycle/cycle-header";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { AuthorizationError } from "@/lib/auth/policy";
import { requireActor } from "@/lib/auth/session";
import { getCycleAdherence, getInjectionRecordsForCycle } from "@/lib/injection/service";
import { formatInjectionSite } from "@/lib/injection/sites";
import { getCycleGoals } from "@/lib/health/cycle-goal-service";
import { formatOutcomeUnit, getOutcomeMetric } from "@/lib/health/outcome-metrics";
import {
  completeMatchingWeeksBeforeDeviation,
  getProtocolCycle,
  ProtocolCycleError,
} from "@/lib/protocol-cycle/service";
import { formatDoseAmount, formatTemplateFrequency } from "@/lib/protocol-template/presentation";
import { calculateAdministration } from "@/lib/approved-protocol/calculations";

export const metadata: Metadata = { title: "Protocol cycle" };

type CyclePageProps = {
  params: Promise<{ cycleId: string }>;
  searchParams: Promise<{
    created?: string;
    ended?: string;
    error?: string;
    paused?: string;
    resumed?: string;
    revised?: string;
    goals?: string;
  }>;
};

function LifecycleForm({
  action,
  cycleId,
  label,
  minimum,
  variant = "outline",
}: {
  action: (formData: FormData) => void | Promise<void>;
  cycleId: string;
  label: string;
  minimum: string;
  variant?: "default" | "outline";
}) {
  return (
    <form action={action} className="flex min-w-52 flex-1 flex-col gap-2 rounded-2xl border bg-muted/25 p-4">
      <label className="text-sm font-semibold">{label} date<input name="date" type="date" min={minimum} required className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /></label>
      <input type="hidden" name="cycleId" value={cycleId} />
      <Button type="submit" variant={variant}>{label}</Button>
    </form>
  );
}

export default async function CyclePage({ params, searchParams }: CyclePageProps) {
  const actor = await requireActor();
  const { cycleId } = await params;
  let cycle;
  try {
    cycle = await getProtocolCycle(actor, cycleId);
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ProtocolCycleError) notFound();
    throw error;
  }
  if (!cycle) notFound();
  const query = await searchParams;
  const matchingWeeks = completeMatchingWeeksBeforeDeviation(cycle);
  const asOfDate = new Date().toISOString().slice(0, 10);
  const [adherence, injectionRecords, goalData] = await Promise.all([
    getCycleAdherence(actor, cycle.id, asOfDate),
    getInjectionRecordsForCycle(actor, cycle.id),
    getCycleGoals(actor, cycle.id),
  ]);
  const preparationRows = cycle.preparation?.concentrationMgPerMl
    ? (cycle.revisions.at(-1)?.steps ?? []).map((step) => ({
        ...step,
        calculation: calculateAdministration(
          step.doseAmount,
          step.doseUnit,
          cycle.preparation!.concentrationMgPerMl!,
          cycle.preparation!.syringeUnitsPerMl || undefined,
        ),
      }))
    : [];

  return (
    <main className="min-h-screen bg-secondary/20">
      <CycleHeader />
      <article className="mx-auto w-full max-w-5xl px-4 pb-16 pt-5 sm:px-8 sm:pt-8 lg:px-10">
        <Button variant="ghost" size="sm" asChild><Link href="/cycles"><ArrowLeft className="size-4" aria-hidden="true" />Back to cycles</Link></Button>
        <div className="mt-4 rounded-2xl border bg-background p-5 shadow-sm sm:mt-6 sm:rounded-[2rem] sm:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div><span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold capitalize"><Activity className="size-3.5" aria-hidden="true" />{cycle.status}</span><h1 className="mt-4 text-3xl font-bold tracking-[-0.05em] sm:mt-6 sm:text-5xl">{cycle.name}</h1><p className="mt-2 text-sm text-muted-foreground sm:mt-3 sm:text-base">{cycle.startDate} → {cycle.plannedEndDate ?? "Ongoing"}</p></div>
            {cycle.status === "active" ? <div className="flex flex-wrap gap-2">{cycle.durationType === "as_needed" ? <Button asChild><Link href={`/injections/new/as-needed?cycleId=${cycle.id}`}><CheckCircle2 className="size-4" aria-hidden="true" />Record administration</Link></Button> : null}<Button variant={cycle.durationType === "as_needed" ? "outline" : "default"} asChild><Link href={`/cycles/${cycle.id}/schedule`}><PencilLine className="size-4" aria-hidden="true" />Revise schedule</Link></Button></div> : null}
          </div>

          {query.error ? <div className="mt-6"><FormMessage tone="error">{query.error}</FormMessage></div> : null}
          {query.created ? <div className="mt-6 space-y-4"><FormMessage tone="success">Independent cycle started. Its scheduled actions are ready.</FormMessage><div className="flex flex-col gap-2 sm:flex-row"><Button asChild><Link href={`/calendar/week?date=${cycle.startDate}`}><CalendarDays className="size-4" aria-hidden="true" />View calendar</Link></Button>{cycle.sourceProtocolId ? <Button variant="outline" asChild><Link href={`/cycles/new?protocolId=${cycle.sourceProtocolId}`}><CalendarPlus className="size-4" aria-hidden="true" />Start another cycle</Link></Button> : null}</div></div> : null}
          {query.paused ? <div className="mt-6"><FormMessage tone="success">Cycle paused and interruption recorded.</FormMessage></div> : null}
          {query.resumed ? <div className="mt-6"><FormMessage tone="success">Cycle resumed.</FormMessage></div> : null}
          {query.revised ? <div className="mt-6"><FormMessage tone="success">New schedule revision added without changing earlier history.</FormMessage></div> : null}
          {query.ended ? <div className="mt-6"><FormMessage tone="success">Cycle status updated.</FormMessage></div> : null}
          {query.goals ? <div className="mt-6"><FormMessage tone="success">Cycle goals and baseline snapshots saved.</FormMessage></div> : null}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <section className="rounded-2xl border bg-muted/30 p-5"><CalendarClock className="size-5 text-primary" aria-hidden="true" /><h2 className="mt-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cycle dates</h2><p className="mt-2 font-semibold">Started {cycle.startDate}</p><p className="mt-1 text-sm text-muted-foreground">{cycle.plannedEndDate ? `Expected completion ${cycle.plannedEndDate}` : "No automatic stopping date"}</p>{cycle.endedOn ? <p className="mt-1 text-sm text-muted-foreground">Ended {cycle.endedOn}</p> : null}</section>
            <section className="rounded-2xl border bg-muted/30 p-5"><History className="size-5 text-primary" aria-hidden="true" /><h2 className="mt-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Protocol provenance</h2>{cycle.sourceTemplateVersionId ? <><p className="mt-2 font-semibold">{cycle.sourceTemplateName}, version {cycle.sourceTemplateVersionNumber}</p><p className="mt-1 text-sm text-muted-foreground">{cycle.firstDeviatedOn ? `First changed ${cycle.firstDeviatedOn}; ${matchingWeeks} complete earlier matching week${matchingWeeks === 1 ? "" : "s"} preserved.` : "Schedule still matches the original template."}</p></> : <p className="mt-2 font-semibold">{cycle.approvedDefinition ? "Approved protocol copy" : "Custom protocol"}</p>}</section>
          </div>

          {cycle.preparation ? <section className="mt-8 rounded-2xl border bg-muted/20 p-5" aria-labelledby="preparation-heading"><h2 id="preparation-heading" className="text-xl font-bold">Actual preparation</h2><p className="mt-2 text-sm text-muted-foreground">Saved for this cycle only; reference examples were not assumed.</p><div className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><p><span className="font-semibold">Vial strength:</span> {cycle.preparation.vialStrengthMg || "Not supplied"} mg</p><p><span className="font-semibold">Diluent:</span> {cycle.preparation.diluentVolumeMl || "Not supplied"} mL</p>{cycle.preparation.concentrationMgPerMl ? <p><span className="font-semibold">Calculated concentration:</span> {cycle.preparation.concentrationMgPerMl} mg/mL</p> : null}{cycle.preparation.ingredientProportions ? <p><span className="font-semibold">Ingredient proportions:</span> {cycle.preparation.ingredientProportions}</p> : null}</div>{preparationRows.length ? <div className="mt-5 space-y-2">{preparationRows.map((row) => <div key={row.id} className="rounded-xl border bg-background p-4 text-sm"><span className="font-semibold">{formatDoseAmount(row.doseAmount)} {row.doseUnit}</span> = {row.calculation.volumeMl} mL{row.calculation.syringeUnits ? ` · ${row.calculation.syringeUnits} syringe units` : ""}</div>)}</div> : null}</section> : null}

          <section className="mt-10 border-t pt-8" aria-labelledby="adherence-heading"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="adherence-heading" className="text-2xl font-bold">Injection adherence</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Completed injections divided by due scheduled occurrences. Unresolved entries from prior dates count as overdue; today&apos;s entries count once explicitly resolved.</p></div><div className="rounded-2xl bg-secondary px-5 py-4 sm:text-right"><p className="text-3xl font-bold text-primary">{adherence.percentage === null ? "—" : `${adherence.percentage}%`}</p><p className="mt-1 text-xs text-muted-foreground">{adherence.completed} completed of {adherence.scheduled} due</p></div></div><div className="mt-5 grid grid-cols-3 gap-3 text-center"><div className="rounded-xl border bg-muted/25 p-3"><p className="text-xl font-bold">{adherence.skipped}</p><p className="text-xs text-muted-foreground">Skipped</p></div><div className="rounded-xl border bg-muted/25 p-3"><p className="text-xl font-bold">{adherence.missed}</p><p className="text-xs text-muted-foreground">Missed</p></div><div className="rounded-xl border bg-muted/25 p-3"><p className="text-xl font-bold">{adherence.overdue}</p><p className="text-xs text-muted-foreground">Overdue</p></div></div></section>

          <section className="mt-10 border-t pt-8" aria-labelledby="goals-heading"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><Target className="size-5 text-primary" aria-hidden="true" /><h2 id="goals-heading" className="text-2xl font-bold">Goals and baselines</h2></div><p className="mt-2 text-sm leading-6 text-muted-foreground">Baseline snapshots use the latest matching journal entry from the seven days before this cycle started.</p></div><Button variant="outline" asChild><Link href={`/cycles/${cycle.id}/goals`}>{cycle.status === "completed" || cycle.status === "cancelled" ? "View goals" : "Manage goals"}</Link></Button></div>{goalData.goals.length ? <ul className="mt-5 grid gap-3 sm:grid-cols-2">{goalData.goals.map((goal) => { const metric = getOutcomeMetric(goal.metricId)!; const baselineHref = goal.baselineSourceType === "measurement" ? `/journal/measurements/${goal.baselineSourceId}` : goal.baselineSourceType === "check_in" ? `/journal/check-ins/${goal.baselineObservedOn}` : null; return <li key={goal.id} className="rounded-2xl border bg-muted/20 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{metric.label}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${goal.baselineStatus === "valid" ? "status-positive text-[color:var(--positive-ink)]" : goal.baselineStatus === "unsuitable" ? "status-rest text-[color:var(--rest-ink)]" : "status-caution text-[color:var(--caution-ink)]"}`}>{goal.baselineStatus} baseline</span></div><p className="mt-3 text-sm">Target: {goal.targetValue ? `${Number(goal.targetValue)} ${formatOutcomeUnit(goal.targetUnit)}` : "Tracking only"}</p>{baselineHref ? <Link href={baselineHref} className="mt-2 block text-sm font-semibold text-primary">Baseline {Number(goal.baselineValue)} {formatOutcomeUnit(goal.baselineUnit!)} · {goal.baselineObservedOn}</Link> : <p className="mt-2 text-sm text-muted-foreground">No eligible entry from {cycle.startDate} minus seven days through the day before start.</p>}</li>; })}</ul> : <p className="mt-4 text-muted-foreground">No outcome metrics selected yet.</p>}</section>

          <section className="mt-10 border-t pt-8" aria-labelledby="injection-history-heading"><h2 id="injection-history-heading" className="text-2xl font-bold">Injection records</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Scheduled values and recorded actual values remain separate. Corrections retain the prior record state.</p>{injectionRecords.length ? <ul className="mt-5 space-y-3">{injectionRecords.map((record) => <li key={record.id}><Link href={`/injections/${record.id}`} className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-4 transition hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{record.peptideName}</p><p className="mt-1 text-sm text-muted-foreground">Scheduled {record.scheduledDate} · {formatDoseAmount(record.scheduledDoseAmount)} {record.scheduledDoseUnit}</p></div><div className="sm:text-right"><span className="inline-flex items-center gap-1.5 text-sm font-semibold capitalize"><CheckCircle2 className="size-4 text-primary" aria-hidden="true" />{record.status}</span>{record.status === "completed" ? <><p className="mt-1 text-sm text-muted-foreground">Actual {record.actualDate} · {formatDoseAmount(record.actualDoseAmount!)} {record.actualDoseUnit}</p><p className="mt-1 text-xs text-muted-foreground">{formatInjectionSite(record.injectionSiteId)}</p></> : null}</div></Link></li>)}</ul> : <p className="mt-4 text-muted-foreground">No injection records yet.</p>}</section>

          {(cycle.status === "active" || cycle.status === "paused") ? (
            <section className="mt-10 border-t pt-8" aria-labelledby="cycle-management-heading"><h2 id="cycle-management-heading" className="text-2xl font-bold">Manage cycle</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Dates are recorded explicitly. Completed and cancelled states are final.</p><div className="mt-5 flex flex-wrap gap-4">{cycle.status === "active" ? <LifecycleForm action={pauseProtocolCycleAction} cycleId={cycle.id} label="Pause" minimum={cycle.startDate} /> : <LifecycleForm action={resumeProtocolCycleAction} cycleId={cycle.id} label="Resume" minimum={cycle.startDate} variant="default" />}<LifecycleForm action={completeProtocolCycleAction} cycleId={cycle.id} label="Complete" minimum={cycle.startDate} /><LifecycleForm action={cancelProtocolCycleAction} cycleId={cycle.id} label="Cancel" minimum={cycle.startDate} /></div></section>
          ) : null}

          <section className="mt-10 border-t pt-8" aria-labelledby="pause-history-heading"><h2 id="pause-history-heading" className="text-2xl font-bold">Interruptions</h2>{cycle.pauses.length ? <ul className="mt-4 space-y-2">{cycle.pauses.map((pause) => <li key={pause.id} className="rounded-xl border bg-muted/25 p-4 text-sm"><span className="font-semibold">Paused {pause.pausedOn}</span><span className="text-muted-foreground"> · {pause.resumedOn ? `Resumed ${pause.resumedOn}` : cycle.status === "paused" ? "Currently paused" : "Cycle ended while paused"}</span></li>)}</ul> : <p className="mt-3 text-muted-foreground">No pauses recorded.</p>}</section>

          <section className="mt-10 border-t pt-8" aria-labelledby="revision-history-heading"><h2 id="revision-history-heading" className="text-2xl font-bold">Schedule history</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Every revision is preserved with its effective date.</p><div className="mt-5 space-y-4">{[...cycle.revisions].reverse().map((revision) => { const entryNames = new Map(revision.entries.map((entry) => [entry.catalogueEntryId, entry.displayName])); return <details key={revision.id} open={revision.revisionNumber === cycle.revisions.length} className="rounded-2xl border bg-muted/20 p-5"><summary className="cursor-pointer font-semibold">Revision {revision.revisionNumber} · effective {revision.effectiveFrom}{revision.previousPlannedEndDate ? ` · made ongoing (previous end ${revision.previousPlannedEndDate})` : ""}{cycle.sourceTemplateVersionId ? revision.templateScheduleMatches ? " · template matching" : " · customised" : ""}</summary><div className="mt-4 space-y-3">{revision.steps.map((step) => <div key={step.id} className="grid gap-2 rounded-xl border bg-background p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-semibold">{entryNames.get(step.catalogueEntryId)}</p><p className="mt-1 text-sm text-muted-foreground">{formatTemplateFrequency(step.frequency, step.daysOfWeek, step.intervalDays)} · {step.endDay === null ? `Day ${step.startDay} onward` : `Days ${step.startDay}–${step.endDay}`}</p></div><div className="sm:text-right"><p className="font-semibold">{formatDoseAmount(step.doseAmount)} {step.doseUnit}</p>{step.timeOfDay ? <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Clock3 className="size-3.5" aria-hidden="true" />{step.timeOfDay}</p> : null}</div></div>)}</div></details>; })}</div></section>
        </div>
      </article>
    </main>
  );
}
