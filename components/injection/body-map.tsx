"use client";

import { MapPin, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatInjectionSite,
  injectionSites,
  type InjectionSiteId,
} from "@/lib/injection/sites";
import type { InjectionSiteRotation } from "@/lib/injection/rotation";

export type BodyMapRotation = InjectionSiteRotation & {
  disabledSiteIds: InjectionSiteId[];
};

const positions: Record<InjectionSiteId, { left: string; short: string; top: string }> = {
  abdomen_left_upper: { left: "58%", short: "1LU", top: "34%" },
  abdomen_left_lower: { left: "58%", short: "1LL", top: "43%" },
  abdomen_right_upper: { left: "42%", short: "1RU", top: "34%" },
  abdomen_right_lower: { left: "42%", short: "1RL", top: "43%" },
  love_handle_left: { left: "72%", short: "2L", top: "39%" },
  love_handle_right: { left: "28%", short: "2R", top: "39%" },
  thigh_left_upper: { left: "58%", short: "3LU", top: "61%" },
  thigh_left_lower: { left: "58%", short: "3LL", top: "73%" },
  thigh_right_upper: { left: "42%", short: "3RU", top: "61%" },
  thigh_right_lower: { left: "42%", short: "3RL", top: "73%" },
  upper_arm_left: { left: "25%", short: "4L", top: "28%" },
  upper_arm_right: { left: "75%", short: "4R", top: "28%" },
  upper_buttock_left: { left: "43%", short: "5L", top: "47%" },
  upper_buttock_right: { left: "57%", short: "5R", top: "47%" },
};

function BodySilhouette({ view }: { view: "front" | "rear" }) {
  return (
    <svg viewBox="0 0 240 440" className="h-auto w-full" aria-hidden="true">
      <circle cx="120" cy="38" r="28" className="fill-secondary stroke-border" strokeWidth="3" />
      <path d="M93 72 C76 84 70 122 72 168 L80 230 L91 424 L114 424 L120 250 L126 424 L149 424 L160 230 L168 168 C170 122 164 84 147 72 C137 81 103 81 93 72Z" className="fill-secondary stroke-border" strokeWidth="3" strokeLinejoin="round" />
      <path d="M81 92 C54 108 45 160 36 223 L54 228 L78 148" className="fill-secondary stroke-border" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M159 92 C186 108 195 160 204 223 L186 228 L162 148" className="fill-secondary stroke-border" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M120 86 L120 232" className="stroke-border/60" strokeWidth="2" strokeDasharray="5 7" />
      {view === "front" ? <path d="M91 180 C106 190 134 190 149 180" className="fill-none stroke-border/70" strokeWidth="2" /> : <path d="M88 215 C103 204 137 204 152 215 M120 207 L120 245" className="fill-none stroke-border/70" strokeWidth="2" />}
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
  const sites = injectionSites.filter((site) => site.view === view);
  return (
    <section className="rounded-2xl border bg-muted/20 p-4" aria-label={`${view === "front" ? "Front" : "Rear"} body map`}>
      <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">{view === "front" ? "Front view" : "Rear view"}</h3>
      <div className="relative mx-auto mt-3 w-full max-w-72">
        <BodySilhouette view={view} />
        {sites.map((site) => {
          const position = positions[site.id];
          const active = selected === site.id;
          const disabled = rotation.disabledSiteIds.includes(site.id);
          const label = formatInjectionSite(site.id);
          const activity = rotation.activity[site.id];
          const activityClass = disabled
            ? "border-border bg-muted text-muted-foreground opacity-55"
            : activity === "suggested"
              ? "border-background bg-emerald-600 text-white hover:bg-emerald-700"
              : activity === "recent"
                ? "border-background bg-rose-600 text-white hover:bg-rose-700"
                : activity === "earlier"
                  ? "border-background bg-amber-400 text-amber-950 hover:bg-amber-500"
                  : "border-background bg-foreground/85 text-background hover:bg-primary";
          return <button key={site.id} type="button" name="body-map-site" aria-label={`${readOnly ? "History for" : disabled ? "Disabled" : "Select"} ${label}`} aria-pressed={active} disabled={readOnly || (disabled && !active)} title={`${label}${disabled ? " — disabled" : ""}`} onClick={() => onChange(site.id)} style={{ left: position.left, top: position.top }} className={`absolute flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 px-1 text-[10px] font-bold shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 ${activityClass} ${active ? "z-10 scale-110 ring-4 ring-primary/45" : ""}`}>{position.short}</button>;
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
      {!readOnly ? <input type="hidden" name="injectionSiteId" value={value ?? ""} /> : null}
      {!readOnly ? <div className="rounded-2xl border border-emerald-600/25 bg-emerald-50 p-4 text-emerald-950 dark:bg-emerald-950/25 dark:text-emerald-100"><p className="text-sm font-semibold">{rotation.suggestionLabel ? `Suggested: ${rotation.suggestionLabel}` : "No site suggestion available"}</p><p className="mt-1 text-xs leading-5 opacity-80">{rotation.reason} This is a rotation-history reference, not a guarantee that the site is suitable.</p>{rotation.suggestedSiteId && value !== rotation.suggestedSiteId ? <Button type="button" variant="outline" size="sm" className="mt-3 border-emerald-700/30 bg-background" onClick={() => onChange(rotation.suggestedSiteId)}>Use suggestion</Button> : null}</div> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <MapView view="front" selected={value} onChange={onChange} rotation={rotation} readOnly={readOnly} />
        <MapView view="rear" selected={value} onChange={onChange} rotation={rotation} readOnly={readOnly} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4"><span className="inline-flex items-center gap-2"><span className="size-3 rounded-full bg-rose-600" />Used today</span><span className="inline-flex items-center gap-2"><span className="size-3 rounded-full bg-amber-400" />Used 1–2 days ago</span><span className="inline-flex items-center gap-2"><span className="size-3 rounded-full bg-emerald-600" />Suggested</span><span className="inline-flex items-center gap-2"><span className="size-3 rounded-full bg-muted ring-1 ring-border" />Disabled/neutral</span></div>
      {!readOnly ? <div className="flex flex-col gap-3 rounded-2xl border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="inline-flex items-center gap-2 text-sm font-semibold"><MapPin className="size-4 text-primary" aria-hidden="true" />{formatInjectionSite(value)}</p>
        {value ? <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}><RotateCcw className="size-4" aria-hidden="true" />Clear site</Button> : null}
      </div> : null}
      <p className="text-xs leading-5 text-muted-foreground">Left and right refer to the person shown. Map labels use zone number plus side and position.</p>
    </div>
  );
}
