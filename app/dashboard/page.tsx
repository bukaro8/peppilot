import type { Metadata } from "next";
import Link from "next/link";
import { Activity, AlertTriangle, CalendarDays, CheckCircle2, ClipboardCheck, Clock3, CircleDashed, SkipForward, Sparkles, Syringe, XCircle } from "lucide-react";

import { CalendarHeader } from "@/components/protocol-calendar/calendar-header";
import { LocalDateRedirect } from "@/components/protocol-calendar/local-date-redirect";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { requireActor } from "@/lib/auth/session";
import { getDashboardInjectionActions, type DashboardInjectionAction } from "@/lib/injection/service";
import { formatCalendarDate } from "@/lib/protocol-calendar/presentation";
import { parseCalendarDate } from "@/lib/protocol-calendar/service";
import { getProtocolCycles } from "@/lib/protocol-cycle/service";
import { formatDoseAmount } from "@/lib/protocol-template/presentation";

export const metadata: Metadata = { title: "Dashboard" };

const statusStyles = {
  completed: "bg-emerald-100 text-emerald-800",
  missed: "bg-rose-100 text-rose-800",
  overdue: "bg-rose-100 text-rose-800",
  pending: "bg-amber-100 text-amber-900",
  skipped: "bg-slate-100 text-slate-700",
} as const;

function StatusIcon({ state }: { state: DashboardInjectionAction["state"] }) {
  if (state === "completed") return <CheckCircle2 className="size-3.5" aria-hidden="true" />;
  if (state === "skipped") return <SkipForward className="size-3.5" aria-hidden="true" />;
  if (state === "missed") return <XCircle className="size-3.5" aria-hidden="true" />;
  if (state === "overdue") return <AlertTriangle className="size-3.5" aria-hidden="true" />;
  return <CircleDashed className="size-3.5" aria-hidden="true" />;
}

