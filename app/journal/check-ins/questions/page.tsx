import type { Metadata } from "next";

import { updateQuestionPreferencesAction } from "@/app/journal/check-ins/actions";
import { JournalNav } from "@/components/health/journal-nav";
import { CalendarHeader } from "@/components/protocol-calendar/calendar-header";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { requireActor } from "@/lib/auth/session";
import { optionalCheckInQuestions } from "@/lib/health/check-in-questions";
import { getQuestionPreferences } from "@/lib/health/check-in-service";

export const metadata: Metadata = { title: "Check-in questions" };

export default async function QuestionPreferencesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const preferences = await getQuestionPreferences(await requireActor());
  const query = await searchParams;
  return <main className="min-h-screen bg-secondary/20"><CalendarHeader /><JournalNav /><section className="mx-auto w-full max-w-3xl px-5 pb-16 pt-8 sm:px-8"><div className="rounded-[2rem] border bg-background p-6 shadow-sm sm:p-10"><p className="text-sm font-semibold uppercase tracking-wider text-primary">Daily check-in settings</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.045em]">Optional questions</h1><p className="mt-3 text-muted-foreground">Enabled questions appear only when relevant to an active protocol. Sleep, energy and recovery remain part of every check-in.</p>{query.saved ? <div className="mt-5"><FormMessage tone="success">Question preferences saved.</FormMessage></div> : null}<form action={updateQuestionPreferencesAction} className="mt-8 space-y-4">{optionalCheckInQuestions.map((question) => <label key={question.id} className="flex items-start gap-3 rounded-2xl border p-4"><input className="mt-1 size-5" type="checkbox" name="enabledQuestionId" value={question.id} defaultChecked={preferences[question.id] !== false} /><span><span className="font-semibold">{question.label}</span><span className="mt-1 block text-sm text-muted-foreground">{question.prompt}</span></span></label>)}<Button type="submit" size="lg">Save preferences</Button></form></div></section></main>;
}
