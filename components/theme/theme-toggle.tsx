"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ inverse = false }: { inverse?: boolean }) {
  function toggle() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem("peppilot-theme", next);
  }

  return <button type="button" onClick={toggle} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45 ${inverse ? "border-white/15 bg-white/10 text-white hover:bg-white/15" : "bg-card text-foreground hover:bg-secondary"}`} aria-label="Toggle colour theme">
    <Moon className="size-4 dark:hidden" aria-hidden="true" />
    <Sun className="hidden size-4 dark:block" aria-hidden="true" />
    <span className="dark:hidden">Dark mode</span>
    <span className="hidden dark:inline">Light mode</span>
  </button>;
}
