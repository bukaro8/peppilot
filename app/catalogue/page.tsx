import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Layers3, Search, Sparkles } from "lucide-react";

import { CatalogueHeader } from "@/components/catalogue/catalogue-header";
import { Button } from "@/components/ui/button";
import {
  catalogueCategories,
  catalogueCategoryLabels,
  catalogueKindLabels,
  isCatalogueCategory,
} from "@/lib/catalogue/constants";
import { getCatalogueEntries } from "@/lib/catalogue/service";

export const metadata: Metadata = {
  title: "Peptide catalogue",
  description: "Browse PepPilot’s peptide and tracked-compound catalogue.",
};

type CataloguePageProps = {
  searchParams: Promise<{ category?: string; q?: string }>;
};

function catalogueHref(query: string, category?: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  const search = params.toString();
  return search ? `/catalogue?${search}` : "/catalogue";
}

export default async function CataloguePage({ searchParams }: CataloguePageProps) {
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 80) ?? "";
  const category = isCatalogueCategory(params.category) ? params.category : undefined;
  const entries = await getCatalogueEntries({ category, query });

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_78%_4%,oklch(0.91_0.07_83/.65),transparent_34%),radial-gradient(circle_at_3%_35%,oklch(0.86_0.08_292/.72),transparent_38%)]" />
      <CatalogueHeader />

      <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-12 sm:px-8 sm:pt-20 lg:px-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/65 px-3.5 py-2 text-sm font-semibold text-primary shadow-sm backdrop-blur">
            <Sparkles className="size-4" aria-hidden="true" />
            Peptide library
          </div>
          <h1 className="mt-6 text-balance text-4xl font-bold tracking-[-0.05em] sm:text-6xl">
            Explore the PepPilot catalogue.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Browse the approved compounds and blends available for future protocol tracking. This
            library does not provide dosing instructions or treatment recommendations.
          </p>
        </div>

        <form action="/catalogue" className="mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row" role="search">
          <label className="sr-only" htmlFor="catalogue-search">Search the catalogue</label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="catalogue-search"
              name="q"
              type="search"
              defaultValue={query}
              maxLength={80}
              placeholder="Search names, categories or tracking focus"
              className="h-12 w-full rounded-full border bg-background/90 pl-11 pr-4 text-base outline-none shadow-sm transition-shadow placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
            />
          </div>
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <Button size="lg" type="submit">Search</Button>
        </form>

        <nav className="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="Catalogue categories">
          <Link
            href={catalogueHref(query)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              !category ? "border-primary bg-primary text-primary-foreground" : "bg-background/80 hover:bg-muted"
            }`}
          >
            All
          </Link>
          {catalogueCategories.map((item) => (
            <Link
              key={item}
              href={catalogueHref(query, item)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                category === item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background/80 hover:bg-muted"
              }`}
            >
              {catalogueCategoryLabels[item]}
            </Link>
          ))}
        </nav>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-[-0.035em]">
              {category ? catalogueCategoryLabels[category] : query ? `Results for “${query}”` : "All catalogue entries"}
            </h2>
          </div>
          {query || category ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/catalogue">Clear filters</Link>
            </Button>
          ) : null}
        </div>

        {entries.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => {
              const entryCategory = isCatalogueCategory(entry.category) ? entry.category : "cognitive";
              const kind = entry.kind as keyof typeof catalogueKindLabels;
              return (
                <Link
                  key={entry.id}
                  href={`/catalogue/${entry.slug}`}
                  className="group flex min-h-64 flex-col rounded-[1.75rem] border bg-background/90 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">
                      {catalogueKindLabels[kind] ?? "Catalogue entry"}
                    </span>
                    {entry.kind === "blend" || entry.kind === "combination" ? <Layers3 className="size-5 text-primary" aria-hidden="true" /> : null}
                  </div>
                  <h3 className="mt-6 text-2xl font-bold tracking-[-0.035em]">{entry.displayName}</h3>
                  <p className="mt-2 text-sm font-medium text-primary">{catalogueCategoryLabels[entryCategory]}</p>
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{entry.description}</p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold">
                    View details
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-[1.75rem] border border-dashed bg-background/75 p-8 text-center sm:p-12">
            <h3 className="text-xl font-bold">No catalogue entries found</h3>
            <p className="mt-2 text-muted-foreground">Try a different search or clear the category filter.</p>
            <Button className="mt-6" variant="outline" asChild><Link href="/catalogue">View all entries</Link></Button>
          </div>
        )}
      </section>
    </main>
  );
}
