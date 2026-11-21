import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";

import { InjectionSitePreferencesForm } from "@/components/injection/site-preferences-form";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { Button } from "@/components/ui/button";
import { requireCompletedProfile } from "@/lib/auth/session";
import { getDisabledInjectionSiteIds } from "@/lib/injection/rotation-service";

export const metadata: Metadata = { title: "Choose injection sites" };

export default async function OnboardingSitesPage() {
  const { actor } = await requireCompletedProfile();
  const disabledSiteIds = await getDisabledInjectionSiteIds(actor);
  return (
    <section className="mx-auto w-full max-w-4xl px-5 pb-16 pt-4 sm:px-8 lg:px-10">
      <OnboardingProgress currentStep={2} />
      <div className="mt-8 rounded-[2rem] border bg-background p-5 shadow-sm sm:p-9">
        <div className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><MapPin className="size-6" aria-hidden="true" /></div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-primary">Step 2 of 5</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Choose the sites you use</h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Enable or disable body subzones now. PepPilot uses these preferences when showing history-based rotation suggestions, and you can change them later.</p>
        <InjectionSitePreferencesForm disabledSiteIds={disabledSiteIds} continueHref="/onboarding/protocols" />
        <div className="mt-6 border-t pt-5"><Button variant="ghost" size="sm" asChild><Link href="/account"><ArrowLeft className="size-4" aria-hidden="true" />Back to account</Link></Button></div>
      </div>
    </section>
  );
}
