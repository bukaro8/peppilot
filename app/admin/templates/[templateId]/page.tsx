import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, History, StopCircle } from "lucide-react";
import { notFound } from "next/navigation";

import { publishProtocolTemplateAction, retireProtocolTemplateAction } from "@/app/admin/templates/actions";
import { TemplateHeader } from "@/components/protocol-template/template-header";
import { TemplateForm } from "@/components/protocol-template/template-form";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { requireActor } from "@/lib/auth/session";
import { getCatalogueEntries } from "@/lib/catalogue/service";
import {
  getProtocolTemplateForAdmin,
  getProtocolTemplateVersionsForAdmin,
} from "@/lib/protocol-template/service";

export const metadata: Metadata = { title: "Edit protocol template" };

type AdminTemplatePageProps = {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{ published?: string; retired?: string; saved?: string; version?: string }>;
};

export default async function AdminTemplatePage({ params, searchParams }: AdminTemplatePageProps) {
  const actor = await requireActor();
  if (actor.role !== "admin") notFound();
  const { templateId } = await params;
  const query = await searchParams;
  const [template, versions, catalogue] = await Promise.all([
    getProtocolTemplateForAdmin(actor, templateId, query.version),
    getProtocolTemplateVersionsForAdmin(actor, templateId),
    getCatalogueEntries(),
  ]);
  if (!template) notFound();

  return (
    <main className="min-h-screen bg-secondary/25">
      <TemplateHeader admin />
      <section className="mx-auto w-full max-w-5xl px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild><Link href="/admin/templates"><ArrowLeft className="size-4" aria-hidden="true" />Back to templates</Link></Button>
          {template.status === "published" ? <Button variant="outline" size="sm" asChild><Link href={`/templates/${template.slug}`}><Eye className="size-4" aria-hidden="true" />Public view</Link></Button> : null}
        </div>

        <div className="mt-6 rounded-[2rem] border bg-background p-6 shadow-sm sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="text-sm font-semibold uppercase tracking-wider text-primary">Version {template.versionNumber}</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.04em]">{template.name}</h1><p className="mt-2 text-sm capitalize text-muted-foreground">{template.status}</p></div>
            <div className="flex flex-wrap gap-2">
              {template.status === "draft" ? (
                <form action={publishProtocolTemplateAction}><input type="hidden" name="templateId" value={templateId} /><input type="hidden" name="versionId" value={template.id} /><Button type="submit"><CheckCircle2 className="size-4" aria-hidden="true" />Publish version</Button></form>
              ) : null}
              {template.status === "published" ? (
                <form action={retireProtocolTemplateAction}><input type="hidden" name="templateId" value={templateId} /><input type="hidden" name="versionId" value={template.id} /><Button type="submit" variant="outline"><StopCircle className="size-4" aria-hidden="true" />Retire version</Button></form>
              ) : null}
            </div>
          </div>

          {query.saved ? <div className="mt-6"><FormMessage tone="success">Template draft saved.</FormMessage></div> : null}
          {query.published ? <div className="mt-6"><FormMessage tone="success">Template version published.</FormMessage></div> : null}
          {query.retired ? <div className="mt-6"><FormMessage tone="success">Template version retired.</FormMessage></div> : null}

          <div className="mt-8 rounded-2xl border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><History className="size-4 text-primary" aria-hidden="true" />Version history</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {versions.map((version) => (
                <Link key={version.id} href={`/admin/templates/${templateId}?version=${version.id}`} className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${version.id === template.id ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>v{version.versionNumber} · {version.status}</Link>
              ))}
            </div>
          </div>

          <div className="mt-9">
            <TemplateForm
              catalogue={catalogue.map(({ id, displayName }) => ({ id, displayName }))}
              initial={{
                description: template.description,
                durationDays: template.durationDays,
                name: template.name,
                schedules: template.steps.map((step) => ({
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
                slug: template.slug,
                status: template.status,
                templateId,
                versionId: template.id,
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
