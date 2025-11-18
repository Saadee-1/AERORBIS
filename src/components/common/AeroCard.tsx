/**
 * AeroCard - Standardized card component for all Aeroverse tools
 * 
 * Provides consistent card styling, padding, borders, and shadows
 * across all tools.
 * 
 * Usage:
 * ```tsx
 * <AeroCard title="Section Title" icon={Icon}>
 *   Card content here
 * </AeroCard>
 * ```
 */

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { typography } from '@/styles/typography';
import { spacingVertical } from '@/styles/spacing';

interface AeroCardProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  headerActions?: ReactNode;
}

export function AeroCard({ 
  title, 
  description, 
  icon: Icon, 
  children, 
  className = '',
  headerActions 
}: AeroCardProps) {
  return (
    <Card className={`bg-slate-800/50 backdrop-blur-lg border border-cyan-400/20 rounded-2xl ${className}`}>
      {(title || Icon) && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="w-5 h-5 text-cyan-400" />}
              {title && <CardTitle className={typography.cardTitle}>{title}</CardTitle>}
            </div>
            {headerActions}
          </div>
          {description && (
            <CardDescription className="text-gray-400">{description}</CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent className={spacingVertical.M}>
        {children}
      </CardContent>
    </Card>
  );
}

