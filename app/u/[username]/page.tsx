import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRound } from "lucide-react";

import { AppBrand } from "@/components/brand/app-brand";
import { Button } from "@/components/ui/button";
import { getPublicProfileByUsername } from "@/lib/profile/service";

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);

  if (!profile?.username) {
    return { title: "Profile not found" };
  }

  return {
    title: profile.displayName ?? `@${profile.username}`,
    description: profile.bio ?? `View @${profile.username} on PepPilot.`,
  };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);

  if (!profile?.username) {
    notFound();
  }

  const initial = (profile.displayName ?? profile.username).charAt(0).toUpperCase();

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8 sm:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_75%_5%,oklch(0.91_0.07_83/.65),transparent_34%),radial-gradient(circle_at_5%_30%,oklch(0.86_0.08_292/.72),transparent_38%)]" />
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-4">
          <AppBrand compact />
          <Button variant="outline" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </header>

        <article className="mt-16 rounded-[2rem] border bg-card/90 p-6 shadow-[0_24px_70px_-32px_oklch(0.35_0.08_275/.4)] backdrop-blur sm:p-10">
          <div className="grid size-20 place-items-center rounded-3xl bg-primary text-3xl font-bold text-primary-foreground shadow-sm">
            {initial || <UserRound className="size-8" aria-hidden="true" />}
          </div>
          <h1 className="mt-7 text-4xl font-bold tracking-[-0.045em]">
            {profile.displayName ?? `@${profile.username}`}
          </h1>
          <p className="mt-2 font-semibold text-primary">@{profile.username}</p>
          {profile.bio ? (
            <p className="mt-7 whitespace-pre-wrap text-lg leading-8 text-muted-foreground">
              {profile.bio}
            </p>
          ) : (
            <p className="mt-7 text-muted-foreground">This member hasn&apos;t added a biography yet.</p>
          )}
        </article>
      </div>
    </main>
  );
}
