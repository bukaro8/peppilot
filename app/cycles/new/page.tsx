import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { notFound } from "next/navigation";

import { startProtocolCycleAction } from "@/app/cycles/actions";
import { CycleHeader } from "@/components/protocol-cycle/cycle-header";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { AuthorizationError } from "@/lib/auth/policy";
import { requireActor } from "@/lib/auth/session";
import { getMemberProtocol, MemberProtocolError } from "@/lib/member-protocol/service";

export const metadata: Metadata = { title: "Start protocol cycle" };

type NewCyclePageProps = {
  searchParams: Promise<{ error?: string; protocolId?: string }>;
};

export default async function NewCyclePage({ searchParams }: NewCyclePageProps) {
  const actor = await requireActor();
  const query = await searchParams;
  if (!query.protocolId) notFound();
  let protocol;
  try {
    protocol = await getMemberProtocol(actor, query.protocolId);
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof MemberProtocolError) notFound();
    throw error;
  }
  if (!protocol) notFound();

  return (
    <main className="min-h-screen bg-secondary/20">
      <CycleHeader />
      <section className="mx-auto w-full max-w-3xl px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <Button variant="ghost" size="sm" asChild><Link href={`/protocols/${protocol.id}`}><ArrowLeft className="size-4" aria-hidden="true" />Back to protocol</Link></Button>
        <div className="mt-6 rounded-[2rem] border bg-background p-6 shadow-sm sm:p-9">
          <CalendarPlus className="size-8 text-primary" aria-hidden="true" />
          <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-primary">Independent cycle</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em]">Start {protocol.name}</h1>
          <p className="mt-3 leading-7 text-muted-foreground">This creates a separate active cycle with its own dates and schedule history. It will not link baselines or results to another cycle.</p>
          <div className="mt-6 rounded-2xl border bg-muted/30 p-4 text-sm"><p><span className="font-semibold">Duration:</span> {protocol.durationDays} days</p><p className="mt-2"><span className="font-semibold">Schedule:</span> {protocol.steps.length} step{protocol.steps.length === 1 ? "" : "s"}</p><p className="mt-2"><span className="font-semibold">Source:</span> {protocol.origin === "template" ? `${protocol.templateScheduleUnchanged ? "unchanged" : "customised"} template copy` : "custom protocol"}</p></div>
          {query.error ? <div className="mt-6"><FormMessage tone="error">{query.error}</FormMessage></div> : null}
          <form action={startProtocolCycleAction} className="mt-8 space-y-6">
            <input type="hidden" name="protocolId" value={protocol.id} />
            <div className="space-y-2"><label className="text-sm font-semibold" htmlFor="cycle-start-date">Start date</label><input id="cycle-start-date" name="startDate" type="date" required className="h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><p className="text-xs leading-5 text-muted-foreground">The planned end date is calculated from the saved {protocol.durationDays}-day duration.</p></div>
            <Button type="submit" size="lg">Start active cycle</Button>
          </form>
        </div>
      </section>
    </main>
  );
}
