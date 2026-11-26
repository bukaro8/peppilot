import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ProtocolLibrary } from "@/components/approved-protocol/protocol-library";
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
        <ProtocolLibrary entries={allTemplates} initialSearch={search} onboarding={onboarding} />
      </section>
    </main>
  );
}
