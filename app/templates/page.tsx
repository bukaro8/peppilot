import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";

import { TemplateHeader } from "@/components/protocol-template/template-header";
import { getPublishedProtocolTemplates } from "@/lib/protocol-template/service";

export const metadata: Metadata = { title: "Protocol templates" };
export const dynamic = "force-dynamic";

export default async function ProtocolTemplatesPage() {
  const templates = await getPublishedProtocolTemplates();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_78%_4%,oklch(0.91_0.07_83/.65),transparent_34%),radial-gradient(circle_at_3%_35%,oklch(0.9_0.06_155/.75),transparent_38%)]" />
      <TemplateHeader />
      <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-12 sm:px-8 sm:pt-20 lg:px-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Protocol library</p>
          <h1 className="mt-3 text-balance text-4xl font-bold tracking-[-0.05em] sm:text-6xl">Published protocol templates</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">Browse administrator-authored schedules. Templates are reference structures and do not replace individual medical guidance.</p>
        </div>

        {templates.length > 0 ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Link key={template.id} href={`/templates/${template.slug}`} className="group flex min-h-64 flex-col rounded-[1.75rem] border bg-background/90 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
                <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">Version {template.versionNumber}</span><ClipboardList className="size-5 text-primary" aria-hidden="true" /></div>
                <h2 className="mt-6 text-2xl font-bold tracking-[-0.035em]">{template.name}</h2>
                <p className="mt-2 text-sm font-medium text-primary">{template.durationDays} days</p>
                <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{template.description ?? "No description provided."}</p>
                <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold">View schedule <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-[2rem] border border-dashed bg-background/80 p-8 text-center sm:p-12">
            <ClipboardList className="mx-auto size-8 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-bold">No published templates yet</h2>
            <p className="mx-auto mt-2 max-w-lg leading-7 text-muted-foreground">Administrators can prepare versioned templates without publishing unapproved schedules.</p>
            <Link className="mt-5 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline" href="/catalogue">Browse the peptide catalogue</Link>
          </div>
        )}
      </section>
    </main>
  );
}
