import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { TemplateHeader } from "@/components/protocol-template/template-header";
import { TemplateForm } from "@/components/protocol-template/template-form";
import { Button } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/session";
import { getCatalogueEntries } from "@/lib/catalogue/service";

export const metadata: Metadata = { title: "New protocol template" };

export default async function NewProtocolTemplatePage() {
  const actor = await requireActor();
  if (actor.role !== "admin") notFound();
  const catalogue = await getCatalogueEntries();

  return (
    <main className="min-h-screen bg-secondary/25">
      <TemplateHeader admin />
      <section className="mx-auto w-full max-w-5xl px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <Button variant="ghost" size="sm" asChild><Link href="/admin/templates"><ArrowLeft className="size-4" aria-hidden="true" />Back to templates</Link></Button>
        <div className="mt-6 rounded-[2rem] border bg-background p-6 shadow-sm sm:p-9">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">New draft</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em]">Create protocol template</h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Author structured schedule data without adding recommendations or default doses.</p>
          <div className="mt-9"><TemplateForm catalogue={catalogue.map(({ id, displayName }) => ({ id, displayName }))} /></div>
        </div>
      </section>
    </main>
  );
}
