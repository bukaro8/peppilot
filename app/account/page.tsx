import type { Metadata } from "next";
import Link from "next/link";
import { Compass, ExternalLink, LockKeyhole, MapPin, ShieldCheck, UserRound } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { AnalyticsPreferenceForm } from "@/components/profile/analytics-preference-form";
import { InjectionSitePreferencesForm } from "@/components/injection/site-preferences-form";
import { CalendarHeader } from "@/components/protocol-calendar/calendar-header";
import { ProfileForm } from "@/components/profile/profile-form";
import { Button } from "@/components/ui/button";
import { requireCompletedProfile } from "@/lib/auth/session";
import { getDisabledInjectionSiteIds } from "@/lib/injection/rotation-service";

export const metadata: Metadata = {
  title: "Account profile",
};

export default async function AccountPage() {
  const { actor, profile } = await requireCompletedProfile();
  const disabledSiteIds = await getDisabledInjectionSiteIds(actor);

  return (
    <main className="min-h-screen bg-secondary/20">
      <CalendarHeader />
      <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div><div className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary"><UserRound className="size-7" aria-hidden="true" /></div><h1 className="mt-5 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">Your profile</h1><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Choose what visitors see on your public profile. Your username is permanent.</p></div><div className="flex flex-col gap-2 sm:flex-row"><Button variant="outline" asChild><Link href={`/u/${profile.username}`}><ExternalLink className="size-4" />View public profile</Link></Button><Button asChild><Link href="/onboarding"><Compass className="size-4" />Guided setup</Link></Button></div></header>

        <section id="profile" className="mt-8 scroll-mt-6 rounded-[2rem] border bg-background p-6 shadow-sm sm:p-9">

          <dl className="mt-8 grid gap-4 rounded-2xl border bg-muted/40 p-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Public username
              </dt>
              <dd className="mt-1 font-medium">@{profile.username}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <LockKeyhole className="size-3.5" aria-hidden="true" />
                Private email
              </dt>
              <dd className="mt-1 break-all font-medium">{profile.email}</dd>
            </div>
          </dl>

          <ProfileForm displayName={profile.displayName} bio={profile.bio} />
        </section>

        <section id="settings" className="mt-6 scroll-mt-6 rounded-[2rem] border bg-background p-6 shadow-sm sm:p-9">
          <div className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
            <ShieldCheck className="size-6" aria-hidden="true" />
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-[-0.035em]">Privacy preference</h2>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
            Changes apply to the next daily community aggregation. Opting out also marks any cached
            aggregate containing your contributions for recalculation.
          </p>
          <AnalyticsPreferenceForm enabled={profile.communityAnalyticsEnabled} />
        </section>

        <section id="injection-sites" className="mt-6 scroll-mt-6 rounded-[2rem] border bg-background p-6 shadow-sm sm:p-9">
          <div className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><MapPin className="size-6" aria-hidden="true" /></div>
          <h2 className="mt-6 text-2xl font-bold tracking-[-0.035em]">Injection sites</h2>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Uncheck subzones you do not use. Rotation suggestions only consider enabled subzones; they remain history-based references, not suitability or safety guarantees.</p>
          <InjectionSitePreferencesForm disabledSiteIds={disabledSiteIds} />
        </section>
        <div className="mt-6 flex justify-end"><SignOutButton /></div>
      </div>
    </main>
  );
}
