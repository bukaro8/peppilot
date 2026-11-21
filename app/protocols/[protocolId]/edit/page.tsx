import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { ProtocolForm } from "@/components/member-protocol/protocol-form";
import { ProtocolHeader } from "@/components/member-protocol/protocol-header";
import { Button } from "@/components/ui/button";
import { AuthorizationError } from "@/lib/auth/policy";
import { requireActor } from "@/lib/auth/session";
import { getCatalogueEntries } from "@/lib/catalogue/service";
import { getMemberProtocol, MemberProtocolError } from "@/lib/member-protocol/service";

export const metadata: Metadata = { title: "Edit private protocol" };

type EditProtocolPageProps = { params: Promise<{ protocolId: string }> };

export default async function EditProtocolPage({ params }: EditProtocolPageProps) {
  const actor = await requireActor();
  const { protocolId } = await params;
  let protocol;
  try {
    protocol = await getMemberProtocol(actor, protocolId);
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof MemberProtocolError) notFound();
    throw error;
  }
  if (!protocol) notFound();
  const catalogue = await getCatalogueEntries();

  return (
    <main className="min-h-screen bg-secondary/20">
      <ProtocolHeader />
      <section className="mx-auto w-full max-w-5xl px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <Button variant="ghost" size="sm" asChild><Link href={`/protocols/${protocol.id}`}><ArrowLeft className="size-4" aria-hidden="true" />Back to draft</Link></Button>
        <div className="mt-6 rounded-[2rem] border bg-background p-6 shadow-sm sm:p-9">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Private draft</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em]">Edit protocol</h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Changes remain private and never modify a published template.</p>
          <div className="mt-9">
            <ProtocolForm
              catalogue={catalogue.map(({ id, displayName }) => ({ id, displayName }))}
              initial={{
                description: protocol.description,
                durationDays: protocol.durationDays,
                name: protocol.name,
                protocolId: protocol.id,
                schedules: protocol.steps.map((step) => ({
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
              }}
              source={protocol.origin === "template" && protocol.sourceTemplateVersionId ? {
                name: protocol.sourceTemplateName ?? "Published template",
                versionId: protocol.sourceTemplateVersionId,
                versionNumber: protocol.sourceTemplateVersionNumber ?? 1,
              } : undefined}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
