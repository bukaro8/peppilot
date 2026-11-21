import type { Metadata } from "next";

import { createSymptomAction } from "@/app/journal/symptoms/actions";
import { JournalNav } from "@/components/health/journal-nav";
import { SymptomForm } from "@/components/health/symptom-form";
import { CalendarHeader } from "@/components/protocol-calendar/calendar-header";
import { requireActor } from "@/lib/auth/session";
import { getDailyCheckIn } from "@/lib/health/check-in-service";
import { parseCalendarDate } from "@/lib/protocol-calendar/service";

export const metadata: Metadata = { title: "Record symptom" };

export default async function NewSymptomPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const actor = await requireActor();
  const query = await searchParams;
  let date = query.date ?? new Date().toISOString().slice(0, 10);
  try { parseCalendarDate(date); } catch { date = new Date().toISOString().slice(0, 10); }
  const checkIn = await getDailyCheckIn(actor, date);
  return <main className="min-h-screen bg-secondary/20"><CalendarHeader /><JournalNav /><section className="mx-auto w-full max-w-3xl px-5 pb-16 pt-8 sm:px-8"><div className="rounded-[2rem] border bg-background p-6 shadow-sm sm:p-10"><p className="text-sm font-semibold uppercase tracking-wider text-primary">Private symptom diary</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.045em]">Record symptom</h1><p className="mt-3 text-muted-foreground">Severity uses a standard 1–10 scale. This record does not infer a cause.</p><div className="mt-8"><SymptomForm action={createSymptomAction} checkInId={checkIn?.id} requestId={crypto.randomUUID()} submitLabel="Save symptom" initial={{ customDescription: "", endedAt: "", notes: "", severity: 1, startedAt: "", symptomDate: date, symptomId: "headache" }} /></div></div></section></main>;
}
