import type { Metadata } from "next";
import { Settings2 } from "lucide-react";
import Link from "next/link";

import { JournalNav } from "@/components/health/journal-nav";
import { CalendarHeader } from "@/components/protocol-calendar/calendar-header";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { requireActor } from "@/lib/auth/session";
import { listDailyCheckIns } from "@/lib/health/check-in-service";
import { formatCalendarDate } from "@/lib/protocol-calendar/presentation";

export const metadata: Metadata = { title: "Daily check-ins" };

export default async function CheckInsPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const checkIns = await listDailyCheckIns(await requireActor());
  const query = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  return <main className="min-h-screen bg-secondary/20"><CalendarHeader /><JournalNav /><section className="mx-auto w-full max-w-5xl px-5 pb-16 pt-8 sm:px-8 lg:px-10"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-wider text-primary">Private health journal</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">Daily check-ins</h1><p className="mt-3 text-muted-foreground">One shared check-in across all active protocols.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link href="/journal/check-ins/questions"><Settings2 className="size-4" aria-hidden="true" />Questions</Link></Button><Button asChild><Link href={`/journal/check-ins/${today}`}>Check in today</Link></Button></div></div>{query.deleted ? <div className="mt-6"><FormMessage tone="success">Daily check-in deleted. Linked symptom records were kept.</FormMessage></div> : null}{checkIns.length ? <div className="mt-10 grid gap-3 sm:grid-cols-2">{checkIns.map((item) => <Link key={item.id} href={`/journal/check-ins/${item.checkInDate}`} className="rounded-2xl border bg-background p-5 shadow-sm"><h2 className="font-bold">{formatCalendarDate(item.checkInDate, { dateStyle: "long" })}</h2><p className="mt-2 text-sm text-muted-foreground">{item.answerCount} score{item.answerCount === 1 ? "" : "s"} · {item.symptomStatus === "no_symptoms" ? "No symptoms reported" : item.symptomStatus === "symptoms_recorded" ? "Symptoms recorded" : "Symptoms not answered"}</p></Link>)}</div> : <div className="mt-10 rounded-[2rem] border border-dashed bg-background p-10 text-center"><h2 className="text-2xl font-bold">No check-ins yet</h2><p className="mt-2 text-muted-foreground">Your applicable questions are assembled when you open a date.</p><Button className="mt-5" asChild><Link href={`/journal/check-ins/${today}`}>Start today’s check-in</Link></Button></div>}</section></main>;
}
