import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ClipboardPlus, Plus } from "lucide-react";

import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { requireCompletedProfile } from "@/lib/auth/session";
import { getMemberProtocols } from "@/lib/member-protocol/service";

export const metadata: Metadata = { title: "Create your protocols" };

export default async function OnboardingProtocolsPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const { actor } = await requireCompletedProfile();
  const [protocols, query] = await Promise.all([
    getMemberProtocols(actor),
    searchParams,
  ]);
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-4 sm:px-8 lg:px-10">
      <OnboardingProgress currentStep={3} />
      <div className="mt-8 rounded-[2rem] border bg-background p-5 shadow-sm sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Step 3 of 5</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Create your protocols</h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Start with an existing template or build a custom schedule. Add one protocol now, or create several before continuing.</p>
        {query.created ? <div className="mt-6"><FormMessage tone="success">Protocol saved. Add another or continue when you are ready.</FormMessage></div> : null}

        <section className="mt-8" aria-labelledby="saved-protocols-heading">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="saved-protocols-heading" className="text-2xl font-bold">Your saved protocols</h2><p className="mt-1 text-sm text-muted-foreground">{protocols.length} saved during setup or earlier.</p></div><div className="flex flex-col gap-2 sm:flex-row"><Button variant="outline" asChild><Link href="/protocols/new?onboarding=1"><Plus className="size-4" aria-hidden="true" />Create custom protocol</Link></Button><Button asChild><Link href="/templates?onboarding=1"><BookOpen className="size-4" aria-hidden="true" />Browse protocol library</Link></Button></div></div>
          {protocols.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{protocols.map((protocol) => <article key={protocol.id} className="rounded-2xl border bg-muted/20 p-5"><div className="flex items-center justify-between gap-3"><CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" /><span className="text-xs font-semibold text-muted-foreground">{protocol.durationType === "fixed_cycle" ? `${protocol.durationDays} days` : protocol.durationType === "open_ended" ? "Open-ended" : "As needed"}</span></div><h3 className="mt-4 text-lg font-bold">{protocol.name}</h3><p className="mt-2 text-sm text-muted-foreground">{protocol.origin === "approved_preset" ? "Approved protocol copy" : protocol.origin === "template" ? "Template-based" : "Custom schedule"}</p></article>)}</div> : <div className="mt-4 rounded-2xl border border-dashed bg-muted/20 p-7 text-center"><ClipboardPlus className="mx-auto size-7 text-primary" aria-hidden="true" /><h3 className="mt-3 font-bold">Start with one protocol</h3><p className="mt-1 text-sm text-muted-foreground">Choose an approved protocol from the library or build your own.</p></div>}
        </section>

        <div className="mt-9 flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"><Button variant="ghost" asChild><Link href="/onboarding/sites"><ArrowLeft className="size-4" aria-hidden="true" />Back</Link></Button><div className="flex flex-col gap-3 sm:flex-row"><Button variant="ghost" asChild><Link href="/onboarding/cycles">Skip for now</Link></Button><Button size="lg" asChild><Link href="/onboarding/cycles">Continue to cycles<ArrowRight className="size-4" aria-hidden="true" /></Link></Button></div></div>
      </div>
    </section>
  );
}
