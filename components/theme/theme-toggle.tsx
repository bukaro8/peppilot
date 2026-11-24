"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("peppilot-theme-change", callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener("peppilot-theme-change", callback); window.removeEventListener("storage", callback); };
}

export function ThemeToggle({ inverse = false }: { inverse?: boolean }) {
  const preference = useSyncExternalStore(subscribe, () => localStorage.getItem("peppilot-theme") ?? "auto", () => "auto");
  function toggle(next: string) {
    const resolved = next === "auto" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : next;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    localStorage.setItem("peppilot-theme", next);
    window.dispatchEvent(new Event("peppilot-theme-change"));
  }

  return <label className={`flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 text-sm font-semibold ${inverse ? "border-white/20 bg-white/10 text-white" : "bg-card text-foreground"}`}>Appearance<select aria-label="Colour theme" value={preference} onChange={(event) => toggle(event.target.value)} className="min-h-11 rounded-lg bg-background px-2 text-foreground"><option value="auto">Auto</option><option value="light">Light</option><option value="dark">Dark</option></select></label>;
}
