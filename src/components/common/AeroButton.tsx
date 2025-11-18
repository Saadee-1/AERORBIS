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
    primary: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-900 font-semibold hover:from-cyan-600 hover:to-blue-600',
    outline: 'border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10',
    ghost: 'text-cyan-400 hover:bg-cyan-400/10',
  };

  // For variants like 'destructive', 'secondary', etc., pass them directly to Button
  const buttonVariant = variant && ['primary', 'outline', 'ghost'].includes(variant) ? undefined : variant;
  const customClassName = variant && ['primary', 'outline', 'ghost'].includes(variant) ? variantClasses[variant] : '';

  return (
    <Button
      variant={buttonVariant as any}
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

