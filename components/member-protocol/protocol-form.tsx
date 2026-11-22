"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Eye, LoaderCircle, Plus, Trash2 } from "lucide-react";

import {
  createMemberProtocolAction,
  updateMemberProtocolAction,
} from "@/app/protocols/actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { initialMemberProtocolActionState } from "@/lib/member-protocol/action-state";
import type { ProtocolTemplateFrequency } from "@/lib/protocol-template/validation";

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
};

type EditableSchedule = {
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
};

type ProtocolFormProps = {
  catalogue: CatalogueOption[];
  initial?: {
    description: string | null;
    durationDays: number | null;
    name: string;
    protocolId?: string;
    schedules: InitialSchedule[];
  };
  onboarding?: boolean;
  preferredCatalogueId?: string;
  source?: {
    name: string;
    versionId: string;
    versionNumber: number;
  };
};

const blankSchedule: Omit<EditableSchedule, "key"> = {
  catalogueEntryId: "",
  daysOfWeek: "",
  doseAmount: "",
  doseUnit: "mg",
  endDay: "",
  frequency: "",
  intervalDays: "",
  startDay: "",
  timeOfDay: "",
};

function editableSchedule(schedule: InitialSchedule, key: string): EditableSchedule {
  return {
    catalogueEntryId: schedule.catalogueEntryId,
    daysOfWeek: schedule.daysOfWeek.join(","),
    doseAmount: schedule.doseAmount,
    doseUnit: schedule.doseUnit,
    endDay: schedule.endDay === null ? "" : String(schedule.endDay),
    frequency: schedule.frequency,
    intervalDays: schedule.intervalDays === null ? "" : String(schedule.intervalDays),
    key,
    startDay: String(schedule.startDay),
    timeOfDay: schedule.timeOfDay ?? "",
  };
}

function frequencyLabel(row: EditableSchedule) {
  if (row.frequency === "daily") return "Daily";
  if (row.frequency === "weekly") {
    const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const selected = row.daysOfWeek.split(",").filter(Boolean).map(Number).map((day) => weekdayNames[day]);
    return selected.length ? `Weekly on ${selected.join(", ")}` : "Weekly days not set";
  }
  if (row.frequency === "interval_days") {
    return row.intervalDays ? `Every ${row.intervalDays} days` : "Interval not set";
  }
  return "Frequency not set";
}

