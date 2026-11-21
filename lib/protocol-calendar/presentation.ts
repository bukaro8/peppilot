export function formatCalendarDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00.000Z`),
  );
}

export function groupEventsByDate<T extends { date: string }>(events: T[]) {
  const grouped = new Map<string, T[]>();
  for (const event of events) grouped.set(event.date, [...(grouped.get(event.date) ?? []), event]);
  return grouped;
}
