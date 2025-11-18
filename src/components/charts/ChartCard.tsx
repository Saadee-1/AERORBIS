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
 *       Chart components here
 *     </LineChart>
 *   </ResponsiveContainer>
 * </ChartCard>
 * ```
 */

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { AeroCard } from '@/components/common/AeroCard';

interface ChartCardProps {
  title: string;
  children: ReactNode;
  description?: string;
  className?: string;
  height?: number;
  headerActions?: ReactNode;
  icon?: LucideIcon;
}

export function ChartCard({ 
  title, 
  children, 
  description,
  className = '',
  height = 350,
  headerActions,
  icon
}: ChartCardProps) {
  return (
    <AeroCard title={title} description={description} className={className} headerActions={headerActions} icon={icon}>
      <div style={{ height: `${height}px` }} className="w-full">
        {children}
      </div>
    </AeroCard>
  );
}

