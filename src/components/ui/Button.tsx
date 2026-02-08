"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-500 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40",
        secondary:
          "bg-emerald text-white hover:bg-emerald-800 focus-visible:ring-emerald shadow-lg shadow-emerald/25",
        outline:
          "border-2 border-emerald text-emerald hover:bg-emerald hover:text-white focus-visible:ring-emerald",
        "outline-white":
          "border-2 border-white text-white hover:bg-white hover:text-emerald focus-visible:ring-white",
        ghost:
          "text-emerald hover:bg-emerald-50 focus-visible:ring-emerald",
        link: "text-emerald underline-offset-4 hover:underline focus-visible:ring-emerald p-0 h-auto",
      },
      size: {
        sm: "h-10 px-4 text-xs sm:h-9", // Mobile: 40px (44px with padding), Desktop: 36px
        md: "h-12 px-6 text-sm sm:h-11", // Mobile: 48px (best for touch), Desktop: 44px
        lg: "h-13 px-8 text-base", // 52px - good for large CTAs
        xl: "h-14 px-10 text-lg", // 56px - extra large CTAs
        icon: "h-10 w-10 sm:h-9 sm:w-9", // Mobile: 40px, Desktop: 36px
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
