"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { reviseProtocolCycleScheduleAction } from "@/app/cycles/actions";
import { Button } from "@/components/ui/button";
import type { ProtocolTemplateFrequency } from "@/lib/protocol-template/validation";

const weekdays = [
  { value: 1, name: "Monday" }, { value: 2, name: "Tuesday" },
  { value: 3, name: "Wednesday" }, { value: 4, name: "Thursday" },
  { value: 5, name: "Friday" }, { value: 6, name: "Saturday" },
  { value: 0, name: "Sunday" },
];

type CatalogueOption = { displayName: string; id: string };
type InitialSchedule = {
  catalogueEntryId: string;
  daysOfWeek: number[];
  doseAmount: string;
  doseUnit: string;
  endDay: number | null;
  frequency: ProtocolTemplateFrequency;
  intervalDays: number | null;
  startDay: number;
  timeOfDay: string | null;
  administrationsPerDay?: number;
  doseBasis?: string;
  ingredientDoses?: unknown[];
  route?: string | null;
  timesOfDay?: string[];
};
type Row = {
  catalogueEntryId: string;
  daysOfWeek: string;
  doseAmount: string;
  doseUnit: string;
  endDay: string;
  frequency: ProtocolTemplateFrequency | "";
  intervalDays: string;
  key: string;
  startDay: string;
  timeOfDay: string;
  administrationsPerDay: string;
  doseBasis: string;
  ingredientDoses: string;
  route: string;
  timesOfDay: string;
};

const blankRow: Omit<Row, "key"> = { administrationsPerDay: "1", catalogueEntryId: "", daysOfWeek: "", doseAmount: "", doseBasis: "single_compound_mass", doseUnit: "", endDay: "", frequency: "", ingredientDoses: "[]", intervalDays: "", route: "", startDay: "", timeOfDay: "", timesOfDay: "[]" };

