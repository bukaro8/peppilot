import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function AppBrand({ compact = false, href = "/", inverse = false }: { compact?: boolean; href?: string; inverse?: boolean }) {
  return <Link href={href} aria-label="PepPilot home" className={cn("inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45", inverse && "text-white")}>
    <Image src="/icons/peppilot-192.png" alt="" width={48} height={48} className={cn("size-11 rounded-[0.9rem] shadow-lg", compact && "size-10")} priority />
    <span className={cn("text-2xl font-extrabold tracking-[-0.045em]", compact && "text-xl")}><span>Pep</span><span className="text-orange-400">Pilot</span></span>
  </Link>;
}
