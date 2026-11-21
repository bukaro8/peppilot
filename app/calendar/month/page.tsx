import type { Metadata } from "next";
import Link from "next/link";

import { CalendarHeader } from "@/components/protocol-calendar/calendar-header";
import { DateNavigation } from "@/components/protocol-calendar/date-navigation";
import { LocalDateRedirect } from "@/components/protocol-calendar/local-date-redirect";
import { ScheduleEventCard } from "@/components/protocol-calendar/schedule-event-card";
import { Button } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/session";
import { getCalendarInjectionActions } from "@/lib/injection/service";
import { formatCalendarDate, groupEventsByDate } from "@/lib/protocol-calendar/presentation";
import { addCalendarDays, calendarMonthRange, enumerateCalendarDates, parseCalendarDate } from "@/lib/protocol-calendar/service";

export const metadata: Metadata = { title: "Monthly calendar" };
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function MonthlyCalendarPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const actor = await requireActor();
  const query = await searchParams;
  const fallback = new Date().toISOString().slice(0, 10);
  let selected = query.date ?? fallback;
  try { parseCalendarDate(selected); } catch { selected = fallback; }
  const { start, end } = calendarMonthRange(selected);
  const dates = enumerateCalendarDates(start, end);
  const actions = await getCalendarInjectionActions(actor, start, end, fallback);
  const grouped = groupEventsByDate(actions.map((action) => action.event));
  const actionById = new Map(actions.map((action) => [action.event.id, action]));
  const leadingCells = (parseCalendarDate(start).getUTCDay() + 6) % 7;
  const previous = addCalendarDays(start, -1);
  const next = addCalendarDays(end, 1);

  return (
    <main className="min-h-screen bg-secondary/20">
      {!query.date ? <LocalDateRedirect path="/calendar/month" /> : null}
      <CalendarHeader />
      <section className="mx-auto w-full max-w-7xl px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-semibold uppercase tracking-wider text-primary">Protocol calendar</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">{formatCalendarDate(start, { month: "long", year: "numeric" })}</h1><p className="mt-3 text-muted-foreground">Planned doses from your active cycle schedules.</p></div><DateNavigation view="month" selected={selected} previous={previous} next={next} /></div>
        <div className="mt-5 flex gap-2"><Button size="sm" variant="outline" asChild><Link href={`/calendar/week?date=${selected}`}>Week</Link></Button><Button size="sm" asChild><Link href={`/calendar/month?date=${selected}`}>Month</Link></Button></div>

        <div className="mt-8 space-y-3 md:hidden">{dates.map((date) => { const dayEvents = grouped.get(date) ?? []; return <section key={date} className="rounded-2xl border bg-background p-4"><h2 className="font-bold">{formatCalendarDate(date, { weekday: "long", day: "numeric", month: "long" })}</h2>{dayEvents.length ? <div className="mt-3 space-y-3">{dayEvents.map((event) => <ScheduleEventCard key={event.id} event={event} action={actionById.get(event.id)} compact />)}</div> : <p className="mt-2 text-sm text-muted-foreground">No scheduled peptides.</p>}</section>; })}</div>

        <div className="mt-8 hidden overflow-hidden rounded-2xl border bg-border md:block">
          <div className="grid grid-cols-7 gap-px">{weekdays.map((day) => <div key={day} className="bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{day}</div>)}{Array.from({ length: leadingCells }, (_, index) => <div key={`blank-${index}`} className="min-h-36 bg-muted/60" aria-hidden="true" />)}{dates.map((date) => { const dayEvents = grouped.get(date) ?? []; return <section key={date} className="min-h-36 bg-background p-3" aria-label={formatCalendarDate(date, { dateStyle: "full" })}><p className="text-sm font-bold">{formatCalendarDate(date, { day: "numeric" })}</p><div className="mt-2 space-y-2">{dayEvents.map((event) => <ScheduleEventCard key={event.id} event={event} action={actionById.get(event.id)} compact />)}</div></section>; })}</div>
        </div>
      </section>
    </main>
  );
}
