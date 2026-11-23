"use client";

import { useState } from "react";
import { LoaderCircle, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { authClient } from "@/lib/auth-client";

type SignInFormProps = {
  authError?: "invalid-link" | "unexpected";
  returnTo?: string;
};

type Feedback = {
  text: string;
  tone: "error" | "success";
};

export function SignInForm({ authError, returnTo = "/account" }: SignInFormProps) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | undefined>(
    authError === "invalid-link"
      ? { text: "This login link has expired or has already been used.", tone: "error" }
      : authError === "unexpected"
        ? { text: "We couldn’t complete sign-in. Request a new login link below.", tone: "error" }
        : undefined,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFeedback(undefined);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    try {
      const result = await authClient.signIn.magicLink({
        email,
        callbackURL: returnTo,
        newUserCallbackURL: "/account",
        errorCallbackURL: `/sign-in?error=invalid-link&next=${encodeURIComponent(returnTo)}`,
      });

      if (result.error?.status === 429) {
        setFeedback({
          text: "Too many requests. Please wait a minute before trying again.",
          tone: "error",
        });
        return;
      }

      if (result.error) {
        setFeedback({
          text: "We couldn’t send a link right now. Please try again.",
          tone: "error",
        });
        return;
      }

      setFeedback({
        text: "If that address can receive email, a secure sign-in link is on its way. The link expires in 10 minutes.",
        tone: "success",
      });
    } catch {
      setFeedback({
        text: "We couldn’t send a link right now. Check your connection and try again.",
        tone: "error",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit} aria-busy={pending}>
      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="email">
          Email address
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            disabled={pending}
            aria-describedby={feedback ? "sign-in-feedback" : undefined}
            aria-invalid={feedback?.tone === "error" || undefined}
            placeholder="you@example.com"
            className="h-12 w-full rounded-xl border border-border bg-background pl-11 pr-4 text-base outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50"
          />
        </div>
      </div>

      <Button className="w-full" size="lg" type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
        {pending ? "Sending link…" : "Email me a sign-in link"}
      </Button>

      {feedback ? (
        <FormMessage id="sign-in-feedback" tone={feedback.tone}>
          {feedback.text}
        </FormMessage>
      ) : null}
    </form>
  );
}
