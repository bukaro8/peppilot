import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FlaskConical, UserRoundCheck } from "lucide-react";

import { RegistrationForm } from "@/components/profile/registration-form";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { requireActor } from "@/lib/auth/session";
import { getPrivateProfile } from "@/lib/profile/service";

export const metadata: Metadata = {
  title: "Choose your username",
};

export default async function RegistrationPage() {
  const actor = await requireActor();
  const profile = await getPrivateProfile(actor.userId);

  if (profile?.username) {
    redirect("/account");
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_5%,oklch(0.91_0.07_83/.65),transparent_34%),radial-gradient(circle_at_5%_70%,oklch(0.86_0.08_292/.72),transparent_38%)]" />
      <section className="w-full max-w-2xl rounded-[2rem] border bg-card/90 p-6 shadow-[0_24px_70px_-32px_oklch(0.35_0.08_275/.4)] backdrop-blur sm:p-9">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <FlaskConical className="size-5" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-[-0.03em]">PepPilot</span>
        </Link>

        <div className="mt-9"><OnboardingProgress currentStep={1} /></div>
        <div className="mt-8 grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
          <UserRoundCheck className="size-6" aria-hidden="true" />
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-primary">Step 1 of 5</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em]">Choose your public username</h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          This is how you&apos;ll appear on public PepPilot pages. Your email remains private.
        </p>

        <RegistrationForm />
      </section>
    </main>
  );
}
