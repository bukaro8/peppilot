import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardPlus, Copy, FilePenLine, Plus } from "lucide-react";

import { ProtocolHeader } from "@/components/member-protocol/protocol-header";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { requireActor } from "@/lib/auth/session";
import { getMemberProtocols } from "@/lib/member-protocol/service";

export const metadata: Metadata = { title: "My protocols" };

type ProtocolsPageProps = { searchParams: Promise<{ deleted?: string }> };

export default async function ProtocolsPage({ searchParams }: ProtocolsPageProps) {
  const actor = await requireActor();
  const [protocols, query] = await Promise.all([getMemberProtocols(actor), searchParams]);

  return (
    <main className="min-h-screen bg-secondary/20">
      <ProtocolHeader />
      <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-wider text-primary">Private workspace</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">My protocol drafts</h1><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Plan a custom schedule or copy a published template. Drafts are visible only to your account.</p></div>
          <Button size="lg" asChild><Link href="/protocols/new"><Plus className="size-4" aria-hidden="true" />New custom protocol</Link></Button>
        </div>

        {query.deleted ? <div className="mt-6"><FormMessage tone="success">Protocol draft deleted.</FormMessage></div> : null}

        {protocols.length > 0 ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {protocols.map((protocol) => (
              <Link key={protocol.id} href={`/protocols/${protocol.id}`} className="group flex min-h-60 flex-col rounded-[1.75rem] border bg-background p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold"><FilePenLine className="size-3.5" aria-hidden="true" />Draft</span>
                  {protocol.origin === "template" ? <Copy className="size-5 text-primary" aria-hidden="true" /> : <ClipboardPlus className="size-5 text-primary" aria-hidden="true" />}
                </div>
                <h2 className="mt-6 text-2xl font-bold tracking-[-0.035em]">{protocol.name}</h2>
                <p className="mt-2 text-sm font-medium text-primary">{protocol.durationDays} days</p>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{protocol.origin === "template" ? `${protocol.templateScheduleUnchanged ? "Unchanged" : "Customised"} copy of ${protocol.sourceTemplateName ?? "a template"}, version ${protocol.sourceTemplateVersionNumber}` : "Custom schedule"}</p>
                <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold">View private draft <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-[2rem] border border-dashed bg-background p-8 text-center sm:p-12">
            <ClipboardPlus className="mx-auto size-8 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-bold">No private drafts yet</h2>
            <p className="mx-auto mt-2 max-w-lg leading-7 text-muted-foreground">Start from a blank schedule or browse published templates for a private copy.</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Button asChild><Link href="/protocols/new">Create from scratch</Link></Button><Button variant="outline" asChild><Link href="/templates">Browse templates</Link></Button></div>
          </div>
        )}
      </section>
    </main>
  );
}
