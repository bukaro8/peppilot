import Link from "next/link";
import { headers } from "next/headers";
import { AppBrand } from "@/components/brand/app-brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { AppNavigation } from "@/components/navigation/app-navigation";
import { getAuthenticatedActor } from "@/lib/auth/authorization";

type TemplateHeaderProps = { admin?: boolean; onboarding?: boolean };

export async function TemplateHeader({ admin = false, onboarding = false }: TemplateHeaderProps) {
  const authenticated = onboarding || admin || Boolean(await getAuthenticatedActor(await headers()));
  return (
    <header className="app-topbar mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
      <div className={authenticated ? "lg:hidden" : undefined}><AppBrand compact href={authenticated ? "/dashboard" : "/"} /></div>
      {authenticated ? <AppNavigation /> : <nav className="flex items-center gap-2" aria-label="Template navigation">
        <ThemeToggle />
        <Button variant="ghost" size="sm" asChild><Link href="/templates">Templates</Link></Button>
        <Button variant="outline" size="sm" asChild><Link href="/sign-in">Sign in</Link></Button>
      </nav>}
    </header>
  );
}
