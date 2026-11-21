import type { Metadata } from "next";
import Link from "next/link";

import { JournalNav } from "@/components/health/journal-nav";
import { CalendarHeader } from "@/components/protocol-calendar/calendar-header";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { requireActor } from "@/lib/auth/session";
import { listSymptoms } from "@/lib/health/symptom-service";
import { getSymptomLabel } from "@/lib/health/symptoms";
import { formatCalendarDate } from "@/lib/protocol-calendar/presentation";

export const metadata: Metadata = { title: "Symptom diary" };

export default async function SymptomsPage({ searchParams }: { searchParams: Promise<{ date?: string; deleted?: string }> }) {
  const query = await searchParams;
  const symptoms = await listSymptoms(await requireActor(), query.date);
  const today = new Date().toISOString().slice(0, 10);
  return <main className="min-h-screen bg-secondary/20"><CalendarHeader /><JournalNav /><section className="mx-auto w-full max-w-5xl px-5 pb-16 pt-8 sm:px-8 lg:px-10"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-wider text-primary">Private health journal</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">Symptom diary</h1><p className="mt-3 text-muted-foreground">Structured symptom records without attributing a cause.</p></div><Button asChild><Link href={`/journal/symptoms/new?date=${query.date ?? today}`}>Record symptom</Link></Button></div>{query.deleted ? <div className="mt-6"><FormMessage tone="success">Symptom record deleted.</FormMessage></div> : null}{query.date ? <div className="mt-6 flex items-center gap-3"><p className="text-sm">Filtered to {formatCalendarDate(query.date, { dateStyle: "long" })}</p><Link href="/journal/symptoms" className="text-sm font-semibold text-primary">Clear</Link></div> : null}{symptoms.length ? <div className="mt-10 grid gap-3 sm:grid-cols-2">{symptoms.map((symptom) => <Link key={symptom.id} href={`/journal/symptoms/${symptom.id}`} className="rounded-2xl border bg-background p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{getSymptomLabel(symptom.symptomId, symptom.customDescription)}</h2><p className="mt-1 text-sm text-muted-foreground">{formatCalendarDate(symptom.symptomDate, { dateStyle: "long" })}</p></div><span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">{symptom.severity}/10</span></div>{symptom.startedAt ? <p className="mt-3 text-sm text-muted-foreground">{symptom.startedAt}{symptom.endedAt ? `–${symptom.endedAt}` : ""}</p> : null}{symptom.notes ? <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{symptom.notes}</p> : null}</Link>)}</div> : <div className="mt-10 rounded-[2rem] border border-dashed bg-background p-10 text-center"><h2 className="text-2xl font-bold">No symptom records</h2><p className="mt-2 text-muted-foreground">No entry is different from explicitly reporting no symptoms in a daily check-in.</p></div>}</section></main>;
}
