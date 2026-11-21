import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { saveCycleGoalsAction } from "@/app/cycles/[cycleId]/goals/actions";
import { CycleHeader } from "@/components/protocol-cycle/cycle-header";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { AuthorizationError } from "@/lib/auth/policy";
import { requireActor } from "@/lib/auth/session";
import { CycleGoalError, getCycleGoals, getSuggestedCycleGoalIds } from "@/lib/health/cycle-goal-service";
import { formatOutcomeUnit, outcomeMetrics } from "@/lib/health/outcome-metrics";

export const metadata: Metadata = { title: "Cycle goals" };

export default async function CycleGoalsPage({ params, searchParams }: { params: Promise<{ cycleId: string }>; searchParams: Promise<{ error?: string }> }) {
  const actor = await requireActor();
  const { cycleId } = await params;
  let data;
  let suggestedIds: string[];
  try {
    [data, suggestedIds] = await Promise.all([getCycleGoals(actor, cycleId), getSuggestedCycleGoalIds(actor, cycleId)]);
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof CycleGoalError) notFound();
    throw error;
  }
  const query = await searchParams;
  const selected = new Map(data.goals.map((goal) => [goal.metricId, goal]));
  const suggested = new Set(suggestedIds);
  const metrics = [...outcomeMetrics].sort((left, right) => Number(suggested.has(right.id)) - Number(suggested.has(left.id)));
  const readOnly = data.cycle.status === "completed" || data.cycle.status === "cancelled";

  return <main className="min-h-screen bg-secondary/20"><CycleHeader /><section className="mx-auto w-full max-w-4xl px-5 pb-16 pt-8 sm:px-8 lg:px-10"><Button variant="ghost" size="sm" asChild><Link href={`/cycles/${cycleId}`}><ArrowLeft className="size-4" aria-hidden="true" />Back to cycle</Link></Button><div className="mt-6 rounded-[2rem] border bg-background p-6 shadow-sm sm:p-10"><p className="text-sm font-semibold uppercase tracking-wider text-primary">Independent cycle goals</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.045em]">{data.cycle.name}</h1><p className="mt-3 max-w-2xl text-muted-foreground">Choose standard metrics to track for this cycle. A personal target is optional. Baselines use the latest matching journal entry from the seven days before the cycle started.</p>{query.error ? <div className="mt-6"><FormMessage tone="error">{query.error}</FormMessage></div> : null}{readOnly ? <div className="mt-6"><FormMessage tone="success">This cycle is finished, so its goal and baseline snapshots are read-only.</FormMessage></div> : null}<form action={saveCycleGoalsAction.bind(null, cycleId)} className="mt-8 space-y-3"><fieldset disabled={readOnly} className="space-y-3"><legend className="sr-only">Cycle outcome metrics</legend>{metrics.map((metric) => { const goal = selected.get(metric.id); return <div key={metric.id} className="grid gap-4 rounded-2xl border bg-muted/20 p-4 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center"><label className="flex items-start gap-3"><input type="checkbox" name="metricId" value={metric.id} defaultChecked={Boolean(goal)} className="mt-1 size-4" /><span><span className="font-semibold">{metric.label}</span>{suggested.has(metric.id) ? <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">Suggested</span> : null}<span className="mt-1 block text-sm text-muted-foreground">{metric.source === "measurement" ? `Measurement · ${formatOutcomeUnit(metric.unit)}` : "Daily check-in · 1–10"}</span></span></label><label className="text-sm font-semibold">Optional target<input name={`target.${metric.id}`} type="number" min={metric.min} max={metric.max} step={metric.wholeNumber ? 1 : 0.1} defaultValue={goal?.targetValue ?? ""} className="mt-2 h-11 w-full rounded-xl border bg-background px-3 font-normal" /></label></div>; })}</fieldset>{!readOnly ? <Button type="submit" size="lg">Save cycle goals</Button> : null}</form></div></section></main>;
}
