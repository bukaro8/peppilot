import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { ApprovedTitrationForm } from "@/components/approved-protocol/approved-titration-form";
import { ProtocolHeader } from "@/components/member-protocol/protocol-header";
import { Button } from "@/components/ui/button";
import { getApprovedProtocolPreset } from "@/lib/approved-protocol/service";
import { requireActor } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Customise approved protocol" };

export default async function ApprovedProtocolCopyPage({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: string;
    error?: string;
    onboarding?: string;
  }>;
}) {
  await requireActor();
  const query = await searchParams;
  const preset = query.preset
    ? await getApprovedProtocolPreset(query.preset)
    : null;
  const onboarding = query.onboarding === "1";
  if (!preset) notFound();
  return (
    <main className="min-h-screen bg-secondary/20">
      <ProtocolHeader />
      <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-5 sm:px-8 sm:pt-8 lg:px-10">
        <Button variant="ghost" size="sm" asChild>
          <Link
            href={`/templates/${preset.catalogueSlug}?preset=${preset.category}${onboarding ? "&onboarding=1" : ""}`}
          >
            <ArrowLeft className="size-4" />
            Back to preview
          </Link>
        </Button>
        <ApprovedTitrationForm
          preset={preset}
          onboarding={onboarding}
          error={query.error}
        />
      </section>
    </main>
  );
}
