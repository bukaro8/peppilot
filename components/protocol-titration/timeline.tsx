"use client";

import type { ReactNode } from "react";

export function TitrationTimeline({ children }: { children: ReactNode }) {
  return (
    <div className="relative space-y-4 before:absolute before:bottom-8 before:left-[1.15rem] before:top-8 before:w-px before:bg-primary/25 sm:before:left-[1.4rem]">
      {children}
    </div>
  );
}

export function TitrationStage({
  children,
  index,
  range,
}: {
  children: ReactNode;
  index: number;
  range: string;
}) {
  return (
    <section className="relative grid grid-cols-[2.3rem_minmax(0,1fr)] gap-3 sm:grid-cols-[2.8rem_minmax(0,1fr)] sm:gap-4">
      <div className="relative z-10 mt-5 flex size-9 items-center justify-center rounded-full border-4 border-background bg-primary text-sm font-bold text-primary-foreground shadow-sm sm:size-11">
        {index + 1}
      </div>
      <div className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-primary">
          {range}
        </p>
        {children}
      </div>
    </section>
  );
}
