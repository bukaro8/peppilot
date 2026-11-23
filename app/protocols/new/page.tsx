import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { ProtocolForm } from "@/components/member-protocol/protocol-form";
import { ProtocolHeader } from "@/components/member-protocol/protocol-header";
import { Button } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/session";
import { getCatalogueEntries } from "@/lib/catalogue/service";
import { getPublishedProtocolTemplateVersionById } from "@/lib/protocol-template/service";

export const metadata: Metadata = { title: "New private protocol" };

type NewProtocolPageProps = { searchParams: Promise<{ catalogue?: string; onboarding?: string; templateVersion?: string }> };

export default async function NewProtocolPage({ searchParams }: NewProtocolPageProps) {
  await requireActor();
  const { catalogue: preferredCatalogueId, onboarding, templateVersion } = await searchParams;
  const inOnboarding = onboarding === "1";
  const [catalogue, source] = await Promise.all([
    getCatalogueEntries(),
    templateVersion ? getPublishedProtocolTemplateVersionById(templateVersion) : null,
  ]);
  if (templateVersion && !source) notFound();

  const initial = source
    ? {
        description: source.description,
        durationDays: source.durationDays,
        name: source.name,
        schedules: source.steps.map((step) => ({
          catalogueEntryId: step.catalogueEntryId,
          daysOfWeek: step.daysOfWeek,
          doseAmount: step.doseAmount,
          doseUnit: step.doseUnit,
          endDay: step.endDay,
          frequency: step.frequency,
          intervalDays: step.intervalDays,
          startDay: step.startDay,
          timeOfDay: step.timeOfDay,
        })),
      }
    : undefined;

  return (
    <main className="min-h-screen bg-secondary/20">
      <ProtocolHeader />
      <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-5 sm:px-8 sm:pt-8 lg:px-10">
        <Button variant="ghost" size="sm" asChild><Link href={inOnboarding ? "/onboarding/protocols" : source ? `/templates/${source.slug}` : "/protocols"}><ArrowLeft className="size-4" aria-hidden="true" />Back</Link></Button>
        <div className="mt-4 rounded-2xl border bg-background p-5 shadow-sm sm:mt-6 sm:rounded-[2rem] sm:p-9">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Private draft</p>
          <h1 className="mt-2 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">{source ? "Copy and customise template" : "Create custom protocol"}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:mt-3 sm:text-base sm:leading-7">{source ? "Review the published schedule, make any private changes, and preview it before saving." : "Build a schedule from scratch without supplied dose or timing defaults."}</p>
          <div className="mt-6 sm:mt-9">
            <ProtocolForm
              catalogue={catalogue.map(({ id, displayName }) => ({ id, displayName }))}
              initial={initial}
              onboarding={inOnboarding}
              preferredCatalogueId={preferredCatalogueId}
              source={source ? { name: source.name, versionId: source.id, versionNumber: source.versionNumber } : undefined}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
