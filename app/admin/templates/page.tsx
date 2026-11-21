import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2, Settings2 } from "lucide-react";
import { notFound } from "next/navigation";

import { TemplateHeader } from "@/components/protocol-template/template-header";
import { Button } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/session";
import { getProtocolTemplatesForAdmin } from "@/lib/protocol-template/service";

export const metadata: Metadata = { title: "Manage protocol templates" };

export default async function AdminTemplatesPage() {
  const actor = await requireActor();
  if (actor.role !== "admin") notFound();
  const templates = await getProtocolTemplatesForAdmin(actor);

  return (
    <main className="min-h-screen bg-secondary/25">
      <TemplateHeader admin />
      <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-wider text-primary">Administrator</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.045em]">Protocol templates</h1><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Create drafts, publish approved schedules, and preserve every published version.</p></div>
          <Button size="lg" asChild><Link href="/admin/templates/new"><FilePlus2 className="size-4" aria-hidden="true" />New template</Link></Button>
        </div>

        {templates.length > 0 ? (
          <div className="mt-10 overflow-hidden rounded-2xl border bg-background shadow-sm">
            <ul className="divide-y">
              {templates.map((template) => (
                <li key={template.templateId}>
                  <Link href={`/admin/templates/${template.templateId}`} className="flex flex-col gap-3 p-5 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="text-lg font-bold">{template.name}</p><p className="mt-1 text-sm text-muted-foreground">/{template.slug} · Version {template.versionNumber} · {template.durationDays} days</p></div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold capitalize"><Settings2 className="size-3.5" aria-hidden="true" />{template.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed bg-background p-10 text-center"><h2 className="text-xl font-bold">No templates yet</h2><p className="mt-2 text-muted-foreground">Create a draft when an approved schedule is ready to author.</p></div>
        )}
      </section>
    </main>
  );
}
