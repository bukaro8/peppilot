import { CircleAlert, CircleCheck } from "lucide-react";

import { cn } from "@/lib/utils";

type FormMessageProps = {
  children: React.ReactNode;
  id?: string;
  tone: "error" | "success";
};

export function FormMessage({ children, id, tone }: FormMessageProps) {
  const Icon = tone === "error" ? CircleAlert : CircleCheck;

  return (
    <p
      id={id}
      className={cn(
        "flex items-start gap-2 rounded-xl px-4 py-3 text-sm leading-6",
        tone === "error"
          ? "bg-destructive/10 font-medium text-destructive"
          : "bg-secondary/70 text-secondary-foreground",
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon className="mt-1 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
