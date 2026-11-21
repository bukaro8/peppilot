import { Check } from "lucide-react";

const steps = ["Account", "Sites", "Protocols", "Cycles", "Dashboard"];

export function OnboardingProgress({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Onboarding progress">
      <ol className="grid grid-cols-5 gap-1 sm:gap-3">
        {steps.map((label, index) => {
          const step = index + 1;
          const complete = step < currentStep;
          const current = step === currentStep;
          return (
            <li key={label} className="min-w-0 text-center" aria-current={current ? "step" : undefined}>
              <div className="flex items-center" aria-hidden="true">
                <span className={`h-0.5 flex-1 ${step === 1 ? "bg-transparent" : complete || current ? "bg-primary" : "bg-border"}`} />
                <span className={`grid size-9 shrink-0 place-items-center rounded-full border-2 text-xs font-bold transition sm:size-10 ${complete ? "border-primary bg-primary text-primary-foreground" : current ? "border-primary bg-background text-primary shadow-sm" : "border-border bg-muted text-muted-foreground"}`}>
                  {complete ? <Check className="size-4" /> : step}
                </span>
                <span className={`h-0.5 flex-1 ${step === steps.length ? "bg-transparent" : complete ? "bg-primary" : "bg-border"}`} />
              </div>
              <span className={`mt-2 block truncate text-[11px] font-semibold sm:text-xs ${current ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
