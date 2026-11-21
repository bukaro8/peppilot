import type { Metadata } from "next";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteMeasurementAction, updateMeasurementAction } from "@/app/journal/measurements/actions";
import { JournalNav } from "@/components/health/journal-nav";
import { MeasurementForm } from "@/components/health/measurement-form";
import { CalendarHeader } from "@/components/protocol-calendar/calendar-header";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { AuthorizationError } from "@/lib/auth/policy";
import { requireActor } from "@/lib/auth/session";
import { getHealthMeasurement, HealthMeasurementError } from "@/lib/health/measurement-service";
import type { HealthMetricId } from "@/lib/health/metrics";

export const metadata: Metadata = { title: "Edit health measurement" };

export default async function MeasurementPage({ params, searchParams }: { params: Promise<{ measurementId: string }>; searchParams: Promise<{ created?: string; saved?: string }> }) {
  const actor = await requireActor();
  const { measurementId } = await params;
  let measurement;
  try { measurement = await getHealthMeasurement(actor, measurementId); }
  catch (error) { if (error instanceof AuthorizationError || error instanceof HealthMeasurementError) notFound(); throw error; }
  if (!measurement) notFound();
  const query = await searchParams;
  const updateAction = updateMeasurementAction.bind(null, measurement.id);
  const deleteAction = deleteMeasurementAction.bind(null, measurement.id);

  return <main className="min-h-screen bg-secondary/20"><CalendarHeader /><JournalNav /><section className="mx-auto w-full max-w-3xl px-5 pb-16 pt-8 sm:px-8"><Button variant="ghost" size="sm" asChild><Link href="/journal/measurements"><ArrowLeft className="size-4" aria-hidden="true" />Back to measurements</Link></Button><div className="mt-6 rounded-[2rem] border bg-background p-6 shadow-sm sm:p-10"><p className="text-sm font-semibold uppercase tracking-wider text-primary">Private health journal</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.045em]">Edit measurement</h1>{query.created ? <div className="mt-5"><FormMessage tone="success">Measurement saved.</FormMessage></div> : null}{query.saved ? <div className="mt-5"><FormMessage tone="success">Measurement updated.</FormMessage></div> : null}<div className="mt-8"><MeasurementForm action={updateAction} requestId={measurement.id} submitLabel="Save changes" initial={{ metricId: measurement.metricId as HealthMetricId, notes: measurement.notes ?? "", observedOn: measurement.observedOn, unit: measurement.enteredUnit, value: measurement.enteredValue }} /></div><details className="mt-10 rounded-2xl border border-destructive/20 p-5"><summary className="cursor-pointer font-semibold text-destructive">Delete measurement</summary><p className="mt-3 text-sm text-muted-foreground">This permanently removes this journal entry.</p><form action={deleteAction} className="mt-4"><Button type="submit" className="bg-destructive text-white hover:bg-destructive/90"><Trash2 className="size-4" aria-hidden="true" />Delete permanently</Button></form></details></div></section></main>;
}