export function ProtocolForm({ catalogue, initial, onboarding = false, preferredCatalogueId, source }: ProtocolFormProps) {
  const action = initial?.protocolId
    ? updateMemberProtocolAction.bind(null, initial.protocolId)
    : createMemberProtocolAction.bind(null, source?.versionId ?? null, onboarding);
  const [state, formAction, pending] = useActionState(action, initialMemberProtocolActionState);
  const [name, setName] = useState(initial?.name ?? source?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [durationDays, setDurationDays] = useState(
    initial?.durationDays ? String(initial.durationDays) : "",
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rows, setRows] = useState<EditableSchedule[]>(
    initial?.schedules.length
      ? initial.schedules.map((schedule, index) => editableSchedule(schedule, `initial-${index}`))
      : [{ ...blankSchedule, catalogueEntryId: preferredCatalogueId ?? "", key: "new-0" }],
  );
  const [lastAddedKey, setLastAddedKey] = useState<string | null>(null);
  const catalogueNames = useMemo(
    () => new Map(catalogue.map((entry) => [entry.id, entry.displayName])),
    [catalogue],
  );

  useEffect(() => {
    if (!lastAddedKey) return;
    document.getElementById(`schedule-${lastAddedKey}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [lastAddedKey, rows.length]);

  function addRow() {
    const key = crypto.randomUUID();
    setRows((current) => [...current, { ...blankSchedule, key }]);
    setLastAddedKey(key);
  }

  function toggleWeekday(key: string, day: number) {
    const row = rows.find((item) => item.key === key);
    if (!row) return;
    const selected = new Set(row.daysOfWeek.split(",").filter(Boolean).map(Number));
    if (selected.has(day)) selected.delete(day);
    else selected.add(day);
    updateRow(key, "daysOfWeek", [...selected].sort((left, right) => left - right).join(","));
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  function updateRow(key: string, field: keyof Omit<EditableSchedule, "key">, value: string) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  }

  return (
    <form action={formAction} className="space-y-8" aria-busy={pending}>
      <input type="hidden" name="scheduleCount" value={rows.length} />

      {source ? (
        <div className="rounded-2xl border border-primary/20 bg-secondary/55 p-4 text-sm leading-6">
          <p className="font-semibold">Copied from {source.name}, version {source.versionNumber}</p>
          <p className="mt-1 text-muted-foreground">The source reference is preserved. Any schedule changes apply only to this private draft.</p>
        </div>
      ) : null}

      <fieldset className="grid gap-5 sm:grid-cols-2" disabled={pending}>
        <legend className="sr-only">Protocol details</legend>
        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-semibold" htmlFor="protocol-name">Protocol name</label>
          <input id="protocol-name" name="name" required minLength={3} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="protocol-duration">Duration in days</label>
          <input id="protocol-duration" name="durationDays" type="number" min={1} max={3650} required value={durationDays} onChange={(event) => setDurationDays(event.target.value)} className="h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-semibold" htmlFor="protocol-description">Notes <span className="font-normal text-muted-foreground">(optional)</span></label>
          <textarea id="protocol-description" name="description" rows={4} maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full resize-y rounded-xl border bg-background px-4 py-3 text-base leading-7 outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
        </div>
      </fieldset>

      <section aria-labelledby="member-schedule-heading">
        <div>
          <h2 id="member-schedule-heading" className="text-xl font-bold">Planned schedule</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Enter only what you intend to follow. PepPilot does not supply dose or timing defaults.</p>
        </div>

        <div className="mt-5 space-y-4">
          {rows.map((row, index) => {
            const prefix = `schedule.${index}`;
            return (
              <fieldset id={`schedule-${row.key}`} key={row.key} className="scroll-mt-5 rounded-2xl border bg-muted/25 p-4 sm:p-5" disabled={pending}>
                <legend className="px-2 text-sm font-semibold">Schedule {index + 1}</legend>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium" htmlFor={`${prefix}.catalogueEntryId`}>Catalogue entry</label>
                    <select id={`${prefix}.catalogueEntryId`} name={`${prefix}.catalogueEntryId`} required value={row.catalogueEntryId} onChange={(event) => updateRow(row.key, "catalogueEntryId", event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
                      <option value="">Select an entry</option>
                      {catalogue.map((entry) => <option key={entry.id} value={entry.id}>{entry.displayName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`${prefix}.doseAmount`}>Compound dose</label>
                    <input id={`${prefix}.doseAmount`} name={`${prefix}.doseAmount`} inputMode="decimal" required value={row.doseAmount} onChange={(event) => updateRow(row.key, "doseAmount", event.target.value)} placeholder="Enter amount" className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`${prefix}.doseUnit`}>Mass unit</label>
                    <select id={`${prefix}.doseUnit`} name={`${prefix}.doseUnit`} required value={row.doseUnit} onChange={(event) => updateRow(row.key, "doseUnit", event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
                      {!['mg', 'mcg'].includes(row.doseUnit) && row.doseUnit ? <option value={row.doseUnit}>{row.doseUnit} (existing)</option> : null}
                      <option value="mg">mg</option>
                      <option value="mcg">mcg</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`${prefix}.frequency`}>Frequency</label>
                    <select id={`${prefix}.frequency`} name={`${prefix}.frequency`} required value={row.frequency} onChange={(event) => updateRow(row.key, "frequency", event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
                      <option value="">Select frequency</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly (choose days)</option>
                      <option value="interval_days">Custom (every N days)</option>
                    </select>
                  </div>
                  {row.frequency === "weekly" ? (
                    <div className="space-y-2 sm:col-span-2">
                      <span className="text-sm font-medium">Days of week</span>
                      <input type="hidden" id={`${prefix}.daysOfWeek`} name={`${prefix}.daysOfWeek`} value={row.daysOfWeek} />
                      <div className="grid grid-cols-7 gap-1" role="group" aria-label={`Schedule ${index + 1} days of week`}>
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, day) => {
                          const selected = row.daysOfWeek.split(",").filter(Boolean).map(Number).includes(day);
                          return <button key={label} type="button" aria-pressed={selected} onClick={() => toggleWeekday(row.key, day)} className={`min-h-11 rounded-lg border px-1 text-xs font-semibold transition ${selected ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>{label}</button>;
                        })}
                      </div>
                    </div>
                  ) : null}
                  {row.frequency === "interval_days" ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor={`${prefix}.intervalDays`}>Interval days</label>
                      <input id={`${prefix}.intervalDays`} name={`${prefix}.intervalDays`} type="number" min={1} max={3650} required value={row.intervalDays} onChange={(event) => updateRow(row.key, "intervalDays", event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`${prefix}.timeOfDay`}>Time <span className="font-normal text-muted-foreground">(optional)</span></label>
                    <input id={`${prefix}.timeOfDay`} name={`${prefix}.timeOfDay`} type="time" value={row.timeOfDay} onChange={(event) => updateRow(row.key, "timeOfDay", event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`${prefix}.startDay`}>Start day</label>
                    <input id={`${prefix}.startDay`} name={`${prefix}.startDay`} type="number" min={1} required value={row.startDay} onChange={(event) => updateRow(row.key, "startDay", event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`${prefix}.endDay`}>End day</label>
                    <input id={`${prefix}.endDay`} name={`${prefix}.endDay`} type="number" min={1} required value={row.endDay} onChange={(event) => updateRow(row.key, "endDay", event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full" type="button" variant="ghost" onClick={() => removeRow(row.key)} disabled={pending || rows.length === 1}><Trash2 className="size-4" aria-hidden="true" />Remove</Button>
                  </div>
                </div>
              </fieldset>
            );
          })}
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">mg and mcg describe compound mass. Injection liquid volume and syringe markings are recorded separately when logging an injection.</p>
        <Button className="mt-5 w-full sm:w-auto" type="button" variant="outline" onClick={addRow} disabled={pending || rows.length >= 100}><Plus className="size-4" aria-hidden="true" />Add another schedule</Button>
      </section>

      <section className="rounded-2xl border bg-secondary/30 p-5" aria-labelledby="protocol-preview-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 id="protocol-preview-heading" className="font-bold">Review before saving</h2><p className="mt-1 text-sm text-muted-foreground">Preview the private draft exactly as entered.</p></div>
          <Button type="button" variant="outline" onClick={() => setPreviewOpen((open) => !open)}><Eye className="size-4" aria-hidden="true" />{previewOpen ? "Hide preview" : "Preview schedule"}</Button>
        </div>
        {previewOpen ? (
          <div className="mt-5 space-y-3" aria-live="polite">
            <div className="rounded-xl bg-background p-4"><p className="font-bold">{name || "Untitled protocol"}</p><p className="mt-1 text-sm text-muted-foreground">{durationDays ? `${durationDays} days` : "Duration not set"}</p></div>
            {rows.map((row, index) => (
              <div key={row.key} className="grid gap-2 rounded-xl border bg-background p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div><p className="font-semibold">{catalogueNames.get(row.catalogueEntryId) ?? `Schedule ${index + 1}`}</p><p className="mt-1 text-sm text-muted-foreground">{frequencyLabel(row)} · Days {row.startDay || "?"}–{row.endDay || "?"}{row.timeOfDay ? ` · ${row.timeOfDay}` : ""}</p></div>
                <p className="font-semibold sm:text-right">{row.doseAmount || "?"} {row.doseUnit || ""}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {pending ? "Saving…" : initial?.protocolId ? "Save draft" : "Create private draft"}
        </Button>
        <p className="text-sm text-muted-foreground">Private to your account.</p>
      </div>
    </form>
  );
}