function InjectionActionCard({ action }: { action: DashboardInjectionAction }) {
  const { event, record, state } = action;
  const occurrence = encodeURIComponent(event.id);
  return (
    <article className="rounded-2xl border bg-background p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{event.peptideName}</h3><p className="mt-1 text-xs text-muted-foreground">{event.cycleName}</p></div><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[state]}`}><StatusIcon state={state} />{state}</span></div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"><span className="font-semibold text-primary">{formatDoseAmount(event.doseAmount)} {event.doseUnit}</span><span className="inline-flex items-center gap-1.5 text-muted-foreground"><Clock3 className="size-3.5" aria-hidden="true" />{event.timeOfDay ?? "Any time"}</span>{state === "overdue" ? <span className="text-muted-foreground">Scheduled {event.date}</span> : null}</div>
      {record ? <Button className="mt-5 w-full" variant="outline" asChild><Link href={`/injections/${record.id}`}>View or correct record</Link></Button> : <div className="mt-5 grid grid-cols-2 gap-2"><Button asChild><Link href={`/injections/new?occurrence=${occurrence}&status=completed`}><Syringe className="size-4" aria-hidden="true" />Complete</Link></Button><Button variant="outline" asChild><Link href={`/injections/new?occurrence=${occurrence}&status=skipped`}><SkipForward className="size-4" aria-hidden="true" />Skip</Link></Button></div>}
    </article>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ date?: string; onboarding?: string; welcome?: string }> }) {
  const actor = await requireActor();
  const query = await searchParams;
  const fallback = new Date().toISOString().slice(0, 10);
  let date = query.date ?? fallback;
  try { parseCalendarDate(date); } catch { date = fallback; }
  const [actions, cycles] = await Promise.all([getDashboardInjectionActions(actor, date), getProtocolCycles(actor)]);
  const activeCycles = cycles.filter((cycle) => cycle.status === "active" || cycle.status === "paused");
  const localDatePath = query.welcome
    ? "/dashboard?welcome=1"
    : query.onboarding
      ? `/dashboard?onboarding=${encodeURIComponent(query.onboarding)}`
      : "/dashboard";

  return (
    <main className="min-h-screen bg-secondary/20">
      {!query.date ? <LocalDateRedirect path={localDatePath} /> : null}
      <CalendarHeader pendingCount={actions.pendingCount} />
      <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        {query.welcome ? <div className="mb-6"><FormMessage tone="success">You&apos;re set up. Your schedules and next actions will appear here automatically.</FormMessage></div> : null}
        {query.onboarding === "skipped" ? <div className="mb-6"><FormMessage tone="success">Your progress is saved. Resume guided setup whenever you are ready.</FormMessage></div> : null}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-wider text-primary">Member dashboard</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">Daily actions</h1><p className="mt-3 text-muted-foreground">{formatCalendarDate(date, { dateStyle: "full" })}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link href={`/journal/check-ins/${date}`}><ClipboardCheck className="size-4" aria-hidden="true" />Daily check-in</Link></Button><Button asChild><Link href={`/calendar/week?date=${date}`}><CalendarDays className="size-4" aria-hidden="true" />Open calendar</Link></Button></div></div>

        <section className="mt-10" aria-labelledby="active-cycles-heading">
          <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-primary">Your plan</p><h2 id="active-cycles-heading" className="mt-1 text-2xl font-bold">Active cycles</h2></div>{activeCycles.length ? <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold">{activeCycles.length}</span> : null}</div>
          {activeCycles.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{activeCycles.map((cycle) => <Link key={cycle.id} href={`/cycles/${cycle.id}`} className="rounded-2xl border bg-background p-5 shadow-sm transition hover:border-primary/30 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"><div className="flex items-start justify-between gap-3"><h3 className="font-bold">{cycle.name}</h3><span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-800"><Activity className="size-3.5" aria-hidden="true" />{cycle.status}</span></div><p className="mt-3 text-sm text-muted-foreground">{cycle.startDate} → {cycle.plannedEndDate ?? "Ongoing"}</p></Link>)}</div> : <div className="mt-5 rounded-2xl border border-dashed bg-background p-7 text-center"><h3 className="font-bold">Ready when you are</h3><p className="mt-2 text-sm text-muted-foreground">Create a protocol and start a cycle to personalise today&apos;s schedule.</p><Button className="mt-5" asChild><Link href="/onboarding">Continue guided setup</Link></Button></div>}
        </section>

        <div id="pending-actions" className="scroll-mt-6">
          {actions.overdueActions.length ? <section className="mt-10" aria-labelledby="overdue-heading"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-rose-700">Needs attention</p><h2 id="overdue-heading" className="mt-1 text-2xl font-bold">Overdue</h2></div><span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-800">{actions.overdueActions.length}</span></div><p className="mt-2 text-sm text-muted-foreground">Earlier scheduled injections without a completed, skipped, or missed record.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{actions.overdueActions.map((action) => <InjectionActionCard key={action.event.id} action={action} />)}</div></section> : null}
          <section className="mt-10" aria-labelledby="today-heading"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-primary">Today</p><h2 id="today-heading" className="mt-1 text-2xl font-bold">Scheduled injections</h2></div>{actions.todayActions.length ? <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold">{actions.todayActions.length}</span> : null}</div>{actions.todayActions.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{actions.todayActions.map((action) => <InjectionActionCard key={action.event.id} action={action} />)}</div> : <div className="mt-5 rounded-[2rem] border border-dashed bg-background p-8 text-center sm:p-12"><Sparkles className="mx-auto size-8 text-primary" aria-hidden="true" /><h3 className="mt-4 text-2xl font-bold">Nothing scheduled today</h3><p className="mx-auto mt-2 max-w-lg leading-7 text-muted-foreground">Active cycle schedules appear here automatically. Paused and completed cycles do not add new actions.</p><Link href="/cycles" className="mt-5 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">View protocol cycles</Link></div>}</section>
        </div>
      </section>
    </main>
  );
}
