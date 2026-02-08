import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-emerald-50 text-emerald border border-emerald-200",
        iso: "bg-blue-50 text-blue-700 border border-blue-200",
        gmp: "bg-purple-50 text-purple-700 border border-purple-200",
        fssai: "bg-green-50 text-green-700 border border-green-200",
        halal: "bg-teal-50 text-teal-700 border border-teal-200",
        fda: "bg-red-50 text-red-700 border border-red-200",
        export: "bg-amber-50 text-amber-700 border border-amber-200",
        category:
          "bg-emerald/10 text-emerald border border-emerald/20 text-[11px] uppercase tracking-wider font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}

export { Badge, badgeVariants };
