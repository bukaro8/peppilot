"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  Plus,
  Trash2,
} from "lucide-react";

import { createApprovedProtocolAction } from "@/app/protocols/new/approved/actions";
import {
  TitrationStage,
  TitrationTimeline,
} from "@/components/protocol-titration/timeline";
import { Button } from "@/components/ui/button";
import { formatApprovedDecimal } from "@/lib/approved-protocol/decimal";
import type {
  ApprovedProtocolPreset,
  ApprovedScheduleStage,
} from "@/lib/approved-protocol/types";
import {
  calculateTimelineRanges,
  convertMassUnit,
  formatTimelineRange,
  moveTimelineStage,
  scaleBlendIngredients,
} from "@/lib/protocol-titration/timeline";

type Ingredient = { doseAmount: string; doseUnit: "mg" | "mcg"; name: string };
type Row = {
  administrationsPerDay: string;
  days: string;
  doseAmount: string;
  doseBasis: ApprovedScheduleStage["dose_basis"];
  doseUnit: "mg" | "mcg";
  frequencyType: ApprovedScheduleStage["frequency"]["type"];
  ingredientDoses: Ingredient[];
  ingredientsEdited: boolean;
  intervalDays: string;
  key: string;
  route: string;
  sourceIndex: number;
  weekdays: string[];
};
const weekdays = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function sourceDays(stage: ApprovedScheduleStage, durationDays: number | null) {
  const start = Math.round((stage.start_week - 1) * 7) + 1;
  const end =
    stage.end_week === null ? durationDays : Math.round(stage.end_week * 7);
  return Math.max(1, (end ?? start + 6) - start + 1);
}
function makeRow(
  stage: ApprovedScheduleStage,
  sourceIndex: number,
  durationDays: number | null,
): Row {
  return {
    administrationsPerDay:
      stage.frequency.administrations_per_day?.toString() ?? "",
    days: String(sourceDays(stage, durationDays)),
    doseAmount: formatApprovedDecimal(stage.dose_amount),
    doseBasis: stage.dose_basis,
    doseUnit: stage.dose_unit,
    frequencyType: stage.frequency.type,
    ingredientDoses: stage.ingredient_doses.map((item) => ({
      doseAmount: formatApprovedDecimal(item.dose_amount),
      doseUnit: item.dose_unit,
      name: item.name,
    })),
    ingredientsEdited: false,
    intervalDays: stage.frequency.interval_days?.toString() ?? "",
    key: `initial-${sourceIndex}`,
    route: ["not_reported", "injection_unspecified"].includes(stage.route)
      ? ""
      : stage.route,
    sourceIndex,
    weekdays: stage.frequency.weekdays,
  };
}

