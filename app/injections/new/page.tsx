import type { Metadata } from "next";
import { ArrowLeft, CalendarClock } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createInjectionRecordAction } from "@/app/injections/actions";
import { CalendarHeader } from "@/components/protocol-calendar/calendar-header";
import { InjectionRecordForm } from "@/components/injection/injection-record-form";
import { Button } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/session";
import {
  getInjectionRecordForOccurrence,
  getScheduledOccurrence,
  InjectionRecordError,
} from "@/lib/injection/service";
import { getInjectionSiteRotation } from "@/lib/injection/rotation-service";
import { formatDoseAmount } from "@/lib/protocol-template/presentation";

export const metadata: Metadata = { title: "Log injection" };

export default async function NewInjectionPage({ searchParams }: { searchParams: Promise<{ occurrence?: string; status?: string }> }) {
  const actor = await requireActor();
  const query = await searchParams;
  const occurrenceId = query.occurrence;
  if (!occurrenceId) notFound();
  const existing = await getInjectionRecordForOccurrence(actor, occurrenceId);
  if (existing) redirect(`/injections/${existing.id}`);
  let event;
  try { event = await getScheduledOccurrence(actor, occurrenceId); }
  catch (error) { if (error instanceof InjectionRecordError) notFound(); throw error; }
  const rotation = await getInjectionSiteRotation(actor, event.date);
  const initialStatus = query.status === "skipped" ? "skipped" : "completed";
  const action = createInjectionRecordAction.bind(null, occurrenceId);

  return <main className="min-h-screen bg-secondary/20"><CalendarHeader /><section className="mx-auto w-full max-w-3xl px-5 pb-16 pt-8 sm:px-8"><Button variant="ghost" size="sm" asChild><Link href={`/dashboard?date=${event.date}`}><ArrowLeft className="size-4" aria-hidden="true" />Back to schedule</Link></Button><div className="mt-6 rounded-[2rem] border bg-background p-6 shadow-sm sm:p-10"><p className="text-sm font-semibold uppercase tracking-wider text-primary">Scheduled injection</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.045em]">Log {event.peptideName}</h1><div className="mt-6 rounded-2xl border bg-muted/30 p-5"><p className="font-semibold">Planned {formatDoseAmount(event.doseAmount)} {event.doseUnit}</p><p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground"><CalendarClock className="size-4" aria-hidden="true" />{event.date} · {event.timeOfDay ?? "Any time"} · {event.cycleName}</p><p className="mt-3 text-xs leading-5 text-muted-foreground">These scheduled values remain unchanged. Enter the actual details below.</p></div><div className="mt-8"><InjectionRecordForm action={action} submitLabel="Save injection record" rotation={rotation} initial={{ actualDate: event.date, actualDoseAmount: "", actualDoseUnit: event.doseUnit, actualTime: "", actualVolumeMl: "", injectionSiteId: null, notes: "", status: initialStatus }} /></div></div></section></main>;
}
