import Link from "next/link";
import { FlaskConical } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CycleHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8 lg:px-10">
      <Link href="/" className="inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><FlaskConical className="size-5" aria-hidden="true" /></span><span className="text-xl font-bold tracking-[-0.03em]">PepPilot</span></Link>
      <nav className="flex items-center gap-1" aria-label="Cycle navigation"><Button variant="ghost" size="sm" asChild><Link href="/cycles">My cycles</Link></Button><Button variant="outline" size="sm" asChild><Link href="/protocols">Protocols</Link></Button></nav>
    </header>
  );
}
