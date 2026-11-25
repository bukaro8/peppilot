import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  History,
  MapPin,
  Settings2,
  SkipForward,
  Sparkles,
  Syringe,
} from "lucide-react";

import { HistoryBodyMap } from "@/components/injection/history-body-map";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import type { BodyMapRotation } from "@/components/injection/body-map";
import type {
  DashboardInjectionAction,
  InjectionRecordRow,
} from "@/lib/injection/service";
import {
  formatAnatomicalInjectionSite,
  injectionSites,
  type InjectionSiteId,
} from "@/lib/injection/sites";
import { formatDoseAmount } from "@/lib/protocol-template/presentation";

const statusStyles = {
  completed: "status-positive text-[color:var(--positive-ink)]",
  missed: "status-rest text-[color:var(--rest-ink)]",
  overdue: "status-rest text-[color:var(--rest-ink)]",
  pending: "status-caution text-[color:var(--caution-ink)]",
  skipped: "bg-slate-100 text-slate-700",
} as const;

function TodayCard({
  action,
  date,
}: {
  action: DashboardInjectionAction;
  date: string;
}) {
  const occurrence = encodeURIComponent(action.event.id);
  const href = `/injections/new?occurrence=${occurrence}&date=${date}`;
  return (
    <article className="rounded-2xl border bg-background p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">{action.event.peptideName}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {action.event.cycleName}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[action.state]}`}
        >
          {action.state}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-primary">
        {formatDoseAmount(action.event.doseAmount)} {action.event.doseUnit}
        <span className="ml-2 font-normal text-muted-foreground">
          {action.event.timeOfDay ?? "Any time"}
        </span>
      </p>
      {action.record ? (
        <Button className="mt-4 w-full" variant="outline" asChild>
          <Link href={`/injections/${action.record.id}`}>View record</Link>
        </Button>
      ) : (
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <Button asChild>
            <Link href={href}>
              <Syringe className="size-4" />
              Choose site
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link
              aria-label={`Skip ${action.event.peptideName}`}
              href={`${href}&status=skipped`}
            >
              <SkipForward className="size-4" />
            </Link>
          </Button>
        </div>
      )}
    </article>
  );
}

const groupDetails = {
  green: {
    heading: "Available",
    description: "Ready for selection",
    card: "border-emerald-200 status-positive",
    dot: "bg-emerald-500",
    text: "text-[color:var(--positive-ink)]",
  },
  yellow: {
    heading: "Caution",
    description: "Recently used — review cooldown",
    card: "border-amber-200 status-caution",
    dot: "bg-amber-400",
    text: "text-[color:var(--caution-ink)]",
  },
  red: {
    heading: "Resting",
    description: "Cooling down after recent use",
    card: "border-rose-200 status-rest",
    dot: "bg-rose-500",
    text: "text-[color:var(--rest-ink)]",
  },
} as const;

function availability(rotation: BodyMapRotation, siteId: InjectionSiteId) {
  const activity = rotation.activity[siteId];
  return activity === "red"
    ? "red"
    : activity === "yellow"
      ? "yellow"
      : "green";
}

function SiteCard({
  date,
  rotation,
  siteId,
}: {
  date: string;
  rotation: BodyMapRotation;
  siteId: InjectionSiteId;
}) {
  const state = availability(rotation, siteId);
  const details = groupDetails[state];
  const lastUsed = rotation.lastUsed[siteId];
  const lastLabel = lastUsed ? `${rotation.lastCompound[siteId] ?? "Injection"} — ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${lastUsed}T12:00:00Z`))}` : "Not used yet";
  return (
    <Link
      href={`/injections/new?site=${siteId}&date=${date}`}
      className={`group flex min-h-24 min-w-0 flex-col justify-between rounded-2xl border p-3 shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 ${details.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-foreground">
            {formatAnatomicalInjectionSite(siteId)}
          </h4>
          <p className={`mt-1 text-xs font-semibold ${details.text}`}>
            {details.heading}
          </p>
        </div>
        <span
          className={`mt-1 size-3 shrink-0 rounded-full ring-4 ring-background/80 ${details.dot}`}
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {lastLabel}
      </p>
    </Link>
  );
}

export function InjectionDashboard({
  actions,
  date,
  recent,
  recorded,
  rotation,
}: {
  actions: Awaited<
    ReturnType<
      typeof import("@/lib/injection/service").getDashboardInjectionActions
    >
  >;
  date: string;
  recent: InjectionRecordRow[];
  recorded?: string;
  rotation: BodyMapRotation;
}) {
  return (
    <main className="min-h-screen bg-secondary/20">
      <section
        id="site-dashboard"
        className="mx-auto w-full max-w-7xl scroll-mt-4 px-4 pb-20 pt-5 sm:px-8 sm:pt-8 lg:px-10"
      >
        {recorded ? (
          <div className="mb-5">
            <FormMessage tone="success">
              {recorded} injection recorded successfully. Site availability has
              been refreshed.
            </FormMessage>
          </div>
        ) : null}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary sm:text-sm">
              Injection sites
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
              Choose an available site
            </h1>
            <p className="mt-2 text-sm font-semibold text-primary">Availability for {new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              One shared rotation view across every active protocol. Select a
              site card to start a quick log.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/injections?view=history">
                <History className="size-4" />
                Full history
              </Link>
            </Button>
            <Button variant="outline" size="icon" asChild>
              <Link
                href="/account#injection-sites"
                aria-label="Injection site settings"
              >
                <Settings2 className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        <section
          className="mt-6 grid gap-5 lg:grid-cols-[minmax(20rem,0.9fr)_minmax(22rem,1.1fr)]"
          aria-labelledby="rotation-overview-heading"
        >
          <div className="rounded-3xl border bg-background p-4 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-primary/10 p-2 text-primary">
                <MapPin className="size-5" />
              </span>
              <div>
                <h2 id="rotation-overview-heading" className="font-bold">
                  Rotation overview
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Read-only front and rear views
                </p>
              </div>
            </div>
            <div className="mt-4">
              <HistoryBodyMap rotation={rotation} />
            </div>
          </div>
          <div className="space-y-5">
            <div className="feature-surface rounded-3xl border border-primary/20 p-5 shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                Recommended available site
              </p>
              {rotation.suggestedSiteId ? (
                <>
                  <h2 className="mt-3 text-2xl font-bold">
                    {formatAnatomicalInjectionSite(rotation.suggestedSiteId)}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {rotation.reason}
                  </p>
                  <Button className="mt-5" asChild>
                    <Link
                      href={`/injections/new?site=${rotation.suggestedSiteId}&date=${date}`}
                    >
                      <Syringe className="size-4" />
                      Quick log here
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <h2 className="mt-3 text-xl font-bold">
                    No enabled site available
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Review your injection-site preferences before logging.
                  </p>
                </>
              )}
            </div>
            <section aria-labelledby="today-injections-heading">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    Today
                  </p>
                  <h2
                    id="today-injections-heading"
                    className="mt-1 text-xl font-bold"
                  >
                    Scheduled injections
                  </h2>
                </div>
                {actions.todayActions.length ? (
                  <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold">
                    {actions.todayActions.length}
                  </span>
                ) : null}
              </div>
              {actions.todayActions.length ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {actions.todayActions.map((action) => (
                    <TodayCard
                      key={action.event.id}
                      action={action}
                      date={date}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed bg-background p-5 text-center">
                  <Sparkles className="mx-auto size-6 text-primary" />
                  <p className="mt-2 font-semibold">Nothing scheduled today</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    You can still review site availability without recording.
                  </p>
                </div>
              )}
            </section>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="site-cards-heading">
          <div>
            <h2 id="site-cards-heading" className="text-2xl font-bold">
              Enabled injection sites
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sites stay in anatomical order. Yellow and red sites explain their
              cooldown before logging.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">{injectionSites.filter((site) => !rotation.disabledSiteIds.includes(site.id)).map((site) => <SiteCard key={site.id} siteId={site.id} date={date} rotation={rotation} />)}</div>
          {injectionSites.every((site) => rotation.disabledSiteIds.includes(site.id)) ? <p className="mt-4 text-sm text-muted-foreground">No sites enabled. <Link className="font-semibold text-primary underline" href="/account#injection-sites">Manage injection-site preferences</Link></p> : null}
        </section>

        <section className="mt-10" aria-labelledby="recent-injections-heading">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                History
              </p>
              <h2
                id="recent-injections-heading"
                className="mt-1 text-2xl font-bold"
              >
                Recent activity
              </h2>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/injections?view=history">View all</Link>
            </Button>
          </div>
          {recent.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {recent.map((record) => (
                <Link
                  key={record.id}
                  href={`/injections/${record.id}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border bg-background p-4 shadow-sm"
                >
                  <div>
                    <p className="font-bold">{record.peptideName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {record.injectionSiteId
                        ? formatAnatomicalInjectionSite(record.injectionSiteId)
                        : "Site not recorded"}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="size-3" />
                    {record.actualDate ?? record.scheduledDate}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed bg-background p-7 text-center">
              <CheckCircle2 className="mx-auto size-6 text-primary" />
              <p className="mt-2 font-semibold">No injections recorded yet</p>
            </div>
          )}
        </section>
        {actions.overdueActions.length ? (
          <div className="mt-8 rounded-2xl border border-rose-200 status-rest p-4 text-sm text-[color:var(--rest-ink)]">
            <p className="flex items-center gap-2 font-bold">
              <AlertTriangle className="size-4" />
              {actions.overdueActions.length} overdue injection
              {actions.overdueActions.length === 1 ? "" : "s"}
            </p>
            <p className="mt-1">
              Open the dashboard or calendar to resolve earlier scheduled
              administrations.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
