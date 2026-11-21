import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";

import { JournalNav } from "@/components/health/journal-nav";
import { CalendarHeader } from "@/components/protocol-calendar/calendar-header";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { requireActor } from "@/lib/auth/session";
import { getMeasurementLabel, listHealthMeasurements, type HealthMeasurementRow } from "@/lib/health/measurement-service";
import { formatMeasurementValue } from "@/lib/health/metrics";
import { formatCalendarDate } from "@/lib/protocol-calendar/presentation";

export const metadata: Metadata = { title: "Health measurements" };

export default async function MeasurementsPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const measurements = await listHealthMeasurements(await requireActor());
  const query = await searchParams;
  const grouped = new Map<string, HealthMeasurementRow[]>();
  for (const item of measurements) grouped.set(item.observedOn, [...(grouped.get(item.observedOn) ?? []), item]);

  return <main className="min-h-screen bg-secondary/20"><CalendarHeader /><JournalNav /><section className="mx-auto w-full max-w-5xl px-5 pb-16 pt-8 sm:px-8 lg:px-10"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-wider text-primary">Private health journal</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">Measurements</h1><p className="mt-3 max-w-2xl text-muted-foreground">One shared record of your body measurements, independent of protocols and cycles.</p></div><Button asChild><Link href="/journal/measurements/new"><Plus className="size-4" aria-hidden="true" />Add measurement</Link></Button></div>
    {query.deleted ? <div className="mt-6"><FormMessage tone="success">Measurement deleted.</FormMessage></div> : null}
    {measurements.length ? <div className="mt-10 space-y-8">{[...grouped].map(([date, items]) => <section key={date} aria-labelledby={`date-${date}`}><h2 id={`date-${date}`} className="text-lg font-bold">{formatCalendarDate(date, { dateStyle: "long" })}</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{items.map((item) => <Link key={item.id} href={`/journal/measurements/${item.id}`} className="rounded-2xl border bg-background p-5 shadow-sm transition hover:border-primary/30"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{getMeasurementLabel(item.metricId)}</h3><p className="mt-1 text-2xl font-bold text-primary">{formatMeasurementValue(item.enteredValue, item.enteredUnit)}</p></div><span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">Manual</span></div>{item.enteredUnit !== item.canonicalUnit ? <p className="mt-3 text-xs text-muted-foreground">Canonical: {formatMeasurementValue(item.canonicalValue, item.canonicalUnit)}</p> : null}{item.notes ? <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{item.notes}</p> : null}</Link>)}</div></section>)}</div> : <div className="mt-10 rounded-[2rem] border border-dashed bg-background p-10 text-center"><h2 className="text-2xl font-bold">No measurements yet</h2><p className="mx-auto mt-2 max-w-lg text-muted-foreground">Add a dated measurement to begin your private shared journal.</p><Button className="mt-5" asChild><Link href="/journal/measurements/new">Add first measurement</Link></Button></div>}
  </section></main>;
}
