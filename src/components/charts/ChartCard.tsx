/**
 * ChartCard - Standardized chart wrapper component
 * 
 * Provides consistent chart container with title, padding, and height.
 * 
 * Usage:
 * ```tsx
 * <ChartCard title="Lift vs Drag">
 *   <ResponsiveContainer width="100%" height={350}>
 *     <LineChart data={data}>
 *       {/* Chart components */}
 *     </LineChart>
 *   </ResponsiveContainer>
 * </ChartCard>
 * ```
 */

import { ReactNode } from 'react';
import { AeroCard } from '@/components/common/AeroCard';
import { typography } from '@/styles/typography';

interface ChartCardProps {
  title: string;
  children: ReactNode;
  description?: string;
  className?: string;
  height?: number;
  headerActions?: ReactNode;
}

export function ChartCard({ 
  title, 
  children, 
  description,
  className = '',
  height = 350,
  headerActions
}: ChartCardProps) {
  return (
    <AeroCard title={title} description={description} className={className} headerActions={headerActions}>
      <div style={{ height: `${height}px` }} className="w-full">
        {children}
      </div>
    </AeroCard>
  );
}

