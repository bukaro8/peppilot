import type { Metadata } from "next";
import { Clock3, Filter, MapPin, Search } from "lucide-react";
import Link from "next/link";

import { HistoryBodyMap } from "@/components/injection/history-body-map";
import { InjectionDashboard } from "@/components/injection/injection-dashboard";
import { CalendarHeader } from "@/components/protocol-calendar/calendar-header";
import { LocalDateRedirect } from "@/components/protocol-calendar/local-date-redirect";
import { Button } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/session";
import {
  getDashboardInjectionActions,
  getInjectionHistory,
  getInjectionHistoryFilterOptions,
  type InjectionHistoryFilters,
  type InjectionStatus,
} from "@/lib/injection/service";
import { getInjectionSiteRotation } from "@/lib/injection/rotation-service";
import {
  formatInjectionSite,
  injectionSites,
  isInjectionSiteId,
} from "@/lib/injection/sites";
import { formatDoseAmount } from "@/lib/protocol-template/presentation";
import { parseCalendarDate } from "@/lib/protocol-calendar/service";

export const metadata: Metadata = { title: "Injection sites" };

type SearchParams = Record<string, string | string[] | undefined>;
const statusStyles = {
  completed: "status-positive text-[color:var(--positive-ink)]",
  skipped: "bg-slate-100 text-slate-700",
  missed: "status-rest text-[color:var(--rest-ink)]",
} as const;
const one = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;

function pageHref(query: SearchParams, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (typeof value === "string" && key !== "page" && value)
      params.set(key, value);
  params.set("page", String(page));
  return `/injections?${params}`;
}

