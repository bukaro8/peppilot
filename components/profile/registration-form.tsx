"use client";

import { useActionState } from "react";
import { AtSign, LoaderCircle } from "lucide-react";

import {
  completeRegistrationAction,
} from "@/app/account/actions";
import { Button } from "@/components/ui/button";
import { initialProfileActionState } from "@/lib/profile/action-state";

export function RegistrationForm() {
  const [state, action, pending] = useActionState(
    completeRegistrationAction,
    initialProfileActionState,
  );
  const hasUsernameError = state.status === "error" && state.field === "username";

  return (
    <form action={action} className="mt-8 space-y-5" aria-busy={pending}>
      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="username">
          Public username
        </label>
        <div className="relative">
          <AtSign
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9_]+"
            required
            disabled={pending}
            autoCapitalize="none"
            spellCheck={false}
            aria-describedby={`username-help${hasUsernameError ? " username-error" : ""}`}
            aria-invalid={hasUsernameError || undefined}
            className="h-12 w-full rounded-xl border border-border bg-background pl-11 pr-4 text-base outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50"
            placeholder="your_username"
          />
        </div>
        <p id="username-help" className="text-sm leading-6 text-muted-foreground">
          3–30 letters, numbers, or underscores. Usernames are public and cannot be changed.
        </p>
        {hasUsernameError ? (
          <p id="username-error" className="text-sm font-medium text-destructive" role="alert">
            {state.message}
          </p>
        ) : null}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border bg-secondary/35 p-4">
        <input
          id="registration-community-analytics"
          name="communityAnalyticsEnabled"
          type="checkbox"
          defaultChecked
          disabled={pending}
          aria-describedby="registration-community-analytics-help"
          className="mt-1 size-4 shrink-0 accent-primary"
        />
        <div>
          <label className="cursor-pointer text-sm font-semibold" htmlFor="registration-community-analytics">
            Contribute to community insights
          </label>
          <p id="registration-community-analytics-help" className="mt-1 text-sm leading-6 text-muted-foreground">
            Allow anonymised tracking measurements to contribute to grouped community statistics.
            PepPilot will never publish your individual measurements or identify you in aggregates. You
            can opt out now by unticking this box, or change this later in your account.
          </p>
        </div>
      </div>

      <Button className="w-full" size="lg" type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
        {pending ? "Checking username…" : "Complete registration"}
      </Button>
    </form>
  );
}
