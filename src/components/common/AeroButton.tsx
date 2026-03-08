/**
 * AeroButton - Standardized button component for all Aeroverse tools
 * 
 * Provides consistent button styling, sizing, and hover effects.
 * 
 * Usage:
 * ```tsx
 * <AeroButton onClick={handleClick} icon={Icon}>
 *   Calculate
 * </AeroButton>
 * ```
 */

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AeroButtonProps extends Omit<ButtonProps, 'children' | 'variant'> {
  children: ReactNode;
  icon?: LucideIcon;
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'default' | 'link';
}

export function AeroButton({ 
  children, 
  icon: Icon, 
  variant = 'outline',
  className = '',
  ...props 
}: AeroButtonProps) {
  const variantClasses: Record<string, string> = {
    primary: 'bg-card border border-primary/40 text-foreground hover:border-primary/70 hover:text-foreground dark:hover:shadow-[0_0_20px_hsl(185_80%_50%/0.5),0_0_40px_hsl(185_80%_50%/0.25),inset_0_0_15px_hsl(185_80%_50%/0.1)]',
    outline: 'border border-primary/30 bg-card text-foreground hover:border-primary/70 hover:bg-accent dark:hover:shadow-[0_0_20px_hsl(185_80%_50%/0.5),0_0_40px_hsl(185_80%_50%/0.25),inset_0_0_15px_hsl(185_80%_50%/0.1)]',
    ghost: 'text-foreground hover:bg-primary/10 hover:text-foreground dark:hover:shadow-[0_0_15px_hsl(185_80%_50%/0.3)]',
  };

  // For variants like 'destructive', 'secondary', etc., pass them directly to Button
  const buttonVariant = variant && ['primary', 'outline', 'ghost'].includes(variant) ? undefined : variant;
  const customClassName = variant && ['primary', 'outline', 'ghost'].includes(variant) ? variantClasses[variant] : '';

  return (
    <Button
      variant={buttonVariant as "default" | "destructive" | "ghost" | "link" | "outline" | "secondary" | undefined}
      className={cn(
        'h-[42px] min-h-[44px] rounded-lg font-medium',
        customClassName,
        className
      )}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </Button>
  );
}

