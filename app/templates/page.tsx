import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, FlaskConical, Search } from "lucide-react";

import { TemplateHeader } from "@/components/protocol-template/template-header";
import { getApprovedProtocolCatalogue } from "@/lib/approved-protocol/service";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Protocol templates" };
export const dynamic = "force-dynamic";

export default async function ProtocolTemplatesPage({ searchParams }: { searchParams: Promise<{ onboarding?: string; q?: string }> }) {
  const query = await searchParams;
  const onboarding = query.onboarding === "1";
  const search = query.q?.trim().slice(0, 80) ?? "";
  const allTemplates = await getApprovedProtocolCatalogue();
  const templates = search ? allTemplates.filter((template) => `${template.displayName} ${template.kind}`.toLowerCase().includes(search.toLowerCase())) : allTemplates;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_78%_4%,oklch(0.91_0.07_83/.65),transparent_34%),radial-gradient(circle_at_3%_35%,oklch(0.86_0.08_292/.72),transparent_38%)]" />
      <TemplateHeader onboarding={onboarding} />
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-7 sm:px-8 sm:pt-14 lg:px-10">
        {onboarding ? <Button variant="ghost" size="sm" asChild><Link href="/onboarding/protocols"><ArrowLeft className="size-4" />Back to onboarding</Link></Button> : null}
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Protocol library</p>
          <h1 className="mt-2 text-balance text-3xl font-bold tracking-[-0.05em] sm:mt-3 sm:text-5xl">Choose a compound</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground sm:mt-5 sm:text-lg sm:leading-8">Preview three approved starting structures for every catalogue entry, or create a custom private protocol.</p>
        </div>
        <form action="/templates" className="mt-8 flex max-w-2xl gap-3" role="search">{onboarding ? <input type="hidden" name="onboarding" value="1" /> : null}<label htmlFor="protocol-library-search" className="sr-only">Search protocol library</label><div className="relative flex-1"><Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input id="protocol-library-search" name="q" type="search" defaultValue={search} placeholder="Search all 28 compounds" className="h-12 w-full rounded-xl border bg-background pl-11 pr-4" /></div><Button type="submit">Search</Button></form>

        {templates.length > 0 ? (
          <div className="mt-7 grid gap-3 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Link key={template.catalogueEntryId} href={`/templates/${template.slug}${onboarding ? "?onboarding=1" : ""}`} className="group flex min-h-44 flex-col rounded-2xl border bg-background/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 sm:min-h-56 sm:rounded-[1.75rem] sm:p-6">
                <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">3 approved options</span><FlaskConical className="size-5 text-orange-500" aria-hidden="true" /></div>
                <h2 className="mt-4 text-xl font-bold tracking-[-0.035em] sm:mt-6 sm:text-2xl">{template.displayName}</h2>
                <p className="mt-2 text-sm capitalize text-muted-foreground">{template.kind.replaceAll("_", " ")}</p>
                <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold">Choose a protocol <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-[2rem] border border-dashed bg-background/80 p-8 text-center sm:p-12">
            <FlaskConical className="mx-auto size-8 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-bold">{allTemplates.length ? "No compounds match your search" : "Approved protocols are not loaded"}</h2>
            <p className="mx-auto mt-2 max-w-lg leading-7 text-muted-foreground">{allTemplates.length ? `Try a different name or clear “${search}” to browse all 28 compounds.` : "Run the reference-data seed to synchronise the approved catalogue."}</p>
            <Link className="mt-5 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline" href={allTemplates.length ? `/templates${onboarding ? "?onboarding=1" : ""}` : "/catalogue"}>{allTemplates.length ? "Clear search" : "Browse the peptide catalogue"}</Link>
          </div>
        )}
      </section>
    </main>
  );
}
