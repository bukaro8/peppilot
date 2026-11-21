"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";

import {
  updateProfileAction,
} from "@/app/account/actions";
import { Button } from "@/components/ui/button";
import { initialProfileActionState } from "@/lib/profile/action-state";

type ProfileFormProps = {
  displayName: string | null;
  bio: string | null;
};

export function ProfileForm({ displayName, bio }: ProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfileAction, initialProfileActionState);
  const displayNameError = state.status === "error" && state.field === "displayName";
  const bioError = state.status === "error" && state.field === "bio";

  return (
    <form action={action} className="mt-8 space-y-6" aria-busy={pending}>
      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="displayName">
          Display name <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="name"
          maxLength={60}
          defaultValue={displayName ?? ""}
          disabled={pending}
          aria-describedby={displayNameError ? "display-name-error" : undefined}
          aria-invalid={displayNameError || undefined}
          className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50"
        />
        {displayNameError ? (
          <p id="display-name-error" className="text-sm font-medium text-destructive" role="alert">
            {state.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <label className="text-sm font-semibold" htmlFor="bio">
            Biography <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <span className="text-xs text-muted-foreground">280 characters max</span>
        </div>
        <textarea
          id="bio"
          name="bio"
          rows={5}
          maxLength={280}
          defaultValue={bio ?? ""}
          disabled={pending}
          aria-describedby={bioError ? "bio-error" : "bio-help"}
          aria-invalid={bioError || undefined}
          className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-base leading-7 outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50"
          placeholder="A short introduction for your public profile."
        />
        <p id="bio-help" className="sr-only">Maximum 280 characters.</p>
        {bioError ? (
          <p id="bio-error" className="text-sm font-medium text-destructive" role="alert">
            {state.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {pending ? "Saving…" : "Save public profile"}
        </Button>
        {state.status === "success" ? (
          <p className="text-sm font-medium text-primary" role="status">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
