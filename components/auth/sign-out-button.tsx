"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function signOut() {
    setPending(true);
    setError(false);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setError(true);
        return;
      }

      router.replace("/sign-in");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button variant="outline" onClick={signOut} disabled={pending} aria-busy={pending}>
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      {error ? <p className="text-xs font-medium text-destructive" role="alert">Couldn’t sign out. Try again.</p> : null}
    </div>
  );
}
