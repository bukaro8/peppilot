import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, CalendarPlus, Clock3, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";

import { deleteMemberProtocolAction } from "@/app/protocols/actions";
import { ProtocolHeader } from "@/components/member-protocol/protocol-header";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { AuthorizationError } from "@/lib/auth/policy";
import { requireActor } from "@/lib/auth/session";
import { getMemberProtocol, MemberProtocolError } from "@/lib/member-protocol/service";
import { formatDoseAmount, formatTemplateFrequency } from "@/lib/protocol-template/presentation";

export const metadata: Metadata = { title: "Private protocol" };

type ProtocolPageProps = {
  params: Promise<{ protocolId: string }>;
  searchParams: Promise<{ created?: string; saved?: string }>;
};

export default async function ProtocolPage({ params, searchParams }: ProtocolPageProps) {
  const actor = await requireActor();
  const { protocolId } = await params;
  let protocol;
  try {
    protocol = await getMemberProtocol(actor, protocolId);
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof MemberProtocolError) notFound();
    throw error;
  }
  if (!protocol) notFound();
  const query = await searchParams;
  const entryNames = new Map(
    protocol.entries.map((entry) => [entry.catalogueEntryId, entry.displayName]),
  );

  return (
    <main className="min-h-screen bg-secondary/20">
      <ProtocolHeader />
      <article className="mx-auto w-full max-w-4xl px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <Button variant="ghost" size="sm" asChild><Link href="/protocols"><ArrowLeft className="size-4" aria-hidden="true" />Back to protocols</Link></Button>
        <div className="mt-6 rounded-[2rem] border bg-background p-6 shadow-sm sm:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap gap-2"><span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">Private draft</span>{protocol.origin === "template" ? <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"><Copy className="size-3.5" aria-hidden="true" />{protocol.templateScheduleUnchanged ? "Template unchanged" : "Template customised"}</span> : <span className="rounded-full border px-3 py-1.5 text-xs font-semibold">Custom</span>}</div>
              <h1 className="mt-6 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">{protocol.name}</h1>
              {protocol.description ? <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">{protocol.description}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link href={`/protocols/${protocol.id}/edit`}><Pencil className="size-4" aria-hidden="true" />Edit draft</Link></Button><Button asChild><Link href={`/cycles/new?protocolId=${protocol.id}`}><CalendarPlus className="size-4" aria-hidden="true" />Start cycle</Link></Button></div>
          </div>

          {query.created ? <div className="mt-6 space-y-4"><FormMessage tone="success">Private protocol draft created. Start its first cycle or add another protocol.</FormMessage><div className="flex flex-col gap-2 sm:flex-row"><Button asChild><Link href={`/cycles/new?protocolId=${protocol.id}`}><CalendarPlus className="size-4" aria-hidden="true" />Start cycle</Link></Button><Button variant="outline" asChild><Link href="/protocols/new"><Plus className="size-4" aria-hidden="true" />Add another protocol</Link></Button></div></div> : null}
          {query.saved ? <div className="mt-6"><FormMessage tone="success">Protocol draft saved.</FormMessage></div> : null}

          {protocol.origin === "template" ? (
            <div className="mt-7 rounded-2xl border border-primary/20 bg-secondary/45 p-4 text-sm leading-6">
              <p className="font-semibold">Source: {protocol.sourceTemplateName}, version {protocol.sourceTemplateVersionNumber}</p>
              <p className="mt-1 text-muted-foreground">Original template and version references remain attached even after private customisation.</p>
            </div>
          ) : null}

          <div className="mt-8 inline-flex items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3 font-semibold"><CalendarDays className="size-5 text-primary" aria-hidden="true" />{protocol.durationDays} days</div>

          <section className="mt-10 border-t pt-8" aria-labelledby="private-schedule-heading">
            <h2 id="private-schedule-heading" className="text-2xl font-bold">Planned schedule</h2>
            <div className="mt-5 space-y-4">
              {protocol.steps.map((step) => (
                <div key={step.id} className="grid gap-4 rounded-2xl border bg-muted/30 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div><p className="text-lg font-bold">{entryNames.get(step.catalogueEntryId)}</p><p className="mt-1 text-sm text-muted-foreground">{formatTemplateFrequency(step.frequency, step.daysOfWeek, step.intervalDays)} · Days {step.startDay}–{step.endDay}</p></div>
                  <div className="sm:text-right"><p className="font-semibold">{formatDoseAmount(step.doseAmount)} {step.doseUnit}</p>{step.timeOfDay ? <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Clock3 className="size-3.5" aria-hidden="true" />{step.timeOfDay}</p> : null}</div>
                </div>
              ))}
            </div>
          </section>

          <details className="mt-10 border-t pt-6">
            <summary className="cursor-pointer text-sm font-semibold text-destructive">Delete draft</summary>
            <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-4"><p className="text-sm leading-6">This permanently removes this private draft and its planned schedule.</p><form action={deleteMemberProtocolAction} className="mt-4"><input type="hidden" name="protocolId" value={protocol.id} /><Button type="submit" variant="outline"><Trash2 className="size-4" aria-hidden="true" />Delete protocol draft</Button></form></div>
          </details>
        </div>
      </article>
    </main>
  );
}
