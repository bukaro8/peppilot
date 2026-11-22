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
  searchParams: Promise<{ error?: string; onboarding?: string; protocolId?: string }>;
};

export default async function NewCyclePage({ searchParams }: NewCyclePageProps) {
  const actor = await requireActor();
  const query = await searchParams;
  const inOnboarding = query.onboarding === "1";
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
        <Button variant="ghost" size="sm" asChild><Link href={inOnboarding ? "/onboarding/cycles" : `/protocols/${protocol.id}`}><ArrowLeft className="size-4" aria-hidden="true" />{inOnboarding ? "Back to onboarding" : "Back to protocol"}</Link></Button>
        <div className="mt-6 rounded-[2rem] border bg-background p-6 shadow-sm sm:p-9">
          <CalendarPlus className="size-8 text-primary" aria-hidden="true" />
          <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-primary">Independent cycle</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em]">Start {protocol.name}</h1>
          <p className="mt-3 leading-7 text-muted-foreground">This creates a separate active cycle with its own dates and schedule history. It will not link baselines or results to another cycle.</p>
          <div className="mt-6 rounded-2xl border bg-muted/30 p-4 text-sm"><p><span className="font-semibold">Duration:</span> {protocol.durationType === "fixed_cycle" ? `${protocol.durationDays} days` : protocol.durationType === "open_ended" ? "Open-ended" : "As needed"}</p><p className="mt-2"><span className="font-semibold">Schedule:</span> {protocol.steps.length} step{protocol.steps.length === 1 ? "" : "s"}</p><p className="mt-2"><span className="font-semibold">Source:</span> {protocol.origin === "approved_preset" ? "customised approved preset" : protocol.origin === "template" ? `${protocol.templateScheduleUnchanged ? "unchanged" : "customised"} template copy` : "custom protocol"}</p></div>
          {query.error ? <div className="mt-6"><FormMessage tone="error">{query.error}</FormMessage></div> : null}
          <form action={startProtocolCycleAction} className="mt-8 space-y-6">
            <input type="hidden" name="protocolId" value={protocol.id} />
            {inOnboarding ? <input type="hidden" name="onboarding" value="1" /> : null}
            <div className="space-y-2"><label className="text-sm font-semibold" htmlFor="cycle-start-date">Start date</label><input id="cycle-start-date" name="startDate" type="date" required className="h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><p className="text-xs leading-5 text-muted-foreground">{protocol.durationType === "fixed_cycle" ? `The expected completion date uses the exact saved ${protocol.durationDays}-day duration.` : "This cycle has no automatic stopping date."}</p></div>
            {protocol.origin === "approved_preset" ? <fieldset className="rounded-2xl border bg-muted/20 p-5"><legend className="px-2 font-semibold">Actual preparation <span className="font-normal text-muted-foreground">(optional)</span></legend><p className="mb-4 text-sm leading-6 text-muted-foreground">Enter your actual supply only. Preparation examples are never assumed.</p><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-sm font-medium">Vial strength (mg)</span><input name="vialStrengthMg" inputMode="decimal" className="h-11 w-full rounded-xl border bg-background px-3" /></label><label className="space-y-2"><span className="text-sm font-medium">Diluent volume (mL)</span><input name="diluentVolumeMl" inputMode="decimal" className="h-11 w-full rounded-xl border bg-background px-3" /></label><label className="space-y-2"><span className="text-sm font-medium">Syringe units per mL</span><input name="syringeUnitsPerMl" inputMode="decimal" className="h-11 w-full rounded-xl border bg-background px-3" /></label><label className="space-y-2"><span className="text-sm font-medium">Ingredient proportions</span><input name="ingredientProportions" placeholder="Use the vial label" className="h-11 w-full rounded-xl border bg-background px-3" /></label></div></fieldset> : null}
            <Button type="submit" size="lg">Start active cycle</Button>
          </form>
        </div>
      </section>
    </main>
  );
}
