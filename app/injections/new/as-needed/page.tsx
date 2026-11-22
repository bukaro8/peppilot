import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { createAsNeededInjectionRecordAction } from "@/app/injections/actions";
import { CalendarHeader } from "@/components/protocol-calendar/calendar-header";
import { InjectionRecordForm } from "@/components/injection/injection-record-form";
import { Button } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/session";
import { getAsNeededInjectionOption } from "@/lib/injection/service";
import { getInjectionSiteRotation } from "@/lib/injection/rotation-service";
import { formatDoseAmount } from "@/lib/protocol-template/presentation";

export const metadata: Metadata = { title: "Record as-needed injection" };

export default async function AsNeededInjectionPage({ searchParams }: { searchParams: Promise<{ cycleId?: string }> }) {
  const actor = await requireActor();
  const cycleId = (await searchParams).cycleId;
  if (!cycleId) notFound();
  const option = await getAsNeededInjectionOption(actor, cycleId);
  if (!option) notFound();
  const date = new Date().toISOString().slice(0, 10);
  const rotation = await getInjectionSiteRotation(actor, date);
  const action = createAsNeededInjectionRecordAction.bind(null, cycleId);
  return <main className="min-h-screen bg-secondary/20"><CalendarHeader /><section className="mx-auto w-full max-w-3xl px-5 pb-16 pt-8 sm:px-8"><Button variant="ghost" size="sm" asChild><Link href={`/cycles/${cycleId}`}><ArrowLeft className="size-4" />Back to cycle</Link></Button><div className="mt-6 rounded-[2rem] border bg-background p-6 shadow-sm sm:p-10"><p className="text-sm font-semibold uppercase tracking-wider text-primary">As-needed administration</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.045em]">Record {option.peptideName}</h1><p className="mt-4 text-muted-foreground">No recurring calendar events are generated. Record each administration only when used.</p><div className="mt-6 rounded-2xl border bg-muted/30 p-5"><p className="font-semibold">Reference dose {formatDoseAmount(option.doseAmount)} {option.doseUnit}</p><p className="mt-1 text-sm text-muted-foreground">{option.cycleName}</p></div><div className="mt-8"><InjectionRecordForm action={action} submitLabel="Save administration" rotation={rotation} initial={{ actualDate: date, actualDoseAmount: option.doseAmount, actualDoseUnit: option.doseUnit, actualTime: "", actualVolumeMl: "", injectionSiteId: null, notes: "", status: "completed" }} /></div></div></section></main>;
}