export default async function InjectionHistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const actor = await requireActor();
  const query = await searchParams;
  if (one(query.view) !== "history") {
    const fallback = new Date().toISOString().slice(0, 10);
    let date = one(query.date) ?? fallback;
    try {
      parseCalendarDate(date);
    } catch {
      date = fallback;
    }
    const [actions, rotation, recentResult] = await Promise.all([
      getDashboardInjectionActions(actor, date),
      getInjectionSiteRotation(actor, date),
      getInjectionHistory(actor, { pageSize: 6, status: "completed" }),
    ]);
    return (
      <>
        {!one(query.date) ? <LocalDateRedirect path="/injections" /> : null}
        <CalendarHeader pendingCount={actions.pendingCount} />
        <InjectionDashboard
          actions={actions}
          date={date}
          recent={recentResult.records}
          recorded={one(query.recorded)}
          rotation={rotation}
        />
      </>
    );
  }
  const status = one(query.status);
  const site = one(query.site);
  const filters: InjectionHistoryFilters = {
    cycleId: one(query.cycle),
    dateFrom: one(query.from),
    dateTo: one(query.to),
    injectionSiteId: site && isInjectionSiteId(site) ? site : undefined,
    page: Number(one(query.page)) || 1,
    peptideId: one(query.peptide),
    query: one(query.q),
    sort: one(query.sort) === "asc" ? "asc" : "desc",
    status:
      status === "completed" || status === "skipped" || status === "missed"
        ? (status as InjectionStatus)
        : undefined,
  };
  const today = new Date().toISOString().slice(0, 10);
  const [history, options, rotation] = await Promise.all([
    getInjectionHistory(actor, filters),
    getInjectionHistoryFilterOptions(actor),
    getInjectionSiteRotation(actor, today),
  ]);
  const recentSites = (
    await getInjectionHistory(actor, { pageSize: 8, status: "completed" })
  ).records.filter((record) => record.injectionSiteId);

  return (
    <main className="min-h-screen bg-secondary/20">
      <CalendarHeader />
      <section className="mx-auto w-full max-w-7xl px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Private records
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">
              Injection history
            </h1>
            <p className="mt-3 text-muted-foreground">
              Scheduled details and the latest corrected record across every
              cycle.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/calendar/week">Open calendar</Link>
          </Button>
        </div>
        <form
          className="mt-8 rounded-2xl border bg-background p-4 shadow-sm"
          aria-label="Filter injection history"
        >
          <input type="hidden" name="view" value="history" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-semibold lg:col-span-2">
              Search
              <span className="relative mt-2 block">
                <Search
                  className="absolute left-3 top-3.5 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  name="q"
                  defaultValue={filters.query}
                  placeholder="Peptide, cycle or notes"
                  className="h-11 w-full rounded-xl border bg-background pl-10 pr-3 font-normal"
                />
              </span>
            </label>
            <label className="text-sm font-semibold">
              Peptide
              <select
                name="peptide"
                defaultValue={filters.peptideId ?? ""}
                className="mt-2 h-11 w-full rounded-xl border bg-background px-3 font-normal"
              >
                <option value="">All peptides</option>
                {options.peptides.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Cycle
              <select
                name="cycle"
                defaultValue={filters.cycleId ?? ""}
                className="mt-2 h-11 w-full rounded-xl border bg-background px-3 font-normal"
              >
                <option value="">All cycles</option>
                {options.cycles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              From
              <input
                name="from"
                type="date"
                defaultValue={filters.dateFrom}
                className="mt-2 h-11 w-full rounded-xl border bg-background px-3 font-normal"
              />
            </label>
            <label className="text-sm font-semibold">
              To
              <input
                name="to"
                type="date"
                defaultValue={filters.dateTo}
                className="mt-2 h-11 w-full rounded-xl border bg-background px-3 font-normal"
              />
            </label>
            <label className="text-sm font-semibold">
              Status
              <select
                name="status"
                defaultValue={filters.status ?? ""}
                className="mt-2 h-11 w-full rounded-xl border bg-background px-3 font-normal"
              >
                <option value="">All statuses</option>
                <option value="completed">Completed</option>
                <option value="skipped">Skipped</option>
                <option value="missed">Missed</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Body subzone
              <select
                name="site"
                defaultValue={filters.injectionSiteId ?? ""}
                className="mt-2 h-11 w-full rounded-xl border bg-background px-3 font-normal"
              >
                <option value="">All subzones</option>
                {injectionSites.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatInjectionSite(item.id)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Order
              <select
                name="sort"
                defaultValue={filters.sort}
                className="mt-2 h-11 w-full rounded-xl border bg-background px-3 font-normal"
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit">
              <Filter className="size-4" aria-hidden="true" />
              Apply filters
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/injections?view=history">Clear</Link>
            </Button>
          </div>
        </form>
        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section aria-labelledby="records-heading">
            <div className="flex items-baseline justify-between">
              <h2 id="records-heading" className="text-2xl font-bold">
                Records
              </h2>
              <p className="text-sm text-muted-foreground">
                {history.total} total
              </p>
            </div>
            {history.records.length ? (
              <div className="mt-4 space-y-3">
                {history.records.map((record) => (
                  <Link
                    key={record.id}
                    href={`/injections/${record.id}`}
                    className="block rounded-2xl border bg-background p-5 shadow-sm transition hover:border-primary/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold">{record.peptideName}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {record.cycleName}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[record.status]}`}
                      >
                        {record.status}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                      <p>
                        <span className="text-muted-foreground">
                          Scheduled:
                        </span>{" "}
                        {formatDoseAmount(record.scheduledDoseAmount)}{" "}
                        {record.scheduledDoseUnit} · {record.scheduledDate}{" "}
                        {record.scheduledTime ?? "Any time"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Actual:</span>{" "}
                        {record.status === "completed"
                          ? `${formatDoseAmount(record.actualDoseAmount ?? "")} ${record.actualDoseUnit} · ${record.actualDate} ${record.actualTime}`
                          : "No administered dose"}
                      </p>
                    </div>
                    {record.injectionSiteId ? (
                      <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                        <MapPin className="size-4" aria-hidden="true" />
                        {formatInjectionSite(record.injectionSiteId)}
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed bg-background p-10 text-center">
                <h3 className="font-bold">No matching records</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try changing or clearing the filters.
                </p>
              </div>
            )}
            {history.pageCount > 1 ? (
              <nav
                className="mt-5 flex items-center justify-between"
                aria-label="Injection history pages"
              >
                <Button
                  variant="outline"
                  asChild={history.page > 1}
                  disabled={history.page === 1}
                >
                  {history.page > 1 ? (
                    <Link href={pageHref(query, history.page - 1)}>
                      Previous
                    </Link>
                  ) : (
                    "Previous"
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Page {history.page} of {history.pageCount}
                </p>
                <Button
                  variant="outline"
                  asChild={history.page < history.pageCount}
                  disabled={history.page === history.pageCount}
                >
                  {history.page < history.pageCount ? (
                    <Link href={pageHref(query, history.page + 1)}>Next</Link>
                  ) : (
                    "Next"
                  )}
                </Button>
              </nav>
            ) : null}
          </section>
          <aside>
            <h2 className="text-2xl font-bold">Recent sites</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Combined activity across all protocols.
            </p>
            <div className="mt-4">
              <HistoryBodyMap rotation={rotation} />
            </div>
            <div className="mt-4 space-y-2">
              {recentSites.map((record) => (
                <Link
                  key={record.id}
                  href={`/injections/${record.id}`}
                  className="flex items-center justify-between rounded-xl border bg-background p-3 text-sm"
                >
                  <span className="font-semibold">
                    {formatInjectionSite(record.injectionSiteId)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="size-3" aria-hidden="true" />
                    {record.actualDate}
                  </span>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
