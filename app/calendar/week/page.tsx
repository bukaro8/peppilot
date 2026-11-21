import type { Metadata } from "next";

import { CalendarHeader } from "@/components/protocol-calendar/calendar-header";
import { DateNavigation } from "@/components/protocol-calendar/date-navigation";
import { LocalDateRedirect } from "@/components/protocol-calendar/local-date-redirect";
import { ScheduleEventCard } from "@/components/protocol-calendar/schedule-event-card";
import { Button } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/session";
import { getCalendarInjectionActions } from "@/lib/injection/service";
import { formatCalendarDate, groupEventsByDate } from "@/lib/protocol-calendar/presentation";
import { addCalendarDays, enumerateCalendarDates, parseCalendarDate, startOfCalendarWeek } from "@/lib/protocol-calendar/service";
import Link from "next/link";

export const metadata: Metadata = { title: "Weekly calendar" };

export default async function WeeklyCalendarPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const actor = await requireActor();
  const query = await searchParams;
  const fallback = new Date().toISOString().slice(0, 10);
  let selected = query.date ?? fallback;
  try { parseCalendarDate(selected); } catch { selected = fallback; }
  const start = startOfCalendarWeek(selected);
  const end = addCalendarDays(start, 6);
  const dates = enumerateCalendarDates(start, end);
  const actions = await getCalendarInjectionActions(actor, start, end, fallback);
  const grouped = groupEventsByDate(actions.map((action) => action.event));
  const actionById = new Map(actions.map((action) => [action.event.id, action]));

  return (
    <main className="min-h-screen bg-secondary/20">
      {!query.date ? <LocalDateRedirect path="/calendar/week" /> : null}
      <CalendarHeader />
      <section className="mx-auto w-full max-w-7xl px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-semibold uppercase tracking-wider text-primary">Protocol calendar</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">Week at a glance</h1><p className="mt-3 text-muted-foreground">{formatCalendarDate(start, { day: "numeric", month: "long" })}–{formatCalendarDate(end, { day: "numeric", month: "long", year: "numeric" })}</p></div><DateNavigation view="week" selected={selected} previous={addCalendarDays(start, -7)} next={addCalendarDays(start, 7)} /></div>
        <div className="mt-5 flex gap-2"><Button size="sm" asChild><Link href={`/calendar/week?date=${selected}`}>Week</Link></Button><Button size="sm" variant="outline" asChild><Link href={`/calendar/month?date=${selected}`}>Month</Link></Button></div>
        <div className="mt-8 grid gap-4 lg:grid-cols-7">
          {dates.map((date) => { const dayEvents = grouped.get(date) ?? []; return <section key={date} className="min-h-36 rounded-2xl border bg-background p-4 shadow-sm" aria-labelledby={`day-${date}`}><div className="flex items-baseline justify-between gap-3 lg:block"><h2 id={`day-${date}`} className="font-bold">{formatCalendarDate(date, { weekday: "long" })}</h2><p className="text-sm text-muted-foreground lg:mt-1">{formatCalendarDate(date, { day: "numeric", month: "short" })}</p></div>{dayEvents.length ? <div className="mt-4 space-y-3">{dayEvents.map((event) => <ScheduleEventCard key={event.id} event={event} action={actionById.get(event.id)} compact />)}</div> : <p className="mt-4 text-sm text-muted-foreground">No scheduled peptides.</p>}</section>; })}
        </div>
      </section>
    </main>
  );
}
