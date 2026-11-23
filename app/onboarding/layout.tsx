import Link from "next/link";
import { AppBrand } from "@/components/brand/app-brand";
import { Button } from "@/components/ui/button";

export default function OnboardingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-secondary/20">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] bg-[radial-gradient(circle_at_78%_4%,oklch(0.91_0.07_83/.65),transparent_34%),radial-gradient(circle_at_3%_35%,oklch(0.86_0.08_292/.72),transparent_38%)]" />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8 lg:px-10">
        <AppBrand compact href="/onboarding" />
        <Button variant="ghost" size="sm" asChild><Link href="/dashboard">Save and exit</Link></Button>
      </header>
      {children}
    </main>
  );
}
