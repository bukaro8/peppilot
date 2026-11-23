import Link from "next/link";
import { headers } from "next/headers";
import { AppBrand } from "@/components/brand/app-brand";
import { AppNavigation } from "@/components/navigation/app-navigation";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { getAuthenticatedActor } from "@/lib/auth/authorization";

export async function CatalogueHeader() {
  const authenticated = Boolean(await getAuthenticatedActor(await headers()));
  return (
    <header className="app-topbar mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
      <div className={authenticated ? "lg:hidden" : undefined}><AppBrand compact href={authenticated ? "/dashboard" : "/"} /></div>
      {authenticated ? <AppNavigation /> : <div className="flex items-center gap-2"><ThemeToggle /><Button variant="outline" size="sm" asChild>
        <Link href="/sign-in">Sign in</Link>
      </Button></div>}
    </header>
  );
}
