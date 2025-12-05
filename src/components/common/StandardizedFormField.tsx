/**
 * Standardized Form Field Component
 * Unified input field component for all tools
 */

"use client";

import { ReactNode } from 'react';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { validatePositiveNumber, validateFiniteNumber, sanitizeNumber } from '@/lib/validation';

export interface StandardizedFormFieldProps {
  label: string;
  value: any;
  onChange: (value: any) => void;
  type?: 'text' | 'number' | 'select' | 'textarea' | 'switch' | 'slider';
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  validation?: {
    type: 'positive' | 'finite';
    min?: number;
    max?: number;
  };
  error?: string;
  helpText?: string;
  compact?: boolean;
}

export function StandardizedFormField({
  label,
  value,
  onChange,
  type = 'number',
  unit,
  min,
  max,
  step,
  options,
  placeholder,
  disabled = false,
  required = false,
  validation,
  error,
  helpText,
  compact = false,
}: StandardizedFormFieldProps) {
  const handleChange = (newValue: any) => {
    if (type === 'number' && validation) {
      const sanitized = sanitizeNumber(newValue, value || 0);
      if (validation.type === 'positive') {
        const error = validatePositiveNumber(sanitized, label, validation.min, validation.max);
        if (error) {
          // Still allow change but could show error
          onChange(sanitized);
          return;
        }
      } else if (validation.type === 'finite') {
        const error = validateFiniteNumber(sanitized, label);
        if (error) {
          onChange(sanitized);
          return;
        }
      }
      onChange(sanitized);
    } else {
      onChange(newValue);
    }
  };

  const renderInput = () => {
    switch (type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="bg-slate-700/50 border-cyan-400/30 text-white"
          />
        );
      
      case 'number':
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={value ?? ''}
              onChange={(e) => handleChange(e.target.value)}
              min={min}
              max={max}
              step={step}
              placeholder={placeholder}
              disabled={disabled}
              className="bg-slate-700/50 border-cyan-400/30 text-white"
            />
            {unit && <span className="text-sm text-gray-400">{unit}</span>}
          </div>
        );
      
      case 'select':
        return (
          <Select value={value} onValueChange={handleChange} disabled={disabled}>
            <SelectTrigger className="bg-slate-700/50 border-cyan-400/30 text-white">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="bg-slate-700/50 border-cyan-400/30 text-white"
            rows={compact ? 2 : 4}
          />
        );
      
      case 'switch':
        return (
          <Switch
            checked={value || false}
            onCheckedChange={handleChange}
            disabled={disabled}
          />
        );
      
      case 'slider':
        return (
          <div className="space-y-2">
            <Slider
              value={[value ?? min ?? 0]}
              onValueChange={([val]) => handleChange(val)}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>{min ?? 0}</span>
              <span className="text-cyan-400 font-bold">{value ?? min ?? 0} {unit}</span>
              <span>{max ?? 100}</span>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <AeroFormField
      label={label}
      required={required}
      error={error}
      helperText={helpText}
    >
      {renderInput()}
    </AeroFormField>
  );
}
