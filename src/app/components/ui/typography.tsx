import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const typographyVariants = cva(
  "text-foreground transition-colors",
  {
    variants: {
      variant: {
        h1: "text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight",
        h2: "text-lg sm:text-xl font-semibold tracking-tight",
        h3: "text-base sm:text-lg font-medium",
        body: "text-sm sm:text-base leading-normal",
        small: "text-xs font-medium leading-none",
        muted: "text-sm text-muted-foreground",
        label: "text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground",
        shares: "text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight",
      },
      color: {
        default: "text-foreground",
        muted: "text-muted-foreground",
        primary: "text-primary",
        white: "text-white",
        error: "text-destructive",
      }
    },
    defaultVariants: {
      variant: "body",
      color: "default",
    },
  }
);

interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: React.ElementType;
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, color, as, ...props }, ref) => {
    const Comp = as || (variant === "h1" ? "h1" : variant === "h2" ? "h2" : variant === "h3" ? "h3" : "p");
    return (
      <Comp
        className={cn(typographyVariants({ variant, color, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Typography.displayName = "Typography";

export { Typography, typographyVariants };
