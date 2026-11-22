import type { Metadata } from "next";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateInjectionRecordAction } from "@/app/injections/actions";
import { InjectionRecordForm } from "@/components/injection/injection-record-form";
import { CalendarHeader } from "@/components/protocol-calendar/calendar-header";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { AuthorizationError } from "@/lib/auth/policy";
import { requireActor } from "@/lib/auth/session";
import { getInjectionRecord, InjectionRecordError } from "@/lib/injection/service";
import { getInjectionSiteRotation } from "@/lib/injection/rotation-service";
import { formatInjectionSite } from "@/lib/injection/sites";
import { formatDoseAmount } from "@/lib/protocol-template/presentation";

export const metadata: Metadata = { title: "Injection record" };

export default async function InjectionRecordPage({ params, searchParams }: { params: Promise<{ recordId: string }>; searchParams: Promise<{ created?: string; saved?: string }> }) {
  const actor = await requireActor();
  const { recordId } = await params;
  let record;
  try { record = await getInjectionRecord(actor, recordId); }
  catch (error) { if (error instanceof AuthorizationError || error instanceof InjectionRecordError) notFound(); throw error; }
  if (!record) notFound();
  const rotation = await getInjectionSiteRotation(actor, record.actualDate ?? record.scheduledDate, {
    excludeRecordId: record.id,
  });
  const query = await searchParams;
  const action = updateInjectionRecordAction.bind(null, record.id);

  return <main className="min-h-screen bg-secondary/20"><CalendarHeader /><section className="mx-auto w-full max-w-3xl px-5 pb-16 pt-8 sm:px-8"><Button variant="ghost" size="sm" asChild><Link href={`/cycles/${record.cycleId}`}><ArrowLeft className="size-4" aria-hidden="true" />Back to cycle</Link></Button><div className="mt-6 rounded-[2rem] border bg-background p-6 shadow-sm sm:p-10"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-primary">Private injection record</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.045em]">{record.peptideName}</h1><p className="mt-2 text-muted-foreground">{record.cycleName}</p></div><span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold capitalize"><CheckCircle2 className="size-3.5" aria-hidden="true" />{record.status}</span></div>{query.created ? <div className="mt-6"><FormMessage tone="success">Injection record saved.</FormMessage></div> : null}{query.saved ? <div className="mt-6"><FormMessage tone="success">Correction saved. The prior values remain in correction history.</FormMessage></div> : null}<div className="mt-6 rounded-2xl border bg-muted/30 p-5"><p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Scheduled values</p><p className="mt-2 font-semibold">{formatDoseAmount(record.scheduledDoseAmount)} {record.scheduledDoseUnit}</p><p className="mt-1 text-sm text-muted-foreground">{record.scheduledDate} · {record.scheduledTime ?? "Any time"}</p>{record.status === "completed" ? <p className="mt-3 text-sm font-semibold text-primary">{formatInjectionSite(record.injectionSiteId)}</p> : null}</div><div className="mt-8"><h2 className="text-2xl font-bold">Correct record</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Updating this record never changes the scheduled occurrence.</p><div className="mt-6"><InjectionRecordForm action={action} submitLabel="Save correction" rotation={rotation} initial={{ actualDate: record.actualDate ?? record.scheduledDate, actualDoseAmount: record.actualDoseAmount ?? "", actualDoseUnit: record.actualDoseUnit ?? record.scheduledDoseUnit, actualTime: record.actualTime ?? "", actualVolumeMl: record.actualVolumeMl ?? "", injectionSiteId: record.injectionSiteId, notes: record.notes ?? "", status: record.status }} /></div></div></div></section></main>;
}
