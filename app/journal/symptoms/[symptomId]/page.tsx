import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { deleteSymptomAction, updateSymptomAction } from "@/app/journal/symptoms/actions";
import { JournalNav } from "@/components/health/journal-nav";
import { SymptomForm } from "@/components/health/symptom-form";
import { CalendarHeader } from "@/components/protocol-calendar/calendar-header";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { AuthorizationError } from "@/lib/auth/policy";
import { requireActor } from "@/lib/auth/session";
import { getSymptom, SymptomError } from "@/lib/health/symptom-service";

export const metadata: Metadata = { title: "Edit symptom" };

export default async function SymptomPage({ params, searchParams }: { params: Promise<{ symptomId: string }>; searchParams: Promise<{ created?: string; saved?: string }> }) {
  const actor = await requireActor(); const { symptomId } = await params; let symptom;
  try { symptom = await getSymptom(actor, symptomId); } catch (error) { if (error instanceof AuthorizationError || error instanceof SymptomError) notFound(); throw error; }
  if (!symptom) notFound(); const query = await searchParams;
  return <main className="min-h-screen bg-secondary/20"><CalendarHeader /><JournalNav /><section className="mx-auto w-full max-w-3xl px-5 pb-16 pt-8 sm:px-8"><div className="rounded-[2rem] border bg-background p-6 shadow-sm sm:p-10"><p className="text-sm font-semibold uppercase tracking-wider text-primary">Private symptom diary</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.045em]">Edit symptom</h1>{query.created ? <div className="mt-5"><FormMessage tone="success">Symptom recorded.</FormMessage></div> : null}{query.saved ? <div className="mt-5"><FormMessage tone="success">Symptom updated.</FormMessage></div> : null}<div className="mt-8"><SymptomForm action={updateSymptomAction.bind(null, symptom.id)} checkInId={symptom.checkInId} requestId={symptom.id} submitLabel="Save changes" initial={{ customDescription: symptom.customDescription ?? "", endedAt: symptom.endedAt ?? "", notes: symptom.notes ?? "", severity: symptom.severity, startedAt: symptom.startedAt ?? "", symptomDate: symptom.symptomDate, symptomId: symptom.symptomId }} /></div><details className="mt-10 rounded-2xl border border-destructive/20 p-5"><summary className="cursor-pointer font-semibold text-destructive">Delete symptom record</summary><p className="mt-3 text-sm text-muted-foreground">This permanently removes this diary entry.</p><form action={deleteSymptomAction.bind(null, symptom.id)} className="mt-4"><Button type="submit" className="bg-destructive text-white hover:bg-destructive/90">Delete permanently</Button></form></details></div></section></main>;
}
