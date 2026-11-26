"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  LoaderCircle,
  Plus,
  Trash2,
} from "lucide-react";

import {
  createMemberProtocolAction,
  updateMemberProtocolAction,
} from "@/app/protocols/actions";
import {
  TitrationStage,
  TitrationTimeline,
} from "@/components/protocol-titration/timeline";
import { FrequencySelect } from "@/components/protocol-titration/frequency-select";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { initialMemberProtocolActionState } from "@/lib/member-protocol/action-state";
import {
  calculateTimelineRanges,
  convertMassUnit,
  formatTimelineRange,
  moveTimelineStage,
  scaleBlendIngredients,
} from "@/lib/protocol-titration/timeline";
import type { ProtocolTemplateFrequency } from "@/lib/protocol-template/validation";

type CatalogueOption = { displayName: string; id: string };
type InitialSchedule = {
  administrationsPerDay?: number;
  catalogueEntryId: string;
  daysOfWeek: number[];
  doseAmount: string;
  doseBasis?: string;
  doseUnit: string;
  endDay: number | null;
  frequency: ProtocolTemplateFrequency;
  ingredientDoses?: unknown[];
  intervalDays: number | null;
  route?: string | null;
  startDay: number;
  timeOfDay: string | null;
  timesOfDay?: string[];
};
type Row = {
  administrationsPerDay: string;
  catalogueEntryId: string;
  daysOfWeek: number[];
  doseAmount: string;
  doseBasis: string;
  doseUnit: string;
  duration: string;
  frequency: ProtocolTemplateFrequency;
  ingredientDoses: string;
  ingredientsEdited: boolean;
  intervalDays: string;
  key: string;
  originalEndDay: number | null;
  originalStartDay: number;
  route: string;
  timeOfDay: string;
  timesOfDay: string;
};
type StoredIngredient = {
  dose_amount: number | string;
  dose_unit: "mg" | "mcg";
  name: string;
};
type Props = {
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
  source?: { name: string; versionId: string; versionNumber: number };
};

const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function fromInitial(stage: InitialSchedule, index: number): Row {
  return {
    administrationsPerDay: String(stage.administrationsPerDay ?? 1),
    catalogueEntryId: stage.catalogueEntryId,
    daysOfWeek: stage.daysOfWeek,
    doseAmount: stage.doseAmount,
    doseBasis: stage.doseBasis ?? "single_compound_mass",
    doseUnit: stage.doseUnit,
    duration: String(
      Math.max(1, (stage.endDay ?? stage.startDay) - stage.startDay + 1),
    ),
    frequency: stage.frequency,
    ingredientDoses: JSON.stringify(stage.ingredientDoses ?? []),
    ingredientsEdited: false,
    intervalDays: stage.intervalDays?.toString() ?? "",
    key: `initial-${index}`,
    originalEndDay: stage.endDay,
    originalStartDay: stage.startDay,
    route: stage.route ?? "",
    timeOfDay: stage.timeOfDay ?? "",
    timesOfDay: JSON.stringify(stage.timesOfDay ?? []),
  };
}
function blank(catalogueEntryId = "", key = "new-0"): Row {
  return {
    administrationsPerDay: "1",
    catalogueEntryId,
    daysOfWeek: [],
    doseAmount: "",
    doseBasis: "single_compound_mass",
    doseUnit: "mg",
    duration: "7",
    frequency: "daily",
    ingredientDoses: "[]",
    ingredientsEdited: false,
    intervalDays: "",
    key,
    originalEndDay: null,
    originalStartDay: 1,
    route: "",
    timeOfDay: "",
    timesOfDay: "[]",
  };
}

function storedIngredients(value: string): StoredIngredient[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StoredIngredient =>
        Boolean(
          item &&
            typeof item === "object" &&
            "name" in item &&
            "dose_amount" in item &&
            "dose_unit" in item &&
            (item.dose_unit === "mg" || item.dose_unit === "mcg"),
        ),
    );
  } catch {
    return [];
  }
}

