"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";

import {
  updateCommunityAnalyticsPreferenceAction,
} from "@/app/account/actions";
import { Button } from "@/components/ui/button";
import { initialProfileActionState } from "@/lib/profile/action-state";

type AnalyticsPreferenceFormProps = {
  enabled: boolean;
};

export function AnalyticsPreferenceForm({ enabled }: AnalyticsPreferenceFormProps) {
  const [state, action, pending] = useActionState(
    updateCommunityAnalyticsPreferenceAction,
    initialProfileActionState,
  );

  return (
    <form action={action} className="mt-6 space-y-5" aria-busy={pending}>
      <div className="flex items-start gap-3 rounded-2xl border bg-muted/40 p-4">
        <input
          id="account-community-analytics"
          name="communityAnalyticsEnabled"
          type="checkbox"
          defaultChecked={enabled}
          disabled={pending}
          aria-describedby="account-community-analytics-help"
          className="mt-1 size-4 shrink-0 accent-primary"
        />
        <div>
          <label className="cursor-pointer text-sm font-semibold" htmlFor="account-community-analytics">
            Contribute to community insights
          </label>
          <p id="account-community-analytics-help" className="mt-1 text-sm leading-6 text-muted-foreground">
            Include eligible anonymised measurements in grouped community statistics. Public results
            never include your username or individual records.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {pending ? "Saving…" : "Save privacy preference"}
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