export function ApprovedTitrationForm({
  error,
  onboarding,
  preset,
}: {
  error?: string;
  onboarding: boolean;
  preset: ApprovedProtocolPreset;
}) {
  const fixedDays =
    preset.definition.duration_days ??
    (preset.definition.duration_weeks
      ? Math.round(preset.definition.duration_weeks * 7)
      : null);
  const exactDays =
    Boolean(
      preset.definition.duration_days &&
      preset.definition.duration_days % 7 !== 0,
    ) ||
    preset.definition.schedule.some(
      (stage) =>
        !Number.isInteger(stage.start_week) ||
        (stage.end_week !== null && !Number.isInteger(stage.end_week)),
    );
  const displayUnit = exactDays ? "days" : "weeks";
  const [name, setName] = useState(
    `${preset.displayName} — ${preset.definition.label}`,
  );
  const [notes, setNotes] = useState(preset.definition.notes);
  const [rows, setRows] = useState(() =>
    preset.definition.schedule.map((stage, index) =>
      makeRow(stage, index, fixedDays),
    ),
  );
  const [finalOngoing, setFinalOngoing] = useState(
    preset.durationType === "open_ended",
  );
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const ranges = useMemo(
    () =>
      calculateTimelineRanges(
        rows.map((row) => ({
          duration: Math.max(1, Number(row.days) || 1),
          unit: "days",
        })),
        finalOngoing,
      ),
    [finalOngoing, rows],
  );
  const totalDays = finalOngoing ? null : (ranges.at(-1)?.endDay ?? fixedDays);

  useEffect(() => {
    if (lastAdded)
      document
        .getElementById(`approved-stage-${lastAdded}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [lastAdded, rows.length]);
  function update(key: string, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }
  function updateDose(row: Row, doseAmount: string, doseUnit = row.doseUnit) {
    const convertedDose =
      doseUnit !== row.doseUnit && doseAmount === row.doseAmount
        ? convertMassUnit(doseAmount, row.doseUnit, doseUnit)
        : doseAmount;
    const ingredients =
      row.ingredientsEdited || !row.ingredientDoses.length
        ? row.ingredientDoses
        : (scaleBlendIngredients(
            convertedDose,
            doseUnit,
            row.ingredientDoses,
          ) ?? row.ingredientDoses);
    update(row.key, {
      doseAmount: convertedDose,
      doseUnit,
      ingredientDoses: ingredients,
    });
  }
  function toggleDay(row: Row, day: string) {
    update(row.key, {
      weekdays: row.weekdays.includes(day)
        ? row.weekdays.filter((value) => value !== day)
        : [...row.weekdays, day],
    });
  }
  function addStage() {
    const previous = rows.at(-1)!;
    const next = {
      ...previous,
      ingredientDoses: previous.ingredientDoses.map((item) => ({ ...item })),
      key: crypto.randomUUID(),
    };
    setRows((current) => [...current, next]);
    setLastAdded(next.key);
  }

  return (
    <form
      action={createApprovedProtocolAction}
      className="mt-4 space-y-7 rounded-2xl border bg-background p-5 shadow-sm sm:mt-6 sm:rounded-[2rem] sm:p-9"
    >
      <input type="hidden" name="presetId" value={preset.id} />
      <input type="hidden" name="stageCount" value={rows.length} />
      <input type="hidden" name="durationDays" value={totalDays ?? ""} />
      {onboarding ? <input type="hidden" name="onboarding" value="1" /> : null}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Private copy
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
          Customise {preset.definition.label}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Adjust doses and stage lengths visually. The approved source remains
          unchanged.
        </p>
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive"
        >
          {error}
        </p>
      ) : null}
      <div className="grid gap-4">
        <label className="space-y-2">
          <span className="text-sm font-semibold">Protocol name</span>
          <input
            className="h-12 w-full rounded-xl border bg-background px-4"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={3}
            maxLength={100}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold">
            Private notes{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </span>
          <textarea
            className="w-full rounded-xl border bg-background px-4 py-3"
            rows={3}
            name="description"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
      </div>
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-bold">Titration timeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranges recalculate automatically. Source-unspecified details are
            highlighted when required.
          </p>
        </div>
        <TitrationTimeline>
          {rows.map((row, index) => {
            const prefix = `stage.${index}`;
            const range = ranges[index];
            const weekly =
              row.frequencyType === "days_per_week" ||
              row.frequencyType === "times_per_week";
            return (
              <div
                id={`approved-stage-${row.key}`}
                key={row.key}
                className="scroll-mt-6"
              >
                <TitrationStage
                  index={index}
                  range={formatTimelineRange(
                    range.startDay,
                    range.endDay,
                    displayUnit,
                  )}
                >
                  <input type="hidden" name={`${prefix}.include`} value="1" />
                  <input
                    type="hidden"
                    name={`${prefix}.sourceIndex`}
                    value={row.sourceIndex}
                  />
                  <input
                    type="hidden"
                    name={`${prefix}.startDay`}
                    value={range.startDay}
                  />
                  <input
                    type="hidden"
                    name={`${prefix}.endDay`}
                    value={range.endDay ?? ""}
                  />
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="space-y-2">
                      <span className="text-sm font-medium">
                        {row.doseBasis === "single_compound_mass"
                          ? "Dose"
                          : "Combined dose"}
                      </span>
                      <input
                        className="h-11 w-full rounded-xl border bg-background px-3"
                        name={`${prefix}.doseAmount`}
                        inputMode="decimal"
                        required
                        value={row.doseAmount}
                        onChange={(event) =>
                          updateDose(row, event.target.value)
                        }
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium">Unit</span>
                      <select
                        className="h-11 w-full rounded-xl border bg-background px-3"
                        name={`${prefix}.doseUnit`}
                        value={row.doseUnit}
                        onChange={(event) =>
                          updateDose(
                            row,
                            row.doseAmount,
                            event.target.value as "mg" | "mcg",
                          )
                        }
                      >
                        <option value="mg">mg</option>
                        <option value="mcg">mcg</option>
                      </select>
                    </label>
                    {finalOngoing && index === rows.length - 1 ? (
                      <div className="space-y-2">
                        <span className="text-sm font-medium">Stage length</span>
                        <div className="flex h-11 items-center rounded-xl border bg-secondary/50 px-3 text-sm font-semibold">
                          Ongoing
                        </div>
                      </div>
                    ) : (
                      <label className="space-y-2">
                        <span className="text-sm font-medium">Stage length</span>
                        <div className="relative">
                          <input
                            type="number"
                            min={1}
                            max={3650}
                            required
                            value={row.days}
                            onChange={(event) =>
                              update(row.key, { days: event.target.value })
                            }
                            className="h-11 w-full rounded-xl border bg-background px-3 pr-16"
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                            days
                          </span>
                        </div>
                      </label>
                    )}
                    <label className="space-y-2">
                      <span className="text-sm font-medium">Frequency</span>
                      <select
                        className="h-11 w-full rounded-xl border bg-background px-3"
                        name={`${prefix}.frequencyType`}
                        value={row.frequencyType}
                        onChange={(event) =>
                          update(row.key, {
                            frequencyType: event.target
                              .value as Row["frequencyType"],
                            weekdays: [],
                          })
                        }
                      >
                        <option value="daily">Daily</option>
                        <option value="days_per_week">
                          Weekly — choose days
                        </option>
                        <option value="times_per_week">
                          Weekly — choose days
                        </option>
                        <option value="interval">Every N days</option>
                        <option value="as_needed">As needed</option>
                      </select>
                    </label>
                    {weekly ? (
                      <div className="space-y-2 sm:col-span-2 lg:col-span-4">
                        <span className="text-sm font-medium">
                          Choose weekdays
                        </span>
                        <div className="grid grid-cols-7 gap-1">
                          {weekdays.map((day) => (
                            <label
                              key={day}
                              className={`flex min-h-11 items-center justify-center rounded-lg border text-xs font-semibold capitalize ${row.weekdays.includes(day) ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}
                            >
                              <input
                                className="sr-only"
                                type="checkbox"
                                name={`${prefix}.weekday.${day}`}
                                value="1"
                                checked={row.weekdays.includes(day)}
                                onChange={() => toggleDay(row, day)}
                              />
                              {day.slice(0, 3)}
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {row.frequencyType === "interval" ? (
                      <label className="space-y-2">
                        <span className="text-sm font-medium">
                          Every how many days?
                        </span>
                        <input
                          className="h-11 w-full rounded-xl border bg-background px-3"
                          type="number"
                          min={1}
                          name={`${prefix}.intervalDays`}
                          value={row.intervalDays}
                          onChange={(event) =>
                            update(row.key, {
                              intervalDays: event.target.value,
                            })
                          }
                          required
                        />
                      </label>
                    ) : (
                      <input
                        type="hidden"
                        name={`${prefix}.intervalDays`}
                        value=""
                      />
                    )}
                  </div>
                  {row.doseBasis === "combined_daily_mass" ? (
                    <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                      This is the approved combined daily total, not
                      automatically a per-administration dose.
                    </p>
                  ) : null}
                  <details className="mt-4 rounded-xl border bg-muted/20">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold">
                      Advanced settings
                      {row.ingredientDoses.length ? " & ingredients" : ""}
                      <ChevronDown className="size-4" />
                    </summary>
                    <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-medium">
                          Administration route
                        </span>
                        <input
                          className="h-11 w-full rounded-xl border bg-background px-3"
                          name={`${prefix}.route`}
                          value={row.route}
                          onChange={(event) =>
                            update(row.key, { route: event.target.value })
                          }
                          required
                          placeholder="Enter route"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-medium">
                          Administrations per day
                        </span>
                        <input
                          className="h-11 w-full rounded-xl border bg-background px-3"
                          type="number"
                          min={1}
                          max={12}
                          name={`${prefix}.administrationsPerDay`}
                          value={row.administrationsPerDay}
                          required={
                            row.frequencyType === "daily" ||
                            row.doseBasis === "combined_daily_mass"
                          }
                          onChange={(event) =>
                            update(row.key, {
                              administrationsPerDay: event.target.value,
                            })
                          }
                        />
                      </label>
                      {row.ingredientDoses.map(
                        (ingredient, ingredientIndex) => (
                          <label
                            key={`${ingredient.name}-${ingredientIndex}`}
                            className="space-y-2"
                          >
                            <span className="text-sm font-medium">
                              {ingredient.name} ({ingredient.doseUnit})
                            </span>
                            <input
                              className="h-11 w-full rounded-xl border bg-background px-3"
                              name={`${prefix}.ingredient.${ingredientIndex}`}
                              value={ingredient.doseAmount}
                              onChange={(event) =>
                                update(row.key, {
                                  ingredientsEdited: true,
                                  ingredientDoses: row.ingredientDoses.map(
                                    (item, itemIndex) =>
                                      itemIndex === ingredientIndex
                                        ? {
                                            ...item,
                                            doseAmount: event.target.value,
                                          }
                                        : item,
                                  ),
                                })
                              }
                              inputMode="decimal"
                              required
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
                      onClick={() =>
                        setRows((current) =>
                          moveTimelineStage(current, index, index - 1),
                        )
                      }
                      disabled={index === 0}
                    >
                      <ArrowUp className="size-4" />
                      Earlier
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setRows((current) =>
                          moveTimelineStage(current, index, index + 1),
                        )
                      }
                      disabled={index === rows.length - 1}
                    >
                      <ArrowDown className="size-4" />
                      Later
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setRows((current) =>
                          current.length > 1 ? current.filter((item) => item.key !== row.key) : current,
                        )
                      }
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
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={addStage}
            disabled={rows.length >= 100}
          >
            <Plus className="size-4" />
            Add titration stage
          </Button>
          {preset.durationType === "open_ended" ? (
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={finalOngoing}
                onChange={(event) => setFinalOngoing(event.target.checked)}
              />
              Final stage continues indefinitely
            </label>
          ) : (
            <p className="text-sm text-muted-foreground">
              {totalDays} days total
            </p>
          )}
        </div>
      </section>
      <div className="border-t pt-5">
        <Button className="w-full sm:w-auto" size="lg" type="submit">
          <Copy className="size-4" />
          Create private draft
        </Button>
        <p className="mt-2 text-sm text-muted-foreground">
          You can review the saved draft before starting a cycle.
        </p>
      </div>
    </form>
  );
}
