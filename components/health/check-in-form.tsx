"use client";

import { useActionState } from "react";
import Link from "next/link";

import type { CheckInActionState } from "@/app/journal/check-ins/actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import type { CheckInQuestionId } from "@/lib/health/check-in-questions";
import type { SymptomPromptStatus } from "@/lib/health/check-in-service";

export function CheckInForm({ action, answers, date, questions, symptomCount, symptomStatus }: {
  action: (state: CheckInActionState, formData: FormData) => Promise<CheckInActionState>;
  answers: Partial<Record<CheckInQuestionId, number>>;
  date: string;
  questions: Array<{ core: boolean; id: CheckInQuestionId; label: string; prompt: string }>;
  symptomCount: number;
  symptomStatus: SymptomPromptStatus;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" } satisfies CheckInActionState);
  return <form action={formAction} className="space-y-8" aria-busy={pending}><fieldset disabled={pending} className="space-y-5"><legend className="sr-only">Daily scores</legend>{questions.map((question) => <label key={question.id} className="block rounded-2xl border bg-muted/20 p-4"><span className="font-semibold">{question.label}{!question.core ? <span className="ml-2 text-xs font-normal text-muted-foreground">Optional</span> : null}</span><span className="mt-1 block text-sm text-muted-foreground">{question.prompt}</span><span className="mt-3 flex items-center gap-3"><select name={`score.${question.id}`} required={question.core} defaultValue={answers[question.id] ?? ""} className="h-12 min-w-28 rounded-xl border bg-background px-4"><option value="">Skip</option>{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select><span className="text-xs text-muted-foreground">1 low · 10 high</span></span></label>)}</fieldset>
    <fieldset disabled={pending} className="rounded-2xl border p-5"><legend className="px-1 font-semibold">Symptoms today <span className="font-normal text-muted-foreground">(optional)</span></legend>{symptomCount ? <><input type="hidden" name="symptomStatus" value="symptoms_recorded" /><p className="text-sm text-muted-foreground">{symptomCount} symptom record{symptomCount === 1 ? "" : "s"} attached to this date.</p></> : <div className="space-y-3 text-sm"><label className="flex items-center gap-3"><input type="radio" name="symptomStatus" value="not_answered" defaultChecked={symptomStatus !== "no_symptoms"} />Prefer not to answer</label><label className="flex items-center gap-3"><input type="radio" name="symptomStatus" value="no_symptoms" defaultChecked={symptomStatus === "no_symptoms"} />No symptoms to report</label></div>}<Button className="mt-4" variant="outline" size="sm" asChild><Link href={`/journal/symptoms/new?date=${date}`}>Record a symptom</Link></Button></fieldset>
    {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}<Button type="submit" size="lg" disabled={pending}>{pending ? "Saving…" : "Save daily check-in"}</Button></form>;
}
