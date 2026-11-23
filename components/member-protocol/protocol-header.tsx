import { AppBrand } from "@/components/brand/app-brand";
import { AppNavigation } from "@/components/navigation/app-navigation";

export function ProtocolHeader() {
  return (
    <header className="app-topbar mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8 lg:px-10">
      <div className="lg:hidden"><AppBrand compact href="/dashboard" /></div>
      <AppNavigation />
    </header>
  );
}