export function ProtocolForm({
  catalogue,
  initial,
  onboarding = false,
  preferredCatalogueId,
  source,
}: Props) {
  const router = useRouter();
  const action = initial?.protocolId
    ? updateMemberProtocolAction.bind(null, initial.protocolId)
    : createMemberProtocolAction.bind(
        null,
        source?.versionId ?? null,
        onboarding,
      );
  const [state, formAction, pending] = useActionState(
    action,
    initialMemberProtocolActionState,
  );
  const [name, setName] = useState(initial?.name ?? source?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [rows, setRows] = useState<Row[]>(
    initial?.schedules.length
      ? initial.schedules.map(fromInitial)
      : [blank(preferredCatalogueId)],
  );
  const [timelineEdited, setTimelineEdited] = useState(!initial?.schedules.length);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const ranges = useMemo(
    () =>
      calculateTimelineRanges(
        rows.map((row) => ({
          duration: Math.max(1, Number(row.duration) || 1),
          unit: "days",
        })),
      ),
    [rows],
  );
  const durationDays = timelineEdited
    ? (ranges.at(-1)?.endDay ?? 1)
    : (initial?.durationDays ?? ranges.at(-1)?.endDay ?? 1);

  useEffect(() => {
    if (lastAdded)
      document
        .getElementById(`stage-${lastAdded}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [lastAdded, rows.length]);
  function update(key: string, patch: Partial<Row>, affectsTimeline = false) {
    setRows((value) =>
      value.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        if (
          patch.doseUnit &&
          patch.doseUnit !== row.doseUnit &&
          (patch.doseUnit === "mg" || patch.doseUnit === "mcg") &&
          (row.doseUnit === "mg" || row.doseUnit === "mcg")
        )
          next.doseAmount = convertMassUnit(
            row.doseAmount,
            row.doseUnit,
            patch.doseUnit,
          );
        const ingredients = storedIngredients(row.ingredientDoses);
        if (
          !row.ingredientsEdited &&
          ingredients.length &&
          (patch.doseAmount !== undefined || patch.doseUnit !== undefined) &&
          (next.doseUnit === "mg" || next.doseUnit === "mcg")
        ) {
          const scaled = scaleBlendIngredients(
            next.doseAmount,
            next.doseUnit,
            ingredients.map((ingredient) => ({
              doseAmount: String(ingredient.dose_amount),
              doseUnit: ingredient.dose_unit,
              name: ingredient.name,
            })),
          );
          if (scaled) {
            next.ingredientDoses = JSON.stringify(
              scaled.map((ingredient) => ({
                dose_amount: ingredient.doseAmount,
                dose_unit: ingredient.doseUnit,
                name: ingredient.name,
              })),
            );
          }
        }
        return next;
      }),
    );
    if (affectsTimeline) setTimelineEdited(true);
  }
  function addStage() {
    const key = crypto.randomUUID();
    const previous = rows.at(-1);
    setRows((value) => [
      ...value,
      {
        ...blank(previous?.catalogueEntryId, key),
        doseUnit: previous?.doseUnit ?? "mg",
        frequency: previous?.frequency ?? "daily",
        doseBasis: previous?.doseBasis ?? "single_compound_mass",
        ingredientDoses: previous?.ingredientDoses ?? "[]",
        route: previous?.route ?? "",
      },
    ]);
    setTimelineEdited(true);
    setLastAdded(key);
  }
  function move(index: number, direction: -1 | 1) {
    setRows((value) => moveTimelineStage(value, index, index + direction));
    setTimelineEdited(true);
  }
  function remove(key: string) {
    setRows((value) => value.length > 1 ? value.filter((row) => row.key !== key) : value);
    setTimelineEdited(true);
  }
  function toggleDay(key: string, day: number) {
    const row = rows.find((candidate) => candidate.key === key);
    if (!row) return;
    const days = row.daysOfWeek.includes(day)
      ? row.daysOfWeek.filter((value) => value !== day)
      : [...row.daysOfWeek, day].sort();
    update(key, { daysOfWeek: days });
  }
  function updateIngredient(key: string, ingredientIndex: number, doseAmount: string) {
    const row = rows.find((candidate) => candidate.key === key);
    if (!row) return;
    const ingredients = storedIngredients(row.ingredientDoses).map((ingredient, index) =>
      index === ingredientIndex ? { ...ingredient, dose_amount: doseAmount } : ingredient,
    );
    update(key, { ingredientDoses: JSON.stringify(ingredients), ingredientsEdited: true });
  }

  return (
    <form action={formAction} className="space-y-7" aria-busy={pending}>
      <input type="hidden" name="scheduleCount" value={rows.length} />
      <input type="hidden" name="durationDays" value={durationDays} />
      {source ? (
        <div className="rounded-2xl border border-primary/20 bg-secondary/55 p-4 text-sm">
          <p className="font-semibold">
            Copied from {source.name}, version {source.versionNumber}
          </p>
          <p className="mt-1 text-muted-foreground">
            Your changes affect only this private draft.
          </p>
        </div>
      ) : null}
      <fieldset className="grid gap-4" disabled={pending}>
        <label className="space-y-2">
          <span className="text-sm font-semibold">Protocol name</span>
          <input
            name="name"
            required
            minLength={3}
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-12 w-full rounded-xl border bg-background px-4"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold">
            Notes{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </span>
          <textarea
            name="description"
            rows={3}
            maxLength={1000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-xl border bg-background px-4 py-3"
          />
        </label>
      </fieldset>
      <section aria-labelledby="titration-heading">
        <div className="mb-5">
          <h2 id="titration-heading" className="text-xl font-bold">
            Titration timeline
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Set each dose and how long it lasts. Later ranges update
            automatically.
          </p>
        </div>
        <TitrationTimeline>
          {rows.map((row, index) => {
            const prefix = `schedule.${index}`;
            const range = timelineEdited
              ? ranges[index]
              : { startDay: row.originalStartDay, endDay: row.originalEndDay };
            return (
              <div
                id={`stage-${row.key}`}
                key={row.key}
                className="scroll-mt-6"
              >
                <TitrationStage
                  index={index}
                  range={formatTimelineRange(
                    range.startDay,
                    range.endDay,
                    "days",
                  )}
                >
                  <input
                    type="hidden"
                    name={`${prefix}.startDay`}
                    value={range.startDay}
                  />
                  <input
                    type="hidden"
                    name={`${prefix}.endDay`}
                    value={range.endDay ?? durationDays}
                  />
                  <input
                    type="hidden"
                    name={`${prefix}.daysOfWeek`}
                    value={
                      row.frequency === "weekly" ? row.daysOfWeek.join(",") : ""
                    }
                  />
                  <input
                    type="hidden"
                    name={`${prefix}.intervalDays`}
                    value={
                      row.frequency === "interval_days" ? row.intervalDays : ""
                    }
                  />
                  <input
                    type="hidden"
                    name={`${prefix}.administrationsPerDay`}
                    value={row.administrationsPerDay}
                  />
                  <input
                    type="hidden"
                    name={`${prefix}.doseBasis`}
                    value={row.doseBasis}
                  />
                  <input
                    type="hidden"
                    name={`${prefix}.ingredientDoses`}
                    value={row.ingredientDoses}
                  />
                  <input
                    type="hidden"
                    name={`${prefix}.route`}
                    value={row.route}
                  />
                  <input
                    type="hidden"
                    name={`${prefix}.timesOfDay`}
                    value={row.timesOfDay}
                  />
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="space-y-2 sm:col-span-2">
                      <span className="text-sm font-medium">Compound</span>
                      <select
                        name={`${prefix}.catalogueEntryId`}
                        required
                        value={row.catalogueEntryId}
                        onChange={(event) => {
                          if (event.target.value === "__new_private_compound__") {
                            router.push("/protocols/new/compound");
                            return;
                          }
                          update(row.key, { catalogueEntryId: event.target.value });
                        }}
                        className="h-11 w-full rounded-xl border bg-background px-3"
                      >
                        <option value="">Select a compound</option>
                        <option value="__new_private_compound__">+ Add new private compound…</option>
                        {catalogue.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.displayName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium">Dose</span>
                      <input
                        name={`${prefix}.doseAmount`}
                        inputMode="decimal"
                        required
                        value={row.doseAmount}
                        onChange={(event) =>
                          update(row.key, { doseAmount: event.target.value })
                        }
                        className="h-11 w-full rounded-xl border bg-background px-3"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium">Unit</span>
                      <select
                        name={`${prefix}.doseUnit`}
                        value={row.doseUnit}
                        onChange={(event) =>
                          update(row.key, { doseUnit: event.target.value })
                        }
                        className="h-11 w-full rounded-xl border bg-background px-3"
                      >
                        <option value="mg">mg</option>
                        <option value="mcg">mcg</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium">Stage length</span>
                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          max={3650}
                          value={row.duration}
                          onChange={(event) =>
                            update(
                              row.key,
                              { duration: event.target.value },
                              true,
                            )
                          }
                          className="h-11 w-full rounded-xl border bg-background px-3 pr-14"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                          days
                        </span>
                      </div>
                    </label>
                    <label className="space-y-2 sm:col-span-2">
                      <span className="text-sm font-medium">
                        Administration frequency
                      </span>
                      <FrequencySelect name={`${prefix}.frequency`} value={row.frequency} onChange={(value) => update(row.key, { frequency: value })} />
                    </label>
                    {row.frequency === "weekly" ? (
                      <div className="space-y-2 sm:col-span-2 lg:col-span-4">
                        <span className="text-sm font-medium">
                          Choose weekdays
                        </span>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                          {[1, 2, 3, 4, 5, 6, 0].map((value) => (
                            <button
                              key={value}
                              type="button"
                              aria-pressed={row.daysOfWeek.includes(value)}
                              onClick={() => toggleDay(row.key, value)}
                              className={`min-h-11 rounded-lg border text-xs font-semibold ${row.daysOfWeek.includes(value) ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}
                            >
                              {weekdayNames[value]}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <details className="mt-4 rounded-xl border bg-muted/20">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold">
                      Advanced settings
                      {storedIngredients(row.ingredientDoses).length
                        ? " & ingredients"
                        : ""}
                      <ChevronDown className="size-4" />
                    </summary>
                    <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
                      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={row.frequency === "interval_days"} onChange={(event) => update(row.key, { frequency: event.target.checked ? "interval_days" : "daily" })} />Use a custom interval schedule</label>
                    {row.frequency === "interval_days" ? (
                      <label className="space-y-2">
                        <span className="text-sm font-medium">
                          Every how many days?
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={3650}
                          value={row.intervalDays}
                          onChange={(event) =>
                            update(row.key, {
                              intervalDays: event.target.value,
                            })
                          }
                          className="h-11 w-full rounded-xl border bg-background px-3"
                        />
                      </label>
                    ) : null}

                      <label className="space-y-2"><span className="text-sm font-medium">Compound dose type</span><select value={row.doseBasis} onChange={(event) => update(row.key, { doseBasis: event.target.value })} className="h-11 w-full rounded-xl border bg-background px-3"><option value="single_compound_mass">Standalone compound</option><option value="combined_blend_mass">Blend — combined dose</option><option value="combined_daily_mass">Blend — daily total</option></select></label>
                      <Button type="button" variant="outline" onClick={() => update(row.key, { ingredientDoses: JSON.stringify([...storedIngredients(row.ingredientDoses), { name: "", dose_amount: "", dose_unit: "mg" }]), ingredientsEdited: true })}>Add blend ingredient</Button>
                      <label className="space-y-2">
                        <span className="text-sm font-medium">
                          Administrations per day
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={row.administrationsPerDay}
                          onChange={(event) =>
                            update(row.key, {
                              administrationsPerDay: event.target.value,
                            })
                          }
                          className="h-11 w-full rounded-xl border bg-background px-3"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-medium">
                          Time{" "}
                          <span className="font-normal text-muted-foreground">
                            (optional)
                          </span>
                        </span>
                        <input
                          name={`${prefix}.timeOfDay`}
                          type="time"
                          value={row.timeOfDay}
                          onChange={(event) =>
                            update(row.key, { timeOfDay: event.target.value })
                          }
                          className="h-11 w-full rounded-xl border bg-background px-3"
                        />
                      </label>
                      <label className="space-y-2 sm:col-span-2">
                        <span className="text-sm font-medium">
                          Administration route{" "}
                          <span className="font-normal text-muted-foreground">
                            (optional)
                          </span>
                        </span>
                        <input
                          value={row.route}
                          onChange={(event) =>
                            update(row.key, { route: event.target.value })
                          }
                          className="h-11 w-full rounded-xl border bg-background px-3"
                        />
                      </label>
                      {storedIngredients(row.ingredientDoses).map(
                        (ingredient, ingredientIndex) => (
                          <label
                            className="space-y-2"
                            key={ingredientIndex}
                          >
                            <input aria-label={`Stage ${index + 1} ingredient ${ingredientIndex + 1} name`} value={ingredient.name} onChange={(event) => update(row.key, { ingredientDoses: JSON.stringify(storedIngredients(row.ingredientDoses).map((item, i) => i === ingredientIndex ? { ...item, name: event.target.value } : item)), ingredientsEdited: true })} className="h-11 w-full rounded-xl border bg-background px-3" placeholder="Ingredient name" />
                            <select aria-label={`Stage ${index + 1} ingredient ${ingredientIndex + 1} unit`} value={ingredient.dose_unit} onChange={(event) => update(row.key, { ingredientDoses: JSON.stringify(storedIngredients(row.ingredientDoses).map((item, i) => i === ingredientIndex ? { ...item, dose_unit: event.target.value } : item)), ingredientsEdited: true })} className="h-11 w-full rounded-xl border bg-background px-3"><option value="mg">mg</option><option value="mcg">mcg</option></select>
                            <Button type="button" variant="ghost" size="sm" onClick={() => update(row.key, { ingredientDoses: JSON.stringify(storedIngredients(row.ingredientDoses).filter((_, i) => i !== ingredientIndex)), ingredientsEdited: true })}>Remove ingredient</Button>
                            <input
                              inputMode="decimal"
                              value={String(ingredient.dose_amount)}
                              onChange={(event) =>
                                updateIngredient(
                                  row.key,
                                  ingredientIndex,
                                  event.target.value,
                                )
                              }
                              className="h-11 w-full rounded-xl border bg-background px-3"
                            />
                          </label>
                        ),
                      )}
                    </div>
                  </details>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="size-4" />
                      Earlier
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => move(index, 1)}
                      disabled={index === rows.length - 1}
                    >
                      <ArrowDown className="size-4" />
                      Later
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(row.key)}
                      disabled={rows.length === 1}
                    >
                      <Trash2 className="size-4" />
                      Remove
                    </Button>
                  </div>
                </TitrationStage>
              </div>
            );
          })}
        </TitrationTimeline>
        <Button
          type="button"
          variant="outline"
          className="mt-5 w-full sm:w-auto"
          onClick={addStage}
          disabled={rows.length >= 100}
        >
          <Plus className="size-4" />
          Add titration stage
        </Button>
      </section>
      {state.message ? (
        <FormMessage tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </FormMessage>
      ) : null}
      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {initial?.protocolId ? "Save changes" : "Save private protocol"}
        </Button>
        <p className="text-sm text-muted-foreground">
          {durationDays} day{durationDays === 1 ? "" : "s"} total
        </p>
      </div>
    </form>
  );
}
