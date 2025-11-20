/**
 * AeroFormField - Standardized form field component
 * 
 * Provides consistent layout for labels, inputs, and helper text
 * across all tools.
 * 
 * Usage:
 * ```tsx
 * <AeroFormField label="Mass (kg)" helperText="Enter mass in kilograms">
 *   <Input value={mass} onChange={handleChange} />
 * </AeroFormField>
 * ```
 */

import { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { typography } from '@/styles/typography';
import { spacingVertical } from '@/styles/spacing';

interface AeroFormFieldProps {
  label: string;
  children: ReactNode;
  helperText?: string;
  error?: string;
  required?: boolean;
  className?: string;
  htmlFor?: string; // Optional htmlFor for label
}

export function AeroFormField({ 
  label, 
  children, 
  helperText, 
  error,
  required = false,
  className = '',
  htmlFor
}: AeroFormFieldProps) {
  return (
    <div className={`${spacingVertical.S} ${className}`}>
      <Label htmlFor={htmlFor || label} className={typography.label}>
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </Label>
      {children}
      {helperText && !error && (
        <p className={typography.small}>{helperText}</p>
      )}
      {error && (
        <p className={`${typography.small} text-red-400`}>{error}</p>
      )}
    </div>
  );
}

