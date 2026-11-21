"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";

import {
  createProtocolTemplateAction,
  updateProtocolTemplateAction,
} from "@/app/admin/templates/actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { initialProtocolTemplateActionState } from "@/lib/protocol-template/action-state";
import type { ProtocolTemplateFrequency } from "@/lib/protocol-template/validation";

type CatalogueOption = { displayName: string; id: string };

type InitialSchedule = {
  catalogueEntryId: string;
  daysOfWeek: number[];
  doseAmount: string;
  doseUnit: string;
  endDay: number;
  frequency: ProtocolTemplateFrequency;
  intervalDays: number | null;
  startDay: number;
  timeOfDay: string | null;
};

type TemplateFormProps = {
  catalogue: CatalogueOption[];
  initial?: {
    description: string | null;
    durationDays: number;
    name: string;
    schedules: InitialSchedule[];
    slug: string;
    status: "draft" | "published" | "retired";
    templateId: string;
    versionId: string;
  };
};

type FormRow = { frequency: ProtocolTemplateFrequency | ""; key: string; schedule?: InitialSchedule };

export function TemplateForm({ catalogue, initial }: TemplateFormProps) {
  const action = initial
    ? updateProtocolTemplateAction.bind(null, initial.templateId, initial.versionId)
    : createProtocolTemplateAction;
  const [state, formAction, pending] = useActionState(action, initialProtocolTemplateActionState);
  const [rows, setRows] = useState<FormRow[]>(
    initial?.schedules.length
      ? initial.schedules.map((schedule, index) => ({
          frequency: schedule.frequency,
          key: `${initial.versionId}-${index}`,
          schedule,
        }))
      : [{ frequency: "", key: crypto.randomUUID() }],
  );

  function addRow() {
    setRows((current) => [...current, { frequency: "", key: crypto.randomUUID() }]);
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  function setFrequency(key: string, frequency: ProtocolTemplateFrequency | "") {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, frequency } : row)));
  }

  return (
    <form action={formAction} className="space-y-8" aria-busy={pending}>
      <input type="hidden" name="scheduleCount" value={rows.length} />
      <fieldset className="grid gap-5 sm:grid-cols-2" disabled={pending}>
        <legend className="sr-only">Template details</legend>
        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-semibold" htmlFor="template-name">Template name</label>
          <input id="template-name" name="name" required minLength={3} maxLength={100} defaultValue={initial?.name ?? ""} className="h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="template-slug">Public slug</label>
          <input id="template-slug" name="slug" required={!initial} readOnly={Boolean(initial)} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={100} defaultValue={initial?.slug ?? ""} placeholder="descriptive-template-name" className="h-12 w-full rounded-xl border bg-background px-4 text-base outline-none read-only:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40" />
          <p className="text-xs leading-5 text-muted-foreground">Lowercase letters, numbers and hyphens.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="template-duration">Duration in days</label>
          <input id="template-duration" name="durationDays" type="number" min={1} max={3650} required defaultValue={initial?.durationDays ?? ""} className="h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-semibold" htmlFor="template-description">Description <span className="font-normal text-muted-foreground">(optional)</span></label>
          <textarea id="template-description" name="description" rows={4} maxLength={1000} defaultValue={initial?.description ?? ""} className="w-full resize-y rounded-xl border bg-background px-4 py-3 text-base leading-7 outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
        </div>
      </fieldset>

      <section aria-labelledby="schedule-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="schedule-heading" className="text-xl font-bold">Schedule steps</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Enter authored schedule data only. PepPilot does not suggest doses or timing.</p>
          </div>
          <Button type="button" variant="outline" onClick={addRow} disabled={pending || rows.length >= 100}><Plus className="size-4" aria-hidden="true" />Add schedule</Button>
        </div>

        <div className="mt-5 space-y-4">
          {rows.map((row, index) => {
            const prefix = `schedule.${index}`;
            return (
              <fieldset key={row.key} className="rounded-2xl border bg-muted/25 p-4 sm:p-5" disabled={pending}>
                <legend className="px-2 text-sm font-semibold">Schedule {index + 1}</legend>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium" htmlFor={`${prefix}.catalogueEntryId`}>Catalogue entry</label>
                    <select id={`${prefix}.catalogueEntryId`} name={`${prefix}.catalogueEntryId`} required defaultValue={row.schedule?.catalogueEntryId ?? ""} className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
                      <option value="">Select an entry</option>
                      {catalogue.map((entry) => <option key={entry.id} value={entry.id}>{entry.displayName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`${prefix}.doseAmount`}>Dose amount</label>
                    <input id={`${prefix}.doseAmount`} name={`${prefix}.doseAmount`} inputMode="decimal" required defaultValue={row.schedule?.doseAmount ?? ""} placeholder="Enter amount" className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`${prefix}.doseUnit`}>Unit</label>
                    <input id={`${prefix}.doseUnit`} name={`${prefix}.doseUnit`} required maxLength={20} defaultValue={row.schedule?.doseUnit ?? ""} placeholder="e.g. mg" className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`${prefix}.frequency`}>Frequency</label>
                    <select id={`${prefix}.frequency`} name={`${prefix}.frequency`} required value={row.frequency} onChange={(event) => setFrequency(row.key, event.target.value as ProtocolTemplateFrequency | "")} className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
                      <option value="">Select frequency</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Selected weekdays</option>
                      <option value="interval_days">Every N days</option>
                    </select>
                  </div>
                  {row.frequency === "weekly" ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor={`${prefix}.daysOfWeek`}>Weekdays</label>
                      <input id={`${prefix}.daysOfWeek`} name={`${prefix}.daysOfWeek`} required defaultValue={row.schedule?.daysOfWeek.join(",") ?? ""} placeholder="0,2,4 (Sun–Sat)" className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
                    </div>
                  ) : null}
                  {row.frequency === "interval_days" ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor={`${prefix}.intervalDays`}>Interval days</label>
                      <input id={`${prefix}.intervalDays`} name={`${prefix}.intervalDays`} type="number" min={1} max={3650} required defaultValue={row.schedule?.intervalDays ?? ""} className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`${prefix}.timeOfDay`}>Time <span className="font-normal text-muted-foreground">(optional)</span></label>
                    <input id={`${prefix}.timeOfDay`} name={`${prefix}.timeOfDay`} type="time" defaultValue={row.schedule?.timeOfDay ?? ""} className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`${prefix}.startDay`}>Start day</label>
                    <input id={`${prefix}.startDay`} name={`${prefix}.startDay`} type="number" min={1} required defaultValue={row.schedule?.startDay ?? ""} className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`${prefix}.endDay`}>End day</label>
                    <input id={`${prefix}.endDay`} name={`${prefix}.endDay`} type="number" min={1} required defaultValue={row.schedule?.endDay ?? ""} className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full" type="button" variant="ghost" onClick={() => removeRow(row.key)} disabled={pending || rows.length === 1}><Trash2 className="size-4" aria-hidden="true" />Remove</Button>
                  </div>
                </div>
              </fieldset>
            );
          })}
        </div>
      </section>

      {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {pending ? "Saving…" : initial?.status === "draft" ? "Save draft" : initial ? "Create new draft version" : "Create draft template"}
        </Button>
        {initial?.status !== "draft" ? <p className="text-sm text-muted-foreground">Published and retired versions remain unchanged.</p> : null}
      </div>
    </form>
  );
}
