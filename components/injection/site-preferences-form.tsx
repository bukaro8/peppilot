"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";

import {
  updateInjectionSitePreferencesAction,
  type InjectionSitePreferenceActionState,
} from "@/app/account/actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { injectionSites, type InjectionSiteId } from "@/lib/injection/sites";

export function InjectionSitePreferencesForm({
  disabledSiteIds,
}: {
  disabledSiteIds: InjectionSiteId[];
}) {
  const [state, action, pending] = useActionState(
    updateInjectionSitePreferencesAction,
    { status: "idle" } satisfies InjectionSitePreferenceActionState,
  );
  const disabled = new Set(disabledSiteIds);
  const regions = [...new Set(injectionSites.map((site) => site.region))];

  return (
    <form action={action} className="mt-6 space-y-5" aria-busy={pending}>
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">Enabled injection subzones</legend>
        {regions.map((region) => <section key={region} className="rounded-2xl border bg-muted/25 p-4"><h3 className="font-semibold">{region}</h3><div className="mt-3 space-y-2">{injectionSites.filter((site) => site.region === region).map((site) => <label key={site.id} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm hover:bg-background"><input type="checkbox" name="enabledSiteIds" value={site.id} defaultChecked={!disabled.has(site.id)} className="size-4 accent-primary" /><span>{site.subzone}</span></label>)}</div></section>)}
      </fieldset>
      {state.message ? <FormMessage tone={state.status === "error" ? "error" : "success"}>{state.message}</FormMessage> : null}
      <Button type="submit" disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}{pending ? "Saving…" : "Save injection sites"}</Button>
    </form>
  );
}
