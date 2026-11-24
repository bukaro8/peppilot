import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { createInjectionRecordAction } from "@/app/injections/actions";
import { InjectionRecordForm } from "@/components/injection/injection-record-form";
import { QuickInjectionForm } from "@/components/injection/quick-injection-form";
import { CalendarHeader } from "@/components/protocol-calendar/calendar-header";
import { Button } from "@/components/ui/button";
import { requireActor } from "@/lib/auth/session";
import { getInjectionSiteRotation } from "@/lib/injection/rotation-service";
import {
  getDashboardInjectionActions,
  getInjectionRecordForOccurrence,
  getScheduledOccurrence,
  InjectionRecordError,
} from "@/lib/injection/service";
import { isInjectionSiteId } from "@/lib/injection/sites";
import { parseCalendarDate } from "@/lib/protocol-calendar/service";
import { formatDoseAmount } from "@/lib/protocol-template/presentation";

export const metadata: Metadata = { title: "Quick log injection" };

type Search = {
  date?: string;
  occurrence?: string;
  site?: string;
  status?: string;
};

export default async function NewInjectionPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const actor = await requireActor();
  const query = await searchParams;
  const fallback = new Date().toISOString().slice(0, 10);
  let date = query.date ?? fallback;
  try {
    parseCalendarDate(date);
  } catch {
    date = fallback;
  }
  const initialSiteId =
    query.site && isInjectionSiteId(query.site) ? query.site : null;
  const occurrenceId = query.occurrence ?? null;

  if (occurrenceId) {
    const existing = await getInjectionRecordForOccurrence(actor, occurrenceId);
    if (existing) redirect(`/injections/${existing.id}`);
  }

  let selectedEvent = null;
  if (occurrenceId) {
    try {
      selectedEvent = await getScheduledOccurrence(actor, occurrenceId);
    } catch (error) {
      if (error instanceof InjectionRecordError) notFound();
      throw error;
    }
  }
  const dashboard = await getDashboardInjectionActions(actor, date);
  const options = dashboard.todayActions
    .filter((action) => !action.record)
    .map((action) => action.event);
  if (
    selectedEvent &&
    !options.some((option) => option.id === selectedEvent.id)
  )
    options.unshift(selectedEvent);
  const rotation = await getInjectionSiteRotation(actor, date);

  if (query.status === "skipped" || query.status === "missed") {
    if (!selectedEvent || !occurrenceId) notFound();
    const action = createInjectionRecordAction.bind(null, occurrenceId);
    return (
      <main className="min-h-screen bg-secondary/20">
        <CalendarHeader />
        <section className="mx-auto w-full max-w-3xl px-4 pb-16 pt-5 sm:px-8 sm:pt-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/injections?date=${date}`}>
              <ArrowLeft className="size-4" />
              Back to injection sites
            </Link>
          </Button>
          <div className="mt-4 rounded-2xl border bg-background p-5 shadow-sm sm:mt-6 sm:rounded-[2rem] sm:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Scheduled injection
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              Update {selectedEvent.peptideName}
            </h1>
            <div className="mt-5 rounded-2xl border bg-muted/30 p-4">
              <p className="font-semibold">
                Planned {formatDoseAmount(selectedEvent.doseAmount)}{" "}
                {selectedEvent.doseUnit}
              </p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="size-4" />
                {selectedEvent.date} · {selectedEvent.timeOfDay ?? "Any time"}
              </p>
            </div>
            <div className="mt-6">
              <InjectionRecordForm
                action={action}
                submitLabel="Save injection status"
                rotation={rotation}
                initial={{
                  actualDate: selectedEvent.date,
                  actualDoseAmount: selectedEvent.doseAmount,
                  actualDoseUnit: selectedEvent.doseUnit,
                  actualTime: selectedEvent.timeOfDay ?? "",
                  actualVolumeMl: "",
                  injectionSiteId: null,
                  notes: "",
                  status: query.status,
                }}
              />
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-secondary/20">
      <CalendarHeader />
      <section className="mx-auto w-full max-w-4xl px-4 pb-24 pt-5 sm:px-8 sm:pt-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/injections?date=${date}#site-dashboard`}>
            <ArrowLeft className="size-4" />
            Back to injection sites
          </Link>
        </Button>
        <div className="mt-4 rounded-2xl border bg-background p-5 shadow-sm sm:mt-6 sm:rounded-[2rem] sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Quick log
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
            Quick Log
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Choose the protocol and anatomical site, then log. Known schedule
            details are already filled in.
          </p>
          <div className="mt-7">
            <QuickInjectionForm
              dashboardDate={date}
              initialOccurrenceId={occurrenceId}
              initialSiteId={initialSiteId}
              options={options}
              rotation={rotation}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
