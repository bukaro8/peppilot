import {
  formatInjectionSite,
  injectionSites,
  type InjectionSiteId,
} from "@/lib/injection/sites";

export type InjectionSiteHistoryItem = {
  actualDate: string;
  actualTime: string;
  injectionSiteId: InjectionSiteId;
  recordId: string;
};

export type InjectionSiteActivity = "earlier" | "neutral" | "recent" | "suggested";

export type InjectionSiteRotation = {
  activity: Record<InjectionSiteId, InjectionSiteActivity>;
  reason: string;
  suggestedSiteId: InjectionSiteId | null;
  suggestionLabel: string | null;
};

function dateValue(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function calendarDaysSince(laterDate: string, earlierDate: string) {
  return Math.floor((dateValue(laterDate) - dateValue(earlierDate)) / 86_400_000);
}

export function calculateInjectionSiteRotation({
  asOfDate,
  candidateSiteIds,
  history,
}: {
  asOfDate: string;
  candidateSiteIds: InjectionSiteId[];
  history: InjectionSiteHistoryItem[];
}): InjectionSiteRotation {
  const order = new Map(injectionSites.map((site, index) => [site.id, index]));
  const candidates = [...new Set(candidateSiteIds)].filter((id) => order.has(id));
  const usage = new Map<InjectionSiteId, { count: number; lastUsed: string }>();

  for (const item of history) {
    const timestamp = `${item.actualDate}T${item.actualTime}`;
    const current = usage.get(item.injectionSiteId);
    usage.set(item.injectionSiteId, {
      count: (current?.count ?? 0) + 1,
      lastUsed: !current || timestamp > current.lastUsed ? timestamp : current.lastUsed,
    });
  }

  candidates.sort((left, right) => {
    const leftUsage = usage.get(left);
    const rightUsage = usage.get(right);
    if (!leftUsage && rightUsage) return -1;
    if (leftUsage && !rightUsage) return 1;
    if (leftUsage && rightUsage) {
      const recency = leftUsage.lastUsed.localeCompare(rightUsage.lastUsed);
      if (recency !== 0) return recency;
      if (leftUsage.count !== rightUsage.count) return leftUsage.count - rightUsage.count;
    }
    return (order.get(left) ?? 0) - (order.get(right) ?? 0);
  });

  const suggestedSiteId = candidates[0] ?? null;
  const activity = Object.fromEntries(
    injectionSites.map((site) => {
      const lastDate = usage.get(site.id)?.lastUsed.slice(0, 10);
      const days = lastDate ? calendarDaysSince(asOfDate, lastDate) : null;
      let state: InjectionSiteActivity = "neutral";
      if (days === 0) state = "recent";
      else if (days !== null && days >= 1 && days <= 2) state = "earlier";
      if (site.id === suggestedSiteId) state = "suggested";
      return [site.id, state];
    }),
  ) as Record<InjectionSiteId, InjectionSiteActivity>;

  if (!suggestedSiteId) {
    return {
      activity,
      reason: "No enabled subzones are available. Enable a suitable site in account settings or leave the site unspecified.",
      suggestedSiteId: null,
      suggestionLabel: null,
    };
  }

  const suggestedUsage = usage.get(suggestedSiteId);
  const reason = suggestedUsage
    ? `Least recently used enabled subzone. Last recorded ${suggestedUsage.lastUsed.slice(0, 10)}; used ${suggestedUsage.count} time${suggestedUsage.count === 1 ? "" : "s"}.`
    : "No completed injection is recorded at this enabled subzone.";
  return {
    activity,
    reason,
    suggestedSiteId,
    suggestionLabel: formatInjectionSite(suggestedSiteId),
  };
}
