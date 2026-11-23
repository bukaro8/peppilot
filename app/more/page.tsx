import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarRange, ClipboardList, MapPinned, Settings, Target } from "lucide-react";

import { CalendarHeader } from "@/components/protocol-calendar/calendar-header";
import { Button } from "@/components/ui/button";
import { requireCompletedProfile } from "@/lib/auth/session";
import { getProtocolCycles } from "@/lib/protocol-cycle/service";

export const metadata: Metadata = { title: "More" };

const destinations = [
  { description: "Browse all approved protocol options.", href: "/templates", icon: BookOpen, label: "Protocol library" },
  { description: "Create and manage private schedules.", href: "/protocols", icon: ClipboardList, label: "My protocols" },
  { description: "Review active and historical cycles.", href: "/cycles", icon: CalendarRange, label: "My cycles" },
  { description: "Browse the implemented peptide catalogue.", href: "/catalogue", icon: BookOpen, label: "Peptide library" },
  { description: "Manage enabled injection subzones.", href: "/account#injection-sites", icon: MapPinned, label: "Body map" },
  { description: "Profile, privacy and guided setup.", href: "/account", icon: Settings, label: "Account settings" },
];

export default async function MorePage() {
  const { actor } = await requireCompletedProfile();
  const cycles = await getProtocolCycles(actor);
  return (
    <main className="min-h-screen bg-secondary/20">
      <CalendarHeader />
      <section className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-8 sm:pt-8 md:pb-16 lg:px-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Explore PepPilot</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] sm:text-5xl">More</h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Everything you need beyond today&apos;s quick actions.</p>
        <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2">{destinations.map(({ description, href, icon: Icon, label }) => <Link key={href} href={href} className="group rounded-2xl border bg-background p-4 shadow-sm transition hover:border-primary/30 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 sm:p-5"><Icon className="size-5 text-primary sm:size-6" aria-hidden="true" /><h2 className="mt-3 text-lg font-bold sm:mt-4 sm:text-xl">{label}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground sm:mt-2">{description}</p></Link>)}</div>
        <section className="mt-9 rounded-[2rem] border bg-background p-6 shadow-sm" aria-labelledby="goals-heading"><Target className="size-7 text-primary" aria-hidden="true" /><h2 id="goals-heading" className="mt-4 text-2xl font-bold">Cycle goals</h2>{cycles.length ? <><p className="mt-2 text-sm text-muted-foreground">Goals are independent for each cycle. Choose one to review or update its goals.</p><div className="mt-5 flex flex-wrap gap-2">{cycles.map((cycle) => <Button key={cycle.id} variant="outline" asChild><Link href={`/cycles/${cycle.id}/goals`}>{cycle.name}</Link></Button>)}</div></> : <><p className="mt-2 text-sm text-muted-foreground">Start a cycle before setting cycle-specific goals.</p><Button className="mt-5" asChild><Link href="/onboarding">Create your first protocol</Link></Button></>}</section>
      </section>
    </main>
  );
}
