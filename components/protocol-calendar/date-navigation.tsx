"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function DateNavigation({
  next,
  previous,
  selected,
  view,
}: {
  next: string;
  previous: string;
  selected: string;
  view: "week" | "month";
}) {
  const path = `/calendar/${view}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon" asChild><Link href={`${path}?date=${previous}`} aria-label={`Previous ${view}`}><ChevronLeft className="size-4" /></Link></Button>
      <form action={path} className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`${view}-date`}>Choose date</label>
        <input id={`${view}-date`} name="date" type="date" defaultValue={selected} className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
        <Button type="submit" variant="outline" size="sm">Go</Button>
      </form>
      <Button variant="outline" size="icon" asChild><Link href={`${path}?date=${next}`} aria-label={`Next ${view}`}><ChevronRight className="size-4" /></Link></Button>
      <Button variant="ghost" size="sm" asChild><Link href={path}>Today</Link></Button>
    </div>
  );
}
