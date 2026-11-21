import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardPlus, Copy, Plus } from "lucide-react";

import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { requireCompletedProfile } from "@/lib/auth/session";
import { getMemberProtocols } from "@/lib/member-protocol/service";
import { getPublishedProtocolTemplates } from "@/lib/protocol-template/service";

export const metadata: Metadata = { title: "Create your protocols" };

export default async function OnboardingProtocolsPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const { actor } = await requireCompletedProfile();
  const [protocols, templates, query] = await Promise.all([
    getMemberProtocols(actor),
    getPublishedProtocolTemplates(),
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
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="saved-protocols-heading" className="text-2xl font-bold">Your saved protocols</h2><p className="mt-1 text-sm text-muted-foreground">{protocols.length} saved during setup or earlier.</p></div><Button asChild><Link href="/protocols/new?onboarding=1"><Plus className="size-4" aria-hidden="true" />{protocols.length ? "Add another protocol" : "Create custom protocol"}</Link></Button></div>
          {protocols.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{protocols.map((protocol) => <article key={protocol.id} className="rounded-2xl border bg-muted/20 p-5"><div className="flex items-center justify-between gap-3"><CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" /><span className="text-xs font-semibold text-muted-foreground">{protocol.durationDays} days</span></div><h3 className="mt-4 text-lg font-bold">{protocol.name}</h3><p className="mt-2 text-sm text-muted-foreground">{protocol.origin === "template" ? "Template-based" : "Custom schedule"}</p></article>)}</div> : <div className="mt-4 rounded-2xl border border-dashed bg-muted/20 p-7 text-center"><ClipboardPlus className="mx-auto size-7 text-primary" aria-hidden="true" /><h3 className="mt-3 font-bold">Start with one protocol</h3><p className="mt-1 text-sm text-muted-foreground">You can always add more later.</p></div>}
        </section>

        {templates.length ? <section className="mt-9 border-t pt-8" aria-labelledby="templates-heading"><div><h2 id="templates-heading" className="text-2xl font-bold">Start from a template</h2><p className="mt-1 text-sm text-muted-foreground">Review and customise a published schedule before saving your private copy.</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{templates.slice(0, 6).map((template) => <Link key={template.id} href={`/protocols/new?templateVersion=${template.id}&onboarding=1`} className="group rounded-2xl border p-5 transition hover:border-primary/35 hover:bg-secondary/20 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"><div className="flex items-center justify-between"><Copy className="size-5 text-primary" aria-hidden="true" /><span className="text-xs font-semibold text-muted-foreground">v{template.versionNumber}</span></div><h3 className="mt-4 font-bold">{template.name}</h3><p className="mt-1 text-sm text-muted-foreground">{template.durationDays} days</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">Use template<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span></Link>)}</div></section> : null}

        <div className="mt-9 flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"><Button variant="ghost" asChild><Link href="/onboarding/sites"><ArrowLeft className="size-4" aria-hidden="true" />Back</Link></Button><div className="flex flex-col gap-3 sm:flex-row"><Button variant="ghost" asChild><Link href="/onboarding/cycles">Skip for now</Link></Button><Button size="lg" asChild><Link href="/onboarding/cycles">Continue to cycles<ArrowRight className="size-4" aria-hidden="true" /></Link></Button></div></div>
      </div>
    </section>
  );
}
