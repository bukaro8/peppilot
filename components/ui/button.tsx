import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-[background-color,color,box-shadow,transform] outline-none focus-visible:ring-3 focus-visible:ring-ring/45 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-[0_12px_25px_-14px_rgba(234,104,21,.9)] hover:from-orange-600 hover:to-orange-500",
        outline:
          "border border-violet-300 bg-background/75 text-violet-700 hover:bg-violet-50 dark:border-violet-300/35 dark:text-violet-200 dark:hover:bg-violet-300/10",
        ghost: "text-muted-foreground hover:bg-secondary hover:text-primary",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
