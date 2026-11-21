import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import Link from "next/link";

import { deleteCheckInAction, saveCheckInAction } from "@/app/journal/check-ins/actions";
import { CheckInForm } from "@/components/health/check-in-form";
import { JournalNav } from "@/components/health/journal-nav";
import { CalendarHeader } from "@/components/protocol-calendar/calendar-header";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { requireActor } from "@/lib/auth/session";
import { getAdaptiveQuestions, getDailyCheckIn } from "@/lib/health/check-in-service";
import { listSymptoms } from "@/lib/health/symptom-service";
import type { CheckInQuestionId } from "@/lib/health/check-in-questions";
import { formatCalendarDate } from "@/lib/protocol-calendar/presentation";

export const metadata: Metadata = { title: "Daily check-in" };

export default async function CheckInPage({ params, searchParams }: { params: Promise<{ date: string }>; searchParams: Promise<{ saved?: string }> }) {
  const actor = await requireActor();
  const { date } = await params;
  const [questions, checkIn, symptoms, query] = await Promise.all([getAdaptiveQuestions(actor, date), getDailyCheckIn(actor, date), listSymptoms(actor, date), searchParams]);
  const answers = Object.fromEntries(checkIn?.answers.map((answer) => [answer.questionId, answer.score]) ?? []) as Partial<Record<CheckInQuestionId, number>>;
  const action = saveCheckInAction.bind(null, date);
  return <main className="min-h-screen bg-secondary/20"><CalendarHeader /><JournalNav /><section className="mx-auto w-full max-w-3xl px-5 pb-16 pt-8 sm:px-8"><div className="rounded-[2rem] border bg-background p-6 shadow-sm sm:p-10"><p className="text-sm font-semibold uppercase tracking-wider text-primary">Shared daily check-in</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.045em]">{formatCalendarDate(date, { dateStyle: "long" })}</h1><p className="mt-3 text-muted-foreground">Scores use a standard 1–10 scale where higher means better. Optional questions may be skipped.</p>{query.saved ? <div className="mt-5"><FormMessage tone="success">Daily check-in saved.</FormMessage></div> : null}<div className="mt-8"><CheckInForm action={action} answers={answers} date={date} questions={questions} symptomCount={symptoms.length} symptomStatus={checkIn?.symptomStatus ?? "not_answered"} /></div>{symptoms.length ? <section className="mt-10 border-t pt-8"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Symptoms</h2><Link href={`/journal/symptoms?date=${date}`} className="text-sm font-semibold text-primary">View details</Link></div><ul className="mt-4 space-y-2">{symptoms.map((symptom) => <li key={symptom.id} className="rounded-xl bg-muted/40 p-3 text-sm">{symptom.symptomId.replaceAll("_", " ")} · severity {symptom.severity}/10</li>)}</ul></section> : null}{checkIn ? <details className="mt-10 rounded-2xl border border-destructive/20 p-5"><summary className="cursor-pointer font-semibold text-destructive">Delete daily check-in</summary><p className="mt-3 text-sm text-muted-foreground">This removes the scores for this date. Symptom records remain in the private journal.</p><form action={deleteCheckInAction.bind(null, date)} className="mt-4"><Button type="submit" className="bg-destructive text-white hover:bg-destructive/90"><Trash2 className="size-4" aria-hidden="true" />Delete permanently</Button></form></details> : null}</div></section></main>;
}
