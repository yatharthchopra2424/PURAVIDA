"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The one button for the public site.
 *
 * - Sizes are real pixel heights (Tailwind 3 has no `h-13`; the old lg
 *   size silently collapsed every large CTA to its text height).
 * - Primary and secondary get a light sweep on hover (`btn-shine`).
 * - `loading` swaps the label for a spinner without changing the width,
 *   so the layout doesn't jump while a form submits.
 * - Text never wraps (`whitespace-nowrap`), and a 44px minimum touch
 *   target is kept on phones.
 */
const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary:
          "btn-shine bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/40 focus-visible:ring-orange-500",
        secondary:
          "btn-shine bg-emerald text-white shadow-lg shadow-emerald/25 hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-xl hover:shadow-emerald/35 focus-visible:ring-emerald",
        // A bare 2px outline on a pale background reads as disabled.
        // A tinted fill plus a shadow keeps it clearly a secondary
        // action while still looking pressable.
        outline:
          "border-2 border-emerald bg-emerald-50/70 text-emerald-700 shadow-sm hover:-translate-y-0.5 hover:bg-emerald hover:text-white hover:shadow-lg hover:shadow-emerald/25 focus-visible:ring-emerald",
        "outline-white":
          "border-2 border-white text-white hover:bg-white hover:text-emerald focus-visible:ring-white",
        ghost: "text-emerald hover:bg-emerald-50 focus-visible:ring-emerald",
        link: "h-auto rounded-none p-0 text-emerald underline-offset-4 hover:underline focus-visible:ring-emerald",
      },
      size: {
        sm: "h-11 px-4 text-xs sm:h-9",
        md: "h-12 px-6 text-sm sm:h-11",
        lg: "h-[3.25rem] px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-11 w-11 sm:h-9 sm:w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner and disables the button, keeping its width. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, className }), "relative");

    // asChild passes the styling to a link; loading doesn't apply there.
    if (asChild) {
      return (
        <Slot className={classes} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }
    return (
      <button className={classes} ref={ref} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
        <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center" role="status" aria-label="Loading">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          </span>
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
