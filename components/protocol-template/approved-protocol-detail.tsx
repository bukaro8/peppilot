import Link from "next/link";
import { CalendarDays, ExternalLink, FlaskConical, PencilLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatApprovedDuration, formatApprovedFrequency, formatApprovedStageRange, formatCategory } from "@/lib/approved-protocol/presentation";
import type { ApprovedProtocolPreset } from "@/lib/approved-protocol/types";

export function ApprovedProtocolDetail({ onboarding = false, presets, requested }: { onboarding?: boolean; presets: ApprovedProtocolPreset[]; requested?: string }) {
  const selected = presets.find((preset) => preset.category === requested) ?? presets[0];
  const context = selected.compoundContext;
  const sources = context.sources.filter((source) => selected.definition.source_ids.includes(source.id));

  return <>
    <p className="mt-7 text-sm font-semibold uppercase tracking-wider text-primary">{context.kind}</p>
    <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] sm:text-6xl">{selected.displayName}</h1>
    <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">{context.category_explanation}</p>
    <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Protocol choices">
      {presets.map((preset) => <Link key={preset.id} href={`/templates/${preset.catalogueSlug}?preset=${preset.category}${onboarding ? "&onboarding=1" : ""}`} className={`rounded-2xl border p-5 transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 ${preset.id === selected.id ? "border-primary bg-primary text-primary-foreground shadow-lg" : "bg-card hover:border-primary/50"}`}><p className="font-bold">{formatCategory(preset.category)}</p><p className={`mt-2 text-sm ${preset.id === selected.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{formatApprovedDuration(preset.definition)}</p></Link>)}
      <Link href={`/protocols/new?catalogue=${selected.catalogueEntryId}${onboarding ? "&onboarding=1" : ""}`} className="rounded-2xl border bg-card p-5 transition hover:border-orange-400 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"><p className="font-bold">Custom</p><p className="mt-2 text-sm text-muted-foreground">Build your own schedule</p></Link>
    </div>
    <section className="mt-8 rounded-[2rem] border bg-card/90 p-6 shadow-sm sm:p-9">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">Approved source · v{selected.schemaVersion}</span><h2 className="mt-5 text-3xl font-bold">{selected.definition.label}</h2><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{selected.definition.category_reason}</p></div><div className="shrink-0 rounded-xl border bg-muted/30 px-4 py-3 font-semibold"><CalendarDays className="mr-2 inline size-5 text-primary" />{formatApprovedDuration(selected.definition)}</div></div>
      <div className="mt-8 space-y-4">{selected.definition.schedule.map((stage, index) => <div key={`${stage.start_week}-${index}`} className="rounded-2xl border bg-muted/25 p-5"><div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start"><div><p className="font-bold">{formatApprovedStageRange(stage)}</p><p className="mt-1 text-sm text-muted-foreground">{formatApprovedFrequency(stage.frequency)} · {stage.route.replaceAll("_", " ")}</p></div><p className="text-lg font-bold sm:text-right">{stage.dose_amount} {stage.dose_unit}{stage.dose_basis === "combined_daily_mass" ? " total daily" : ""}</p></div>{stage.ingredient_doses.length ? <div className="mt-4 flex flex-wrap gap-2">{stage.ingredient_doses.map((ingredient) => <span key={ingredient.name} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">{ingredient.name}: {ingredient.dose_amount} {ingredient.dose_unit}</span>)}</div> : null}</div>)}</div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button size="lg" asChild><Link href={`/protocols/new/approved?preset=${encodeURIComponent(selected.id)}${onboarding ? "&onboarding=1" : ""}`}><PencilLine className="size-4" />Copy and customise</Link></Button><Button variant="outline" size="lg" asChild><Link href={`/protocols/new?catalogue=${selected.catalogueEntryId}${onboarding ? "&onboarding=1" : ""}`}><FlaskConical className="size-4" />Start custom</Link></Button></div>
      <details className="mt-9 border-t pt-7"><summary className="cursor-pointer font-semibold text-primary">Where does this protocol come from?</summary><div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground"><p>{selected.definition.source_attribution_note}</p><p><strong className="text-foreground">Provenance:</strong> {selected.definition.provenance.replaceAll("_", " ")}</p>{sources.map((source) => <p key={source.id}><a className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline" href={source.url} rel="noreferrer" target="_blank">{source.title}<ExternalLink className="size-3.5" /></a><br />{source.relevant_findings}</p>)}</div></details>
      {context.preparation.length ? <details className="mt-5 border-t pt-5"><summary className="cursor-pointer font-semibold text-primary">Preparation examples</summary><div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">{context.preparation.filter((item) => selected.definition.preparation_ids.includes(item.id)).map((item) => <div key={item.id} className="rounded-xl border p-4"><p className="font-semibold text-foreground">Reported example</p><p>{item.vial_total_mass_mg ?? "Unspecified"} mg vial · {item.reported_diluent_volume_ml ?? "Unspecified"} mL {item.diluent ?? "diluent"}</p><p>{item.notes}</p></div>)}</div></details> : null}
    </section>
  </>;
}
