import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CircleDot, Layers3, Target } from "lucide-react";
import { notFound } from "next/navigation";

import { CatalogueHeader } from "@/components/catalogue/catalogue-header";
import { Button } from "@/components/ui/button";
import { catalogueCategoryLabels, catalogueKindLabels, isCatalogueCategory } from "@/lib/catalogue/constants";
import { getCatalogueEntryBySlug } from "@/lib/catalogue/service";

type CatalogueDetailPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: CatalogueDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getCatalogueEntryBySlug(slug);
  return entry
    ? { title: entry.displayName, description: entry.description ?? `View ${entry.displayName} in the PepPilot catalogue.` }
    : { title: "Catalogue entry not found" };
}

export default async function CatalogueDetailPage({ params }: CatalogueDetailPageProps) {
  const { slug } = await params;
  const entry = await getCatalogueEntryBySlug(slug);
  if (!entry) notFound();

  const category = isCatalogueCategory(entry.category) ? entry.category : "cognitive";
  const kind = entry.kind as keyof typeof catalogueKindLabels;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_78%_4%,oklch(0.91_0.07_83/.65),transparent_34%),radial-gradient(circle_at_3%_35%,oklch(0.9_0.06_155/.75),transparent_38%)]" />
      <CatalogueHeader />
      <article className="mx-auto w-full max-w-4xl px-5 pb-16 pt-8 sm:px-8 sm:pt-16 lg:px-10">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/catalogue"><ArrowLeft className="size-4" aria-hidden="true" />Back to catalogue</Link>
        </Button>

        <div className="mt-6 rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_24px_70px_-32px_oklch(0.35_0.08_165/.4)] backdrop-blur sm:p-10">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">{catalogueKindLabels[kind]}</span>
            <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">{catalogueCategoryLabels[category]}</span>
          </div>
          <h1 className="mt-7 text-balance text-4xl font-bold tracking-[-0.05em] sm:text-6xl">{entry.displayName}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{entry.description}</p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <section className="rounded-2xl border bg-muted/40 p-5">
              <Target className="size-5 text-primary" aria-hidden="true" />
              <h2 className="mt-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tracking focus</h2>
              <p className="mt-2 text-lg font-semibold">{entry.trackingFocus ?? "General protocol tracking"}</p>
            </section>
            <section className="rounded-2xl border bg-muted/40 p-5">
              <CircleDot className="size-5 text-primary" aria-hidden="true" />
              <h2 className="mt-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Catalogue status</h2>
              <p className="mt-2 text-lg font-semibold">Active</p>
            </section>
          </div>

          {entry.kind === "blend" ? (
            <section className="mt-8 border-t pt-8">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><Layers3 className="size-5" aria-hidden="true" /></span>
                <div>
                  <h2 className="text-xl font-bold">Blend ingredients</h2>
                  <p className="text-sm text-muted-foreground">Ingredient names only—no dosing guidance.</p>
                </div>
              </div>
              {entry.ingredients.length > 0 ? (
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {entry.ingredients.map((ingredient) => (
                    <li key={ingredient.slug} className="rounded-2xl border bg-background p-4 font-semibold">
                      {ingredient.linkedCatalogueEntryId ? (
                        <Link className="text-primary underline-offset-4 hover:underline" href={`/catalogue/${ingredient.slug}`}>{ingredient.displayName}</Link>
                      ) : ingredient.displayName}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 rounded-2xl border border-dashed bg-muted/30 p-5 text-sm leading-6 text-muted-foreground">
                  This blend’s ingredient list has not yet been approved for the PepPilot catalogue.
                </p>
              )}
            </section>
          ) : null}

          <p className="mt-8 border-t pt-6 text-sm leading-6 text-muted-foreground">
            PepPilot catalogue pages organise tracking information and do not provide medical advice, treatment recommendations, or dosing schedules.
          </p>
        </div>
      </article>
    </main>
  );
}
