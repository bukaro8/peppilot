import type { Metadata } from "next";
import Link from "next/link";
import { FlaskConical } from "lucide-react";

import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
};

type SignInPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { error } = await searchParams;

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_5%,oklch(0.91_0.07_83/.65),transparent_34%),radial-gradient(circle_at_5%_70%,oklch(0.9_0.06_155/.75),transparent_38%)]" />
      <section className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-[0_24px_70px_-32px_oklch(0.35_0.08_165/.4)] backdrop-blur sm:p-9">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <FlaskConical className="size-5" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-[-0.03em]">PepPilot</span>
        </Link>

        <h1 className="mt-9 text-3xl font-bold tracking-[-0.04em]">Sign in or create an account</h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          No password needed. We&apos;ll send a one-time link to verify your email securely.
        </p>

        <SignInForm invalidLink={error === "invalid-link"} />
      </section>
    </main>
  );
}
