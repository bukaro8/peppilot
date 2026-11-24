import { AlertTriangle, CheckCircle2, CircleDashed, Clock3, SkipForward, XCircle } from "lucide-react";
import Link from "next/link";

import type { DashboardInjectionAction } from "@/lib/injection/service";
import type { ScheduledProtocolEvent } from "@/lib/protocol-calendar/service";
import { formatDoseAmount } from "@/lib/protocol-template/presentation";

const statusStyles = {
  completed: "status-positive text-[color:var(--positive-ink)]",
  missed: "status-rest text-[color:var(--rest-ink)]",
  overdue: "status-rest text-[color:var(--rest-ink)]",
  pending: "status-caution text-[color:var(--caution-ink)]",
  skipped: "bg-slate-100 text-slate-700",
} as const;

function StatusIcon({ state }: { state: DashboardInjectionAction["state"] }) {
  if (state === "completed") return <CheckCircle2 className="size-3" aria-hidden="true" />;
  if (state === "skipped") return <SkipForward className="size-3" aria-hidden="true" />;
  if (state === "missed") return <XCircle className="size-3" aria-hidden="true" />;
  if (state === "overdue") return <AlertTriangle className="size-3" aria-hidden="true" />;
  return <CircleDashed className="size-3" aria-hidden="true" />;
}

export function ScheduleEventCard({ action, event, compact = false }: { action?: DashboardInjectionAction; event: ScheduledProtocolEvent; compact?: boolean }) {
  const href = action?.record ? `/injections/${action.record.id}` : `/injections/new?occurrence=${encodeURIComponent(event.id)}`;
  return (
    <Link href={href} className={`block rounded-xl border border-primary/10 bg-background shadow-sm transition hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 ${compact ? "p-3" : "p-4"}`}>
      <div className={compact ? "flex flex-col gap-1" : "flex items-start justify-between gap-3"}>
        <div className="min-w-0"><p className={compact ? "text-sm font-semibold leading-5" : "font-semibold"}>{event.peptideName}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{event.cycleName}</p></div>
        <p className="shrink-0 text-sm font-semibold text-primary">{formatDoseAmount(event.doseAmount)} {event.doseUnit}</p>
      </div>
      {action ? <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold capitalize ${statusStyles[action.state]}`}><StatusIcon state={action.state} />{action.state}</span> : null}
      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-3.5" aria-hidden="true" />{event.timeOfDay ?? "Any time"}</p>
      {action?.record?.status === "completed" ? <p className="mt-1 text-xs text-muted-foreground">Actual: {formatDoseAmount(action.record.actualDoseAmount ?? action.record.scheduledDoseAmount)} {action.record.actualDoseUnit ?? action.record.scheduledDoseUnit} · {action.record.actualDate} {action.record.actualTime}</p> : null}
    </Link>
  );
}
