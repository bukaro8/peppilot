"use client";

import { useActionState, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clock3,
  LoaderCircle,
  Syringe,
} from "lucide-react";

import {
  createQuickInjectionRecordAction,
  type InjectionActionState,
} from "@/app/injections/actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { BodyMap } from "@/components/injection/body-map";
import type { BodyMapRotation } from "@/components/injection/body-map";
import type { ScheduledProtocolEvent } from "@/lib/protocol-calendar/service";
import {
  formatAnatomicalInjectionSite,
  injectionSites,
  type InjectionSiteId,
} from "@/lib/injection/sites";
import { formatDoseAmount } from "@/lib/protocol-template/presentation";

type Option = ScheduledProtocolEvent;
const initialActionState: InjectionActionState = { status: "idle" };

function localNow() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return {
    date: new Date(now.valueOf() - offset).toISOString().slice(0, 10),
    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
  };
}

function siteState(rotation: BodyMapRotation, siteId: InjectionSiteId) {
  const value = rotation.activity[siteId];
  return value === "red" ? "red" : value === "yellow" ? "yellow" : "green";
}

const siteStyles = {
  green: "border-emerald-200 status-positive text-[color:var(--positive-ink)]",
  yellow: "border-amber-200 status-caution text-[color:var(--caution-ink)]",
  red: "border-rose-200 status-rest text-[color:var(--rest-ink)]",
} as const;

