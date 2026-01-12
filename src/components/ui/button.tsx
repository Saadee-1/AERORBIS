import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-slate-900/80 border border-cyan-400/30 text-cyan-100 hover:border-cyan-400/60 hover:text-white hover:shadow-[0_0_15px_hsl(185_80%_50%/0.4),0_0_30px_hsl(185_80%_50%/0.2),inset_0_0_20px_hsl(185_80%_50%/0.1)]",
        destructive: "bg-destructive/80 border border-red-400/30 text-destructive-foreground hover:bg-destructive hover:border-red-400/60 hover:shadow-[0_0_15px_hsl(0_65%_50%/0.4),0_0_30px_hsl(0_65%_50%/0.2)]",
        outline: "border border-cyan-400/30 bg-slate-900/60 text-cyan-100 hover:border-cyan-400/70 hover:bg-slate-900/80 hover:text-white hover:shadow-[0_0_20px_hsl(185_80%_50%/0.5),0_0_40px_hsl(185_80%_50%/0.25),inset_0_0_15px_hsl(185_80%_50%/0.1)]",
        secondary: "bg-slate-800/60 border border-slate-600/40 text-slate-200 hover:border-cyan-400/40 hover:bg-slate-800/80 hover:shadow-[0_0_12px_hsl(185_80%_50%/0.3),0_0_24px_hsl(185_80%_50%/0.15)]",
        ghost: "text-cyan-100 hover:bg-cyan-400/10 hover:text-white hover:shadow-[0_0_15px_hsl(185_80%_50%/0.3)]",
        link: "text-cyan-400 underline-offset-4 hover:underline hover:text-cyan-300",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4",
        lg: "h-12 px-8",
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
