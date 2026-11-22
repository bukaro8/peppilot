"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";

import type { InjectionActionState } from "@/app/injections/actions";
import { BodyMap, type BodyMapRotation } from "@/components/injection/body-map";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import type { InjectionStatus } from "@/lib/injection/service";
import type { InjectionSiteId } from "@/lib/injection/sites";

type InitialValues = {
  actualDate: string;
  actualDoseAmount: string;
  actualDoseUnit: string;
  actualTime: string;
  actualVolumeMl: string;
  injectionSiteId: InjectionSiteId | null;
  notes: string;
  status: InjectionStatus;
};

export function InjectionRecordForm({
  action,
  initial,
  rotation,
  submitLabel,
}: {
  action: (state: InjectionActionState, formData: FormData) => Promise<InjectionActionState>;
  initial: InitialValues;
  rotation: BodyMapRotation;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    { status: "idle" } satisfies InjectionActionState,
  );
  const [status, setStatus] = useState<InjectionStatus>(initial.status);
  const [injectionSiteId, setInjectionSiteId] = useState<InjectionSiteId | null>(
    initial.injectionSiteId,
  );
  const completed = status === "completed";

  return (
    <form action={formAction} className="space-y-6" aria-busy={pending}>
      <fieldset disabled={pending} className="space-y-6">
        <legend className="sr-only">Injection record</legend>
        <div className="space-y-2">
          <label htmlFor="injection-status" className="text-sm font-semibold">Status</label>
          <select id="injection-status" name="status" value={status} onChange={(event) => setStatus(event.target.value as InjectionStatus)} className="h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
            <option value="completed">Completed</option>
            <option value="skipped">Skipped</option>
            <option value="missed">Missed</option>
          </select>
          <p className="text-xs leading-5 text-muted-foreground">Skipped and missed entries do not record an actual dose.</p>
        </div>

        {completed ? <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2"><label htmlFor="actual-date" className="text-sm font-semibold">Actual date</label><input id="actual-date" name="actualDate" type="date" required defaultValue={initial.actualDate} className="h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /></div>
          <div className="space-y-2"><label htmlFor="actual-time" className="text-sm font-semibold">Actual time</label><input id="actual-time" name="actualTime" type="time" required defaultValue={initial.actualTime} className="h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /></div>
          <div className="space-y-2"><label htmlFor="actual-dose" className="text-sm font-semibold">Actual dose</label><input id="actual-dose" name="actualDoseAmount" inputMode="decimal" required defaultValue={initial.actualDoseAmount} className="h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /></div>
          <div className="space-y-2"><label htmlFor="actual-unit" className="text-sm font-semibold">Actual unit</label><input id="actual-unit" name="actualDoseUnit" required maxLength={20} defaultValue={initial.actualDoseUnit} className="h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /></div>
          <div className="space-y-2 sm:col-span-2"><label htmlFor="actual-volume" className="text-sm font-semibold">Injection liquid volume <span className="font-normal text-muted-foreground">(mL, optional)</span></label><input id="actual-volume" name="actualVolumeMl" type="number" inputMode="decimal" min="0.0001" step="0.0001" defaultValue={initial.actualVolumeMl} className="h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><p className="text-xs leading-5 text-muted-foreground">Record liquid volume separately from compound mass and syringe markings. Rotation colours use this mL value; records without one use the standard-volume timing.</p></div>
        </div> : null}

        {completed ? <div className="space-y-3"><div><h2 className="text-lg font-semibold">Actual injection site <span className="text-sm font-normal text-muted-foreground">(optional)</span></h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Select the suggested subzone or override it with the site actually used.</p></div><BodyMap value={injectionSiteId} onChange={setInjectionSiteId} rotation={rotation} /></div> : <input type="hidden" name="injectionSiteId" value="" />}

        <div className="space-y-2"><label htmlFor="injection-notes" className="text-sm font-semibold">Notes <span className="font-normal text-muted-foreground">(optional)</span></label><textarea id="injection-notes" name="notes" rows={4} maxLength={1000} defaultValue={initial.notes} className="w-full resize-y rounded-xl border bg-background px-4 py-3 text-base leading-7 outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /></div>
      </fieldset>
      {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
      <Button type="submit" size="lg" disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}{pending ? "Saving…" : submitLabel}</Button>
    </form>
  );
}