export function CycleScheduleForm({ catalogue, cycleId, initial, minimumDate, plannedEndDate }: { catalogue: CatalogueOption[]; cycleId: string; initial: InitialSchedule[]; minimumDate: string; plannedEndDate: string | null }) {
  const [rows, setRows] = useState<Row[]>(initial.map((schedule, index) => ({ administrationsPerDay: String(schedule.administrationsPerDay ?? 1), catalogueEntryId: schedule.catalogueEntryId, daysOfWeek: schedule.daysOfWeek.join(","), doseAmount: schedule.doseAmount, doseBasis: schedule.doseBasis ?? "single_compound_mass", doseUnit: schedule.doseUnit, endDay: schedule.endDay === null ? "" : String(schedule.endDay), frequency: schedule.frequency, ingredientDoses: JSON.stringify(schedule.ingredientDoses ?? []), intervalDays: schedule.intervalDays === null ? "" : String(schedule.intervalDays), key: `initial-${index}`, route: schedule.route ?? "", startDay: String(schedule.startDay), timeOfDay: schedule.timeOfDay ?? "", timesOfDay: JSON.stringify(schedule.timesOfDay ?? []) })));
  const action = reviseProtocolCycleScheduleAction.bind(null, cycleId);

  function updateRow(key: string, field: keyof Omit<Row, "key">, value: string) { setRows((current) => current.map((row) => row.key === key ? { ...row, [field]: value } : row)); }
  function toggleWeekday(key: string, day: number) {
    setRows((current) => current.map((row) => {
      if (row.key !== key) return row;
      const selected = row.daysOfWeek.split(",").filter(Boolean).map(Number);
      const next = selected.includes(day) ? selected.filter((value) => value !== day) : [...selected, day];
      return { ...row, daysOfWeek: next.sort((a, b) => a - b).join(",") };
    }));
  }

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="scheduleCount" value={rows.length} />
      <div className="space-y-2"><label className="text-sm font-semibold" htmlFor="revision-effective-date">Effective date</label><input id="revision-effective-date" name="effectiveFrom" type="date" min={minimumDate} max={plannedEndDate ?? undefined} required className="h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><p className="text-xs leading-5 text-muted-foreground">The earlier schedule remains unchanged before this date.</p></div>
      <section aria-labelledby="revision-schedule-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="revision-schedule-heading" className="text-xl font-bold">Revised schedule</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Edit the complete schedule that applies from the effective date.</p></div><Button type="button" variant="outline" onClick={() => setRows((current) => [...current, { ...blankRow, key: crypto.randomUUID() }])} disabled={rows.length >= 100}><Plus className="size-4" aria-hidden="true" />Add schedule</Button></div>
        <div className="mt-5 space-y-4">{rows.map((row, index) => { const prefix = `schedule.${index}`; return <fieldset key={row.key} className="rounded-2xl border bg-muted/25 p-4 sm:p-5"><legend className="px-2 text-sm font-semibold">Schedule {index + 1}</legend><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name={`${prefix}.administrationsPerDay`} value={row.administrationsPerDay} /><input type="hidden" name={`${prefix}.doseBasis`} value={row.doseBasis} /><input type="hidden" name={`${prefix}.ingredientDoses`} value={row.ingredientDoses} /><input type="hidden" name={`${prefix}.route`} value={row.route} /><input type="hidden" name={`${prefix}.timesOfDay`} value={row.timesOfDay} />
          <div className="space-y-2 sm:col-span-2"><label className="text-sm font-medium" htmlFor={`${prefix}.catalogueEntryId`}>Catalogue entry</label><select id={`${prefix}.catalogueEntryId`} name={`${prefix}.catalogueEntryId`} required value={row.catalogueEntryId} onChange={(event) => updateRow(row.key, "catalogueEntryId", event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm"><option value="">Select an entry</option>{catalogue.map((entry) => <option key={entry.id} value={entry.id}>{entry.displayName}</option>)}</select></div>
          <div className="space-y-2"><label className="text-sm font-medium" htmlFor={`${prefix}.doseAmount`}>Dose amount</label><input id={`${prefix}.doseAmount`} name={`${prefix}.doseAmount`} required inputMode="decimal" value={row.doseAmount} onChange={(event) => updateRow(row.key, "doseAmount", event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm" /></div>
          <div className="space-y-2"><label className="text-sm font-medium" htmlFor={`${prefix}.doseUnit`}>Unit</label><input id={`${prefix}.doseUnit`} name={`${prefix}.doseUnit`} required maxLength={20} value={row.doseUnit} onChange={(event) => updateRow(row.key, "doseUnit", event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm" /></div>
          <div className="space-y-2"><label className="text-sm font-medium" htmlFor={`${prefix}.frequency`}>Frequency</label><select id={`${prefix}.frequency`} name={`${prefix}.frequency`} required value={row.frequency} onChange={(event) => updateRow(row.key, "frequency", event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm"><option value="">Select frequency</option><option value="daily">Daily</option><option value="weekly">Selected weekdays</option><option value="interval_days">Every N days</option><option value="as_needed">As needed</option></select></div>
          <input type="hidden" name={`${prefix}.daysOfWeek`} value={row.frequency === "weekly" ? row.daysOfWeek : ""} />
          {row.frequency === "weekly" ? <fieldset className="space-y-2 sm:col-span-2 lg:col-span-4" aria-describedby={`${prefix}-weekday-summary`}><legend className="text-sm font-medium">Choose injection days</legend><div className="grid grid-cols-4 gap-2 sm:grid-cols-7">{weekdays.map((day) => {
            const selected = row.daysOfWeek.split(",").filter(Boolean).map(Number).includes(day.value);
            return <label key={day.value} className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-1 text-sm font-semibold focus-within:ring-3 focus-within:ring-ring/45 ${selected ? "border-primary bg-primary text-primary-foreground" : "bg-background text-foreground"}`}><input type="checkbox" aria-label={day.name} checked={selected} onChange={() => toggleWeekday(row.key, day.value)} className="size-4 shrink-0" /><span aria-hidden="true">{day.name.slice(0, 3)}</span></label>;
          })}</div><p id={`${prefix}-weekday-summary`} className="text-sm text-muted-foreground" aria-live="polite">{row.daysOfWeek ? `Selected: ${weekdays.filter((day) => row.daysOfWeek.split(",").includes(String(day.value))).map((day) => day.name).join(", ")}` : "Choose at least one day."}</p></fieldset> : null}
          {row.frequency === "interval_days" ? <div className="space-y-2"><label className="text-sm font-medium" htmlFor={`${prefix}.intervalDays`}>Interval days</label><input id={`${prefix}.intervalDays`} name={`${prefix}.intervalDays`} type="number" min={1} max={3650} required value={row.intervalDays} onChange={(event) => updateRow(row.key, "intervalDays", event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm" /></div> : null}
          <div className="space-y-2"><label className="text-sm font-medium" htmlFor={`${prefix}.timeOfDay`}>Time <span className="font-normal text-muted-foreground">(optional)</span></label><input id={`${prefix}.timeOfDay`} name={`${prefix}.timeOfDay`} type="time" value={row.timeOfDay} onChange={(event) => updateRow(row.key, "timeOfDay", event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm" /></div>
          <div className="space-y-2"><label className="text-sm font-medium" htmlFor={`${prefix}.startDay`}>Start day</label><input id={`${prefix}.startDay`} name={`${prefix}.startDay`} type="number" min={1} required value={row.startDay} onChange={(event) => updateRow(row.key, "startDay", event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm" /></div>
          <div className="space-y-2"><label className="text-sm font-medium" htmlFor={`${prefix}.endDay`}>End day <span className="font-normal text-muted-foreground">(blank = ongoing)</span></label><input id={`${prefix}.endDay`} name={`${prefix}.endDay`} type="number" min={1} value={row.endDay} onChange={(event) => updateRow(row.key, "endDay", event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm" /></div>
          <div className="flex items-end"><Button className="w-full" type="button" variant="ghost" onClick={() => setRows((current) => current.filter((candidate) => candidate.key !== row.key))} disabled={rows.length === 1}><Trash2 className="size-4" aria-hidden="true" />Remove</Button></div>
        </div></fieldset>; })}</div>
      </section>
      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center"><Button type="submit" size="lg">Add schedule revision</Button><p className="text-sm text-muted-foreground">No earlier revision will be changed.</p></div>
    </form>
  );
}
