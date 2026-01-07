import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80 shadow-[0_0_10px_hsl(185_80%_50%/0.4),0_0_20px_hsl(185_80%_50%/0.2)] hover:shadow-[0_0_15px_hsl(185_80%_50%/0.5),0_0_30px_hsl(185_80%_50%/0.3)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80 shadow-[0_0_10px_hsl(0_65%_50%/0.4)] hover:shadow-[0_0_15px_hsl(0_65%_50%/0.5)]",
        outline: "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground shadow-[0_0_8px_hsl(185_80%_50%/0.3)] hover:shadow-[0_0_12px_hsl(185_80%_50%/0.4),0_0_24px_hsl(185_80%_50%/0.2)]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70 shadow-[0_0_8px_hsl(185_80%_50%/0.25)] hover:shadow-[0_0_12px_hsl(185_80%_50%/0.35)]",
        ghost: "hover:bg-accent/50 hover:text-accent-foreground hover:shadow-[0_0_10px_hsl(185_80%_50%/0.3)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
