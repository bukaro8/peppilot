import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, Copy } from "lucide-react";
import { notFound } from "next/navigation";

import { TemplateHeader } from "@/components/protocol-template/template-header";
import { ApprovedProtocolDetail } from "@/components/protocol-template/approved-protocol-detail";
import { Button } from "@/components/ui/button";
import { formatDoseAmount, formatTemplateFrequency } from "@/lib/protocol-template/presentation";
import { getPublishedProtocolTemplateBySlug } from "@/lib/protocol-template/service";
import { getApprovedProtocolsBySlug } from "@/lib/approved-protocol/service";

type TemplateDetailPageProps = { params: Promise<{ slug: string }>; searchParams: Promise<{ onboarding?: string; preset?: string }> };

export async function generateMetadata({ params }: TemplateDetailPageProps): Promise<Metadata> {
  const slug = (await params).slug;
  const approved = await getApprovedProtocolsBySlug(slug);
  if (approved[0]) return { title: `${approved[0].displayName} protocols` };
  const template = await getPublishedProtocolTemplateBySlug(slug);
  return template ? { title: template.name, description: template.description ?? `View ${template.name}.` } : { title: "Template not found" };
}

export default async function TemplateDetailPage({ params, searchParams }: TemplateDetailPageProps) {
  const slug = (await params).slug;
  const query = await searchParams;
  const onboarding = query.onboarding === "1";
  const approved = await getApprovedProtocolsBySlug(slug);
  if (approved.length === 3) {
    return <main className="relative min-h-screen overflow-hidden"><TemplateHeader onboarding={onboarding} /><article className="mx-auto w-full max-w-5xl px-4 pb-20 pt-5 sm:px-8 sm:pt-10 lg:px-10"><Button variant="ghost" size="sm" asChild><Link href={`/templates${onboarding ? "?onboarding=1" : ""}`}><ArrowLeft className="size-4" aria-hidden="true" />All compounds</Link></Button><ApprovedProtocolDetail presets={approved} requested={query.preset} onboarding={onboarding} /></article></main>;
  }
  const template = await getPublishedProtocolTemplateBySlug(slug);
  if (!template) notFound();

  const entryNames = new Map(template.entries.map((entry) => [entry.catalogueEntryId, entry.displayName]));

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_78%_4%,oklch(0.91_0.07_83/.65),transparent_34%),radial-gradient(circle_at_3%_35%,oklch(0.86_0.08_292/.72),transparent_38%)]" />
      <TemplateHeader />
      <article className="mx-auto w-full max-w-4xl px-5 pb-16 pt-8 sm:px-8 sm:pt-16 lg:px-10">
        <Button variant="ghost" size="sm" asChild><Link href="/templates"><ArrowLeft className="size-4" aria-hidden="true" />Back to templates</Link></Button>
        <div className="mt-6 rounded-[2rem] border bg-card/90 p-6 shadow-[0_24px_70px_-32px_oklch(0.35_0.08_275/.4)] backdrop-blur sm:p-10">
          <div className="flex flex-wrap gap-2"><span className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Published</span><span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">Version {template.versionNumber}</span></div>
          <h1 className="mt-7 text-balance text-4xl font-bold tracking-[-0.05em] sm:text-6xl">{template.name}</h1>
          {template.description ? <p className="mt-5 text-lg leading-8 text-muted-foreground">{template.description}</p> : null}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3 font-semibold"><CalendarDays className="size-5 text-primary" aria-hidden="true" />{template.durationDays} days</div>
            <Button asChild><Link href={`/protocols/new?templateVersion=${template.id}`}><Copy className="size-4" aria-hidden="true" />Create private copy</Link></Button>
          </div>

          <section className="mt-10 border-t pt-8" aria-labelledby="template-schedule-heading">
            <h2 id="template-schedule-heading" className="text-2xl font-bold">Schedule</h2>
            <div className="mt-5 space-y-4">
              {template.steps.map((step) => (
                <div key={step.id} className="grid gap-4 rounded-2xl border bg-muted/30 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="text-lg font-bold">{entryNames.get(step.catalogueEntryId)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatTemplateFrequency(step.frequency, step.daysOfWeek, step.intervalDays)} · Days {step.startDay}–{step.endDay}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-semibold">{formatDoseAmount(step.doseAmount)} {step.doseUnit}</p>
                    {step.timeOfDay ? <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Clock3 className="size-3.5" aria-hidden="true" />{step.timeOfDay}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <p className="mt-8 border-t pt-6 text-sm leading-6 text-muted-foreground">This administrator-authored template is shown as structured reference data. PepPilot does not provide treatment recommendations.</p>
        </div>
      </article>
    </main>
  );
}
