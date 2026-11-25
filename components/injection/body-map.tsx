"use client";

import { MapPin, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatAnatomicalInjectionSite,
  formatInjectionSite,
  injectionSites,
  type InjectionSiteId,
} from "@/lib/injection/sites";
import type { InjectionSiteRotation } from "@/lib/injection/rotation";

export type BodyMapRotation = InjectionSiteRotation & {
  disabledSiteIds: InjectionSiteId[];
};

const positions: Record<
  InjectionSiteId,
  { left: string; short: string; top: string }
> = {
  abdomen_left_upper: { left: "42%", short: "1LU", top: "34%" },
  abdomen_left_lower: { left: "42%", short: "1LL", top: "43%" },
  abdomen_right_upper: { left: "58%", short: "1RU", top: "34%" },
  abdomen_right_lower: { left: "58%", short: "1RL", top: "43%" },
  love_handle_left: { left: "28%", short: "2L", top: "39%" },
  love_handle_right: { left: "72%", short: "2R", top: "39%" },
  thigh_left_upper: { left: "42%", short: "3LU", top: "61%" },
  thigh_left_lower: { left: "42%", short: "3LL", top: "73%" },
  thigh_right_upper: { left: "58%", short: "3RU", top: "61%" },
  thigh_right_lower: { left: "58%", short: "3RL", top: "73%" },
  upper_arm_left: { left: "25%", short: "4L", top: "28%" },
  upper_arm_right: { left: "75%", short: "4R", top: "28%" },
  upper_buttock_left: { left: "43%", short: "5L", top: "47%" },
  upper_buttock_right: { left: "57%", short: "5R", top: "47%" },
};

function BodySilhouette({ view }: { view: "front" | "rear" }) {
  return (
    <svg viewBox={view === "front" ? "0 0 627 1254" : "627 0 627 1254"} className="h-auto w-full" aria-hidden="true">
      <image href="/injection-body.webp" width="1254" height="1254" />
    </svg>
  );
}

function MapView({
  onChange,
  readOnly,
  rotation,
  selected,
  view,
}: {
  onChange: (site: InjectionSiteId) => void;
  readOnly: boolean;
  rotation: BodyMapRotation;
  selected: InjectionSiteId | null;
  view: "front" | "rear";
}) {
  const sites = injectionSites.filter((site) => site.view === view && (!rotation.disabledSiteIds.includes(site.id) || (!readOnly && selected === site.id)));
  return (
    <section
      className={`rounded-2xl border bg-muted/20 ${readOnly ? "p-2 sm:p-4" : "p-4"}`}
      aria-label={`${view === "front" ? "Front" : "Rear"} body map`}
    >
      <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {view === "front" ? "Front · mirror view" : "Rear view"}
      </h3>
      <div className="relative mx-auto mt-3 w-full max-w-72">
        <BodySilhouette view={view} />
        {sites.map((site) => {
          const position = positions[site.id];
          const active = selected === site.id;
          const disabled = rotation.disabledSiteIds.includes(site.id);
          const label = readOnly
            ? formatAnatomicalInjectionSite(site.id)
            : formatInjectionSite(site.id);
          const activity = rotation.activity[site.id];
          const activityClass = disabled
            ? "border-border bg-muted text-muted-foreground opacity-55"
            : activity === "suggested"
              ? "border-background bg-green-600 text-white hover:bg-green-700"
              : activity === "red"
                ? "border-background bg-red-600 text-white hover:bg-red-700"
                : activity === "yellow"
                  ? "border-background bg-amber-400 text-amber-950 hover:bg-amber-500"
                  : activity === "green"
                    ? "border-background bg-green-600 text-white hover:bg-green-700"
                    : "border-background bg-green-600 text-white hover:bg-green-700";
          if (readOnly) {
            return (
              <span
                key={site.id}
                role="img"
                aria-label={`${label}: ${disabled ? "disabled" : activity === "red" ? "resting" : activity === "yellow" ? "caution" : "available"}`}
                title={label}
                style={{ left: position.left, top: position.top }}
                className={`pointer-events-none absolute h-[7%] w-[16%] -translate-x-1/2 -translate-y-1/2 rounded-[22%] border shadow-sm ${activityClass} ${active ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
              />
            );
          }
          return (
            <button
              key={site.id}
              type="button"
              name="body-map-site"
              aria-label={`${disabled ? "Disabled" : "Select"} ${label}`}
              aria-pressed={active}
              disabled={disabled && !active}
              title={`${label}${disabled ? " — disabled" : ""}`}
              onClick={() => onChange(site.id)}
              style={{ left: position.left, top: position.top }}
              className={`absolute flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 px-1 text-[10px] font-bold shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 ${activityClass} ${active ? "z-10 scale-110 ring-4 ring-primary/45" : ""}`}
            >
              {position.short}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function BodyMap({
  onChange,
  readOnly = false,
  rotation,
  value,
}: {
  onChange: (value: InjectionSiteId | null) => void;
  readOnly?: boolean;
  rotation: BodyMapRotation;
  value: InjectionSiteId | null;
}) {
  return (
    <div className="space-y-4">
      {!readOnly ? (
        <input type="hidden" name="injectionSiteId" value={value ?? ""} />
      ) : null}
      {!readOnly ? (
        <div className="rounded-2xl border border-primary/25 bg-secondary/55 p-4">
          <p className="text-sm font-semibold text-primary">
            {rotation.suggestionLabel
              ? `Suggested: ${rotation.suggestionLabel}`
              : "No site suggestion available"}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {rotation.reason} This is a rotation-history reference, not a
            guarantee that the site is suitable.
          </p>
          {rotation.suggestedSiteId && value !== rotation.suggestedSiteId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 bg-background"
              onClick={() => onChange(rotation.suggestedSiteId)}
            >
              Use suggestion
            </Button>
          ) : null}
        </div>
      ) : null}
      <div
        className={
          readOnly
            ? "grid grid-cols-2 gap-2 sm:gap-4"
            : "grid gap-4 sm:grid-cols-2"
        }
      >
        <MapView
          view="front"
          selected={value}
          onChange={onChange}
          rotation={rotation}
          readOnly={readOnly}
        />
        <MapView
          view="rear"
          selected={value}
          onChange={onChange}
          rotation={rotation}
          readOnly={readOnly}
        />
      </div>
      <div className={`grid grid-cols-2 gap-2 text-xs text-muted-foreground ${readOnly ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-full bg-red-600" />
          Resting
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-full bg-amber-400" />
          Caution
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-full bg-green-600" />
          Available
        </span>
        {!readOnly ? <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-full bg-muted ring-1 ring-border" />
          Disabled
        </span> : null}
      </div>
      {!readOnly ? (
        <div className="flex flex-col gap-3 rounded-2xl border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="inline-flex items-center gap-2 text-sm font-semibold">
            <MapPin className="size-4 text-primary" aria-hidden="true" />
            {formatInjectionSite(value)}
          </p>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Clear site
            </Button>
          ) : null}
        </div>
      ) : null}
      <p className="text-xs leading-5 text-muted-foreground">
        Your left appears on the left of the screen in both views. The front
        is mirrored. The illustration is a
        read-only rotation overview; use the site cards to choose a location.
      </p>
    </div>
  );
}
