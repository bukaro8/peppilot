import { requireActor } from "@/lib/auth/session";
import { ProtocolHeader } from "@/components/member-protocol/protocol-header";
import { Button } from "@/components/ui/button";
import { createPrivateCompoundAction } from "./actions";

export default async function NewCompoundPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireActor();
  const { error } = await searchParams;
  return <main><ProtocolHeader /><section className="mx-auto max-w-xl px-4 py-8"><h1 className="text-2xl font-bold">Private custom compound</h1><p className="my-3 text-sm text-muted-foreground">Only your account can use this compound. Next, set its doses, route and titration schedule.</p>{error ? <p role="alert" className="my-3 text-destructive">{error}</p> : null}<form action={createPrivateCompoundAction} className="space-y-4 rounded-2xl border bg-background p-5"><label className="block">Compound name<input name="name" required minLength={2} maxLength={100} className="mt-2 h-11 w-full rounded-xl border bg-background px-3" /></label><label className="block">Type<select name="kind" className="mt-2 h-11 w-full rounded-xl border bg-background px-3"><option value="peptide">Standalone compound</option><option value="blend">Blend</option></select></label><label className="block">Blend ingredients<textarea name="ingredients" rows={4} className="mt-2 w-full rounded-xl border bg-background p-3" placeholder="For blends, enter one ingredient per line" /></label><Button type="submit">Continue to protocol editor</Button></form></section></main>;
}
