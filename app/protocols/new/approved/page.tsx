import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Copy } from "lucide-react";
import { notFound } from "next/navigation";

import { createApprovedProtocolAction } from "./actions";
import { ProtocolHeader } from "@/components/member-protocol/protocol-header";
import { Button } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/session";
import { formatApprovedFrequency } from "@/lib/approved-protocol/presentation";
import { getApprovedProtocolPreset } from "@/lib/approved-protocol/service";

export const metadata: Metadata = { title: "Customise approved protocol" };
const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export default async function ApprovedProtocolCopyPage({ searchParams }: { searchParams: Promise<{ preset?: string; error?: string }> }) {
  await requireActor();
  const query = await searchParams;
  const preset = query.preset ? await getApprovedProtocolPreset(query.preset) : null;
  if (!preset) notFound();
  const durationDays = preset.definition.duration_days ?? (preset.definition.duration_weeks ? Math.round(preset.definition.duration_weeks * 7) : null);

  return <main className="min-h-screen bg-secondary/20"><ProtocolHeader /><section className="mx-auto w-full max-w-5xl px-5 pb-16 pt-8 sm:px-8 lg:px-10">
    <Button variant="ghost" size="sm" asChild><Link href={`/templates/${preset.catalogueSlug}?preset=${preset.category}`}><ArrowLeft className="size-4" />Back to preview</Link></Button>
    <form action={createApprovedProtocolAction} className="mt-6 space-y-7 rounded-[2rem] border bg-background p-6 shadow-sm sm:p-9">
      <input type="hidden" name="presetId" value={preset.id} />
      <div><p className="text-sm font-semibold uppercase tracking-wider text-primary">Private copy</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.04em]">Customise {preset.definition.label}</h1><p className="mt-3 max-w-3xl leading-7 text-muted-foreground">Changes are saved only to your account. The approved source remains unchanged.</p></div>
      {query.error ? <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{query.error}</p> : null}
      <div className="grid gap-5 sm:grid-cols-2"><label className="space-y-2 sm:col-span-2"><span className="text-sm font-semibold">Protocol name</span><input className="h-12 w-full rounded-xl border bg-background px-4" name="name" defaultValue={`${preset.displayName} — ${preset.definition.label}`} required minLength={3} maxLength={100} /></label>{preset.durationType === "fixed_cycle" ? <label className="space-y-2"><span className="text-sm font-semibold">Duration in days</span><input className="h-12 w-full rounded-xl border bg-background px-4" type="number" name="durationDays" defaultValue={durationDays ?? undefined} min={1} max={3650} required /></label> : <div className="rounded-xl border bg-muted/30 p-4 text-sm"><span className="font-semibold">Duration:</span> {preset.durationType === "open_ended" ? "Open-ended" : "As needed"}</div>}<label className="space-y-2 sm:col-span-2"><span className="text-sm font-semibold">Private notes</span><textarea className="w-full rounded-xl border bg-background px-4 py-3" rows={3} name="description" defaultValue={preset.definition.notes} /></label></div>
      <section><h2 className="text-xl font-bold">Schedule stages</h2><p className="mt-1 text-sm text-muted-foreground">Review every value. Fields marked by the source as unspecified must be chosen before saving.</p><div className="mt-5 space-y-5">{preset.definition.schedule.map((stage, index) => {
        const needsWeekdays = (stage.frequency.type === "days_per_week" || stage.frequency.type === "times_per_week") && !stage.frequency.weekdays.length;
        const needsAdministrations = stage.dose_basis === "combined_daily_mass" && !stage.frequency.administrations_per_day;
        const needsRoute = stage.route === "not_reported" || stage.route === "injection_unspecified";
        return <fieldset key={index} className="rounded-2xl border bg-muted/20 p-4 sm:p-5"><legend className="px-2 font-semibold">Stage {index + 1}</legend><label className="mb-4 flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" name={`stage.${index}.include`} value="1" defaultChecked /> Include this stage</label><p className="mb-4 text-sm text-muted-foreground">Source: {formatApprovedFrequency(stage.frequency)}</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-2"><span className="text-sm font-medium">Dose</span><input className="h-11 w-full rounded-xl border bg-background px-3" name={`stage.${index}.doseAmount`} defaultValue={stage.dose_amount} inputMode="decimal" required /></label><label className="space-y-2"><span className="text-sm font-medium">Unit</span><select className="h-11 w-full rounded-xl border bg-background px-3" name={`stage.${index}.doseUnit`} defaultValue={stage.dose_unit}><option value="mg">mg</option><option value="mcg">mcg</option></select></label><label className="space-y-2"><span className="text-sm font-medium">Start week</span><input className="h-11 w-full rounded-xl border bg-background px-3" type="number" min={1} name={`stage.${index}.startWeek`} defaultValue={stage.start_week} required /></label><label className="space-y-2"><span className="text-sm font-medium">End week</span><input className="h-11 w-full rounded-xl border bg-background px-3" type="number" step="any" min={1} name={`stage.${index}.endWeek`} defaultValue={stage.end_week ?? ""} placeholder="Ongoing" /></label>
          <label className="space-y-2"><span className="text-sm font-medium">Frequency</span><select className="h-11 w-full rounded-xl border bg-background px-3" name={`stage.${index}.frequencyType`} defaultValue={stage.frequency.type}><option value="daily">Daily</option><option value="days_per_week">Days per week</option><option value="times_per_week">Times per week</option><option value="interval">Every N days</option><option value="as_needed">As needed</option></select></label><label className="space-y-2"><span className="text-sm font-medium">Administrations per day{needsAdministrations ? " (required)" : ""}</span><input className="h-11 w-full rounded-xl border bg-background px-3" type="number" min={1} max={12} name={`stage.${index}.administrationsPerDay`} defaultValue={stage.frequency.administrations_per_day ?? ""} required={needsAdministrations || stage.frequency.type === "daily"} /></label><label className="space-y-2"><span className="text-sm font-medium">Interval days</span><input className="h-11 w-full rounded-xl border bg-background px-3" type="number" min={1} name={`stage.${index}.intervalDays`} defaultValue={stage.frequency.interval_days ?? ""} required={stage.frequency.type === "interval"} /></label><label className="space-y-2"><span className="text-sm font-medium">Route{needsRoute ? " (required)" : ""}</span><input className="h-11 w-full rounded-xl border bg-background px-3" name={`stage.${index}.route`} defaultValue={needsRoute ? "" : stage.route} placeholder="Choose or enter route" required /></label>
          <div className="space-y-2 sm:col-span-2 lg:col-span-4"><span className="text-sm font-medium">Administration weekdays{needsWeekdays ? " (choose; no source days were specified)" : " (used for weekly patterns)"}</span><div className="grid grid-cols-4 gap-2 sm:grid-cols-7">{weekdays.map((day) => <label key={day} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border bg-background px-2 text-xs font-semibold capitalize"><input type="checkbox" name={`stage.${index}.weekday.${day}`} value="1" defaultChecked={stage.frequency.weekdays.includes(day)} />{day.slice(0, 3)}</label>)}</div></div>
          {stage.ingredient_doses.map((ingredient, ingredientIndex) => <label key={ingredient.name} className="space-y-2"><span className="text-sm font-medium">{ingredient.name} ({ingredient.dose_unit})</span><input className="h-11 w-full rounded-xl border bg-background px-3" name={`stage.${index}.ingredient.${ingredientIndex}`} defaultValue={ingredient.dose_amount} inputMode="decimal" required /></label>)}
        </div></fieldset>;
      })}</div></section>
      <div className="border-t pt-6"><Button size="lg" type="submit"><Copy className="size-4" />Create private draft</Button><p className="mt-3 text-sm text-muted-foreground">You can review the saved draft before starting a cycle.</p></div>
    </form>
  </section></main>;
}
