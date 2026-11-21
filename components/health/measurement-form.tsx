"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";

import type { MeasurementActionState } from "@/app/journal/measurements/actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { getHealthMetric, healthMetrics, type HealthMetricId } from "@/lib/health/metrics";

type Initial = { metricId: HealthMetricId; notes: string; observedOn: string; unit: string; value: string };

export function MeasurementForm({ action, initial, requestId, submitLabel }: {
  action: (state: MeasurementActionState, formData: FormData) => Promise<MeasurementActionState>;
  initial: Initial;
  requestId: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" } satisfies MeasurementActionState);
  const [metricId, setMetricId] = useState<HealthMetricId>(initial.metricId);
  const metric = getHealthMetric(metricId)!;
  const selectedUnit = (metric.units as readonly string[]).includes(initial.unit) ? initial.unit : metric.units[0];
  const [unit, setUnit] = useState(selectedUnit);

  function changeMetric(value: HealthMetricId) {
    setMetricId(value);
    setUnit(getHealthMetric(value)!.units[0]);
  }

  return <form action={formAction} className="space-y-6" aria-busy={pending}>
    <input type="hidden" name="requestId" value={requestId} />
    <fieldset disabled={pending} className="space-y-5"><legend className="sr-only">Health measurement</legend>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold">Measurement type<select name="metricId" value={metricId} onChange={(event) => changeMetric(event.target.value as HealthMetricId)} className="h-12 w-full rounded-xl border bg-background px-4 font-normal"><option value="" disabled>Choose a measurement</option>{healthMetrics.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="space-y-2 text-sm font-semibold">Measurement date<input name="observedOn" type="date" required defaultValue={initial.observedOn} className="h-12 w-full rounded-xl border bg-background px-4 font-normal" /></label>
        <label className="space-y-2 text-sm font-semibold">Value<input name="value" inputMode="decimal" required defaultValue={initial.value} className="h-12 w-full rounded-xl border bg-background px-4 font-normal" /></label>
        <label className="space-y-2 text-sm font-semibold">Unit<select name="unit" value={unit} onChange={(event) => setUnit(event.target.value)} className="h-12 w-full rounded-xl border bg-background px-4 font-normal">{metric.units.map((item) => <option key={item} value={item}>{item === "percent" ? "%" : item}</option>)}</select></label>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">Allowed canonical range: {metric.min}–{metric.max} {metric.canonicalUnit}. Values entered in another unit are converted for consistent storage.</p>
      <label className="space-y-2 text-sm font-semibold">Notes <span className="font-normal text-muted-foreground">(optional)</span><textarea name="notes" rows={4} maxLength={500} defaultValue={initial.notes} className="w-full rounded-xl border bg-background px-4 py-3 font-normal" /></label>
    </fieldset>
    {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
    <Button type="submit" size="lg" disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}{pending ? "Saving…" : submitLabel}</Button>
  </form>;
}
