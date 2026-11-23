import Link from "next/link";
import { AppBrand } from "@/components/brand/app-brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";

export function CatalogueHeader() {
  return (
    <header className="app-topbar mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
      <AppBrand compact />
      <div className="flex items-center gap-2"><ThemeToggle /><Button variant="outline" size="sm" asChild>
        <Link href="/sign-in">Sign in</Link>
      </Button></div>
    </header>
  );
}
