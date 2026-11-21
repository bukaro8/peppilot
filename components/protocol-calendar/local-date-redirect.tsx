"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LocalDateRedirect({ path }: { path: string }) {
  const router = useRouter();
  useEffect(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60_000;
    const date = new Date(now.valueOf() - offset).toISOString().slice(0, 10);
    router.replace(`${path}${path.includes("?") ? "&" : "?"}date=${date}`);
  }, [path, router]);
  return null;
}
