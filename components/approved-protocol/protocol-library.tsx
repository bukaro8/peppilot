"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, FlaskConical, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export type LibraryEntry = { catalogueEntryId: string; displayName: string; kind: string; slug: string };

export function filterProtocolLibrary(entries: LibraryEntry[], search: string) {
  const query = search.trim().toLowerCase();
  return entries.filter((entry) => (entry.displayName + " " + entry.kind).toLowerCase().includes(query));
}

export function ProtocolLibrary({ entries: allTemplates, initialSearch = "", onboarding = false }: { entries: LibraryEntry[]; initialSearch?: string; onboarding?: boolean }) {
  const [search, setSearch] = useState(initialSearch);
  const templates = filterProtocolLibrary(allTemplates, search);
  return <>
        <form className="mt-8 max-w-2xl" role="search" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="protocol-library-search" className="sr-only">Search protocol library</label>
          <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input id="protocol-library-search" name="q" type="search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={80} placeholder="Search all 28 compounds" className="h-12 w-full rounded-xl border bg-background pl-11 pr-4" /></div>
          <p className="mt-2 text-sm text-muted-foreground" role="status">{templates.length} {templates.length === 1 ? "compound" : "compounds"} found</p>
        </form>

        {templates.length > 0 ? (
          <div className="mt-7 grid gap-3 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Link key={template.catalogueEntryId} href={`/templates/${template.slug}${onboarding ? "?onboarding=1" : ""}`} className="group flex min-h-44 flex-col rounded-2xl border bg-background/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 sm:min-h-56 sm:rounded-[1.75rem] sm:p-6">
                <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">3 approved options</span><FlaskConical className="size-5 text-orange-500" aria-hidden="true" /></div>
                <h2 className="mt-4 text-xl font-bold tracking-[-0.035em] sm:mt-6 sm:text-2xl">{template.displayName}</h2>
                <p className="mt-2 text-sm capitalize text-muted-foreground">{template.kind.replaceAll("_", " ")}</p>
                <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold">Choose a protocol <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-[2rem] border border-dashed bg-background/80 p-8 text-center sm:p-12">
            <FlaskConical className="mx-auto size-8 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-bold">{allTemplates.length ? "No compounds match your search" : "Approved protocols are not loaded"}</h2>
            <p className="mx-auto mt-2 max-w-lg leading-7 text-muted-foreground">{allTemplates.length ? `Try a different name or clear “${search}” to browse all 28 compounds.` : "Run the reference-data seed to synchronise the approved catalogue."}</p>
            <div className="mt-5">{allTemplates.length ? <Button variant="outline" onClick={() => setSearch("")}>Clear search</Button> : <Link className="text-sm font-semibold text-primary hover:underline" href="/catalogue">Browse the peptide catalogue</Link>}</div>
          </div>
        )}
  </>;
}
