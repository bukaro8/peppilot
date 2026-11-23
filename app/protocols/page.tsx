import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarPlus, ClipboardPlus, Copy, FilePenLine, Plus } from "lucide-react";

import { ProtocolHeader } from "@/components/member-protocol/protocol-header";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { requireActor } from "@/lib/auth/session";
import { getMemberProtocols } from "@/lib/member-protocol/service";

export const metadata: Metadata = { title: "My protocols" };

type ProtocolsPageProps = { searchParams: Promise<{ deleted?: string; start?: string }> };

export default async function ProtocolsPage({ searchParams }: ProtocolsPageProps) {
  const actor = await requireActor();
  const [protocols, query] = await Promise.all([getMemberProtocols(actor), searchParams]);

  return (
    <main className="min-h-screen bg-secondary/20">
      <ProtocolHeader />
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-8 sm:pt-10 lg:px-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-primary sm:text-sm">Private workspace</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] sm:text-5xl">My protocol drafts</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:mt-3 sm:text-base sm:leading-7">Choose an approved protocol or create your own schedule. Every saved draft stays private to your account.</p></div>
          <div className="grid gap-2 sm:grid-cols-2 md:flex"><Button variant="outline" asChild><Link href="/protocols/new"><Plus className="size-4" aria-hidden="true" />Create custom protocol</Link></Button><Button asChild><Link href="/templates"><BookOpen className="size-4" aria-hidden="true" />Browse protocol library</Link></Button></div>
        </div>

        {query.deleted ? <div className="mt-6"><FormMessage tone="success">Protocol draft deleted.</FormMessage></div> : null}
        {query.start ? <div className="mt-5 rounded-xl border border-primary/20 bg-secondary/50 p-4 text-sm"><span className="font-semibold">Choose a saved protocol below to start another independent cycle,</span> or use the library and custom actions above to create a new one.</div> : null}

        {protocols.length > 0 ? (
          <div className="mt-7 grid gap-3 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
            {protocols.map((protocol) => (
              <article key={protocol.id} className="flex flex-col rounded-2xl border bg-background p-5 shadow-sm sm:min-h-60 sm:rounded-[1.75rem] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold"><FilePenLine className="size-3.5" aria-hidden="true" />Draft</span>
                  {protocol.origin === "template" ? <Copy className="size-5 text-primary" aria-hidden="true" /> : <ClipboardPlus className="size-5 text-primary" aria-hidden="true" />}
                </div>
                <h2 className="mt-4 text-xl font-bold tracking-[-0.035em] sm:mt-6 sm:text-2xl">{protocol.name}</h2>
                <p className="mt-1 text-sm font-medium text-primary">{protocol.durationType === "fixed_cycle" ? `${protocol.durationDays} days` : protocol.durationType === "open_ended" ? "Open-ended" : "As needed"}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{protocol.origin === "template" ? `${protocol.templateScheduleUnchanged ? "Unchanged" : "Customised"} copy of ${protocol.sourceTemplateName ?? "a template"}, version ${protocol.sourceTemplateVersionNumber}` : protocol.origin === "approved_preset" ? "Editable copy of an approved protocol" : "Custom schedule"}</p>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-auto sm:pt-6"><Button variant="outline" size="sm" asChild><Link href={`/protocols/${protocol.id}`}>View draft<ArrowRight className="size-4" aria-hidden="true" /></Link></Button><Button size="sm" asChild><Link href={`/cycles/new?protocolId=${protocol.id}`}><CalendarPlus className="size-4" aria-hidden="true" />Start cycle</Link></Button></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-dashed bg-background p-6 text-center sm:mt-10 sm:rounded-[2rem] sm:p-12">
            <ClipboardPlus className="mx-auto size-8 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-bold">No private drafts yet</h2>
            <p className="mx-auto mt-2 max-w-lg leading-7 text-muted-foreground">Start from a blank schedule or browse published templates for a private copy.</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Button asChild><Link href="/templates">Browse protocol library</Link></Button><Button variant="outline" asChild><Link href="/protocols/new">Create custom protocol</Link></Button></div>
          </div>
        )}
      </section>
    </main>
  );
}