export function QuickInjectionForm({
  dashboardDate,
  initialOccurrenceId,
  initialSiteId,
  options,
  rotation,
}: {
  dashboardDate: string;
  initialOccurrenceId: string | null;
  initialSiteId: InjectionSiteId | null;
  options: Option[];
  rotation: BodyMapRotation;
}) {
  const [state, formAction, pending] = useActionState(
    createQuickInjectionRecordAction,
    initialActionState,
  );
  const initialOption =
    options.find((option) => option.id === initialOccurrenceId) ?? null;
  const [occurrenceId, setOccurrenceId] = useState(initialOption?.id ?? "");
  const selectedOption = useMemo(
    () => options.find((option) => option.id === occurrenceId) ?? null,
    [occurrenceId, options],
  );
  const enabledInitialSite = initialSiteId && !rotation.disabledSiteIds.includes(initialSiteId) ? initialSiteId : null;
  const [siteId, setSiteId] = useState<InjectionSiteId | null>(enabledInitialSite);
  const [actualDose, setActualDose] = useState(initialOption?.doseAmount ?? "");
  const [actualUnit, setActualUnit] = useState(initialOption?.doseUnit ?? "mg");
  const [actualDate, setActualDate] = useState(() => localNow().date || dashboardDate);
  const [actualTime, setActualTime] = useState(() => localNow().time);
  const [acknowledged, setAcknowledged] = useState(false);
  const [changingSite, setChangingSite] = useState(!enabledInitialSite);

  function chooseProtocol(option: Option) {
    setOccurrenceId(option.id);
    setActualDose(option.doseAmount);
    setActualUnit(option.doseUnit);
  }
  function chooseSite(value: InjectionSiteId) {
    setSiteId(value);
    setAcknowledged(false);
    setChangingSite(false);
  }

  const selectedState = siteId ? siteState(rotation, siteId) : null;
  const requiresAcknowledgement =
    selectedState === "yellow" || selectedState === "red";
  const enabledSites = injectionSites
    .filter((site) => !rotation.disabledSiteIds.includes(site.id))
    ;

  return (
    <form action={formAction} className="space-y-6" aria-busy={pending}>
      <input type="hidden" name="occurrenceId" value={occurrenceId} />
      <input
        type="hidden"
        name="peptideName"
        value={selectedOption?.peptideName ?? "Injection"}
      />
      <input type="hidden" name="dashboardDate" value={dashboardDate} />
      <input type="hidden" name="status" value="completed" />
      <input type="hidden" name="injectionSiteId" value={siteId ?? ""} />

      {siteId ? (
        <div
          className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${siteStyles[selectedState ?? "green"]}`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`size-10 shrink-0 rounded-full shadow-sm ${selectedState === "red" ? "bg-rose-500" : selectedState === "yellow" ? "bg-amber-400" : "bg-emerald-500"}`}
            />
            <div className="min-w-0">
              <p className="text-xs font-medium">Selected site</p>
              <p className="text-base font-bold leading-tight sm:text-lg">
                {formatAnatomicalInjectionSite(siteId)}
              </p>
              <p className="mt-1 text-xs font-bold capitalize sm:hidden">
                {selectedState === "red"
                  ? "Resting"
                  : selectedState === "yellow"
                    ? "Caution"
                    : "Available"}
              </p>
            </div>
          </div>
          <span className="hidden rounded-full bg-background/75 px-3 py-1 text-xs font-bold capitalize sm:inline-flex">
            {selectedState === "red"
              ? "Resting"
              : selectedState === "yellow"
                ? "Caution"
                : "Available"}
          </span>
        </div>
      ) : null}
      {siteId ? <button type="button" className="text-sm font-semibold text-primary underline" onClick={() => setChangingSite(!changingSite)}>{changingSite ? "Keep selected site" : "Change site"}</button> : null}
      <BodyMap readOnly rotation={rotation} value={siteId} onChange={() => undefined} />

      <section aria-labelledby="quick-protocol-heading">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            1
          </span>
          <div>
            <h2 id="quick-protocol-heading" className="font-bold">
              Choose active protocol
            </h2>
            <p className="text-xs text-muted-foreground">
              Scheduled dose is filled automatically.
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {options.map((option) => {
            const selected = option.id === occurrenceId;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => chooseProtocol(option)}
                className={`min-h-24 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 ${selected ? "border-primary bg-primary/8 ring-2 ring-primary/20" : "bg-background hover:border-primary/30"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{option.peptideName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {option.cycleName}
                    </p>
                  </div>
                  {selected ? <Check className="size-5 text-primary" /> : null}
                </div>
                <p className="mt-3 text-sm font-semibold text-primary">
                  {formatDoseAmount(option.doseAmount)} {option.doseUnit}
                  <span className="ml-2 font-normal text-muted-foreground">
                    {option.timeOfDay ?? "Any time"}
                  </span>
                </p>
              </button>
            );
          })}
        </div>
        {!options.length ? (
          <div className="mt-3 rounded-2xl border border-dashed p-6 text-center">
            <p className="font-semibold">No pending scheduled injections</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Return to the dashboard to review activity.
            </p>
          </div>
        ) : null}
      </section>

      {changingSite ? <section aria-labelledby="quick-site-heading">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            2
          </span>
          <div>
            <h2 id="quick-site-heading" className="font-bold">
              Choose injection site
            </h2>
            <p className="text-xs text-muted-foreground">
              Sites stay in anatomical order.
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {enabledSites.map((site) => {
            const status = siteState(rotation, site.id);
            const selected = siteId === site.id;
            return (
              <button
                key={site.id}
                type="button"
                aria-pressed={selected}
                onClick={() => chooseSite(site.id)}
                className={`flex min-h-16 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 ${siteStyles[status]} ${selected ? "ring-2 ring-primary ring-offset-2" : ""}`}
              >
                <div>
                  <p className="text-sm font-bold">
                    {formatAnatomicalInjectionSite(site.id)}
                  </p>
                  <p className="mt-0.5 text-xs capitalize">
                    {status === "green"
                      ? "Available"
                      : status === "yellow"
                        ? "Caution"
                        : "Resting"}
                  </p>
                </div>
                <span
                  className={`size-3 shrink-0 rounded-full ${status === "green" ? "bg-emerald-500" : status === "yellow" ? "bg-amber-400" : "bg-rose-500"}`}
                />
              </button>
            );
          })}
        </div>
      </section> : null}

      {siteId && requiresAcknowledgement ? (
        <div
          className={`rounded-2xl border p-4 ${selectedState === "red" ? "border-rose-200 status-rest" : "border-amber-200 status-caution"}`}
        >
          <p className="flex items-center gap-2 font-bold">
            <AlertTriangle className="size-4" />
            {selectedState === "red"
              ? "This site is still resting"
              : "This site was used recently"}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {formatAnatomicalInjectionSite(siteId)} was last recorded on{" "}
            {rotation.lastUsed[siteId] ?? "an unknown date"}. Rotation colours
            are based on recorded volume and local calendar days; they are a
            history aid, not a medical recommendation.
          </p>
          <label className="mt-3 flex min-h-11 items-center gap-3 rounded-xl border bg-background px-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            I understand and want to continue with this site
          </label>
        </div>
      ) : null}

      {selectedOption ? (
        <div className="rounded-2xl border border-primary/20 bg-secondary/45 p-4">
          <div className="flex items-start gap-3">
            <Syringe className="mt-0.5 size-5 text-primary" />
            <div>
              <p className="font-bold">
                Ready to record {selectedOption.peptideName}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDoseAmount(selectedOption.doseAmount)}{" "}
                {selectedOption.doseUnit}
                {siteId
                  ? ` · ${formatAnatomicalInjectionSite(siteId)}`
                  : " · Choose a site"}
                {selectedOption.route ? ` · ${selectedOption.route}` : ""}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <label className="block space-y-2 rounded-2xl border bg-background p-4">
        <span className="text-sm font-semibold">Injection volume <span className="font-normal text-muted-foreground">(mL, optional)</span></span>
        <input aria-label="Injection volume (mL)" name="actualVolumeMl" type="number" inputMode="decimal" min="0.0001" step="0.0001" className="h-11 w-full rounded-xl border bg-background px-3" />
        <p className="text-xs leading-5 text-muted-foreground">Record the liquid volume to use the correct rotation timing. At 0.8 mL or less, or if left blank: red on the injection date, amber the next day, then green. Enter a volume above 0.8 mL to use two red calendar days, then amber, then green.</p>
      </label>
      <details className="rounded-2xl border bg-background">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold">
          Edit details <ChevronDown className="size-4" />
        </summary>
        <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Actual dose</span>
            <input
              name="actualDoseAmount"
              required
              inputMode="decimal"
              value={actualDose}
              onChange={(event) => setActualDose(event.target.value)}
              className="h-11 w-full rounded-xl border bg-background px-3"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Dose unit</span>
            <input
              name="actualDoseUnit"
              required
              maxLength={20}
              value={actualUnit}
              onChange={(event) => setActualUnit(event.target.value)}
              className="h-11 w-full rounded-xl border bg-background px-3"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Date</span>
            <input
              name="actualDate"
              type="date"
              required
              value={actualDate}
              onChange={(event) => setActualDate(event.target.value)}
              className="h-11 w-full rounded-xl border bg-background px-3"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Time</span>
            <input
              name="actualTime"
              type="time"
              required
              value={actualTime}
              onChange={(event) => setActualTime(event.target.value)}
              className="h-11 w-full rounded-xl border bg-background px-3"
            />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-semibold">
              Notes{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </span>
            <textarea
              name="notes"
              rows={3}
              maxLength={1000}
              className="w-full rounded-xl border bg-background px-3 py-2"
            />
          </label>
        </div>
      </details>

      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}
      <div className="sticky bottom-20 z-10 rounded-2xl border bg-background/95 p-3 shadow-lg backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <Button
          className="w-full"
          size="lg"
          type="submit"
          disabled={
            pending ||
            !selectedOption ||
            !siteId ||
            (requiresAcknowledgement && !acknowledged)
          }
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Syringe className="size-4" />
          )}
          {pending ? "Recording…" : "Log Injection"}
        </Button>
        <p className="mt-2 hidden items-center justify-center gap-1 text-xs text-muted-foreground min-[360px]:flex">
          <Clock3 className="size-3" />
          Current local date and time are prefilled
        </p>
      </div>
    </form>
  );
}
