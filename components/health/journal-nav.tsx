import Link from "next/link";

import { Button } from "@/components/ui/button";

export function JournalNav() {
  return <nav className="mx-auto flex w-full max-w-5xl flex-wrap gap-2 px-5 sm:px-8 lg:px-10" aria-label="Health journal"><Button variant="outline" size="sm" asChild><Link href="/journal">Overview</Link></Button><Button variant="outline" size="sm" asChild><Link href="/journal/measurements">Measurements</Link></Button><Button variant="outline" size="sm" asChild><Link href="/journal/check-ins">Daily check-ins</Link></Button><Button variant="outline" size="sm" asChild><Link href="/journal/symptoms">Symptoms</Link></Button></nav>;
}
