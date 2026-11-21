import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { createMeasurementAction } from "@/app/journal/measurements/actions";
import { JournalNav } from "@/components/health/journal-nav";
import { MeasurementForm } from "@/components/health/measurement-form";
import { CalendarHeader } from "@/components/protocol-calendar/calendar-header";
import { Button } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Add health measurement" };

export default async function NewMeasurementPage() {
  await requireActor();
  const today = new Date().toISOString().slice(0, 10);
  return <main className="min-h-screen bg-secondary/20"><CalendarHeader /><JournalNav /><section className="mx-auto w-full max-w-3xl px-5 pb-16 pt-8 sm:px-8"><Button variant="ghost" size="sm" asChild><Link href="/journal/measurements"><ArrowLeft className="size-4" aria-hidden="true" />Back to measurements</Link></Button><div className="mt-6 rounded-[2rem] border bg-background p-6 shadow-sm sm:p-10"><p className="text-sm font-semibold uppercase tracking-wider text-primary">Private health journal</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.045em]">Add measurement</h1><p className="mt-3 text-muted-foreground">Record the value you measured. PepPilot stores a canonical value without attaching it to a protocol.</p><div className="mt-8"><MeasurementForm action={createMeasurementAction} requestId={crypto.randomUUID()} submitLabel="Save measurement" initial={{ metricId: "weight", notes: "", observedOn: today, unit: "kg", value: "" }} /></div></div></section></main>;
}
