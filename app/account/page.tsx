import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, FlaskConical, LockKeyhole, MapPin, ShieldCheck, UserRound } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { AnalyticsPreferenceForm } from "@/components/profile/analytics-preference-form";
import { InjectionSitePreferencesForm } from "@/components/injection/site-preferences-form";
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
    <main className="min-h-screen bg-secondary/30 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-start justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <FlaskConical className="size-5" aria-hidden="true" />
            </span>
            <span className="text-xl font-bold tracking-[-0.03em]">PepPilot</span>
          </Link>
          <SignOutButton />
        </header>

        <section className="mt-12 rounded-[2rem] border bg-background p-6 shadow-sm sm:p-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
                <UserRound className="size-6" aria-hidden="true" />
              </div>
              <h1 className="mt-6 text-3xl font-bold tracking-[-0.04em]">Your profile</h1>
              <p className="mt-3 max-w-xl leading-7 text-muted-foreground">
                Choose what visitors see on your public profile. Your username is permanent.
              </p>
            </div>
            <Button className="self-start" variant="outline" asChild>
              <Link href={`/u/${profile.username}`}>
                View public profile
                <ExternalLink className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

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

        <section className="mt-6 rounded-[2rem] border bg-background p-6 shadow-sm sm:p-9">
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

        <section className="mt-6 rounded-[2rem] border bg-background p-6 shadow-sm sm:p-9">
          <div className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><MapPin className="size-6" aria-hidden="true" /></div>
          <h2 className="mt-6 text-2xl font-bold tracking-[-0.035em]">Injection sites</h2>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Uncheck subzones you do not use. Rotation suggestions only consider enabled subzones; they remain history-based references, not suitability or safety guarantees.</p>
          <InjectionSitePreferencesForm disabledSiteIds={disabledSiteIds} />
        </section>
      </div>
    </main>
  );
}
