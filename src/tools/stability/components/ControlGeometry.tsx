"use client";

/**
 * Control Geometry Panel
 * 
 * Allows users to specify control surface geometry for enhanced calculations
 */

import { AeroCard } from '@/components/common/AeroCard';
import { AeroFormField } from '@/components/forms/AeroFormField';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2 } from 'lucide-react';
import { ControlGeometry } from '../utils/calcControlDerivatives';

interface ControlGeometryProps {
  elevatorGeometry?: ControlGeometry;
  aileronGeometry?: ControlGeometry;
  rudderGeometry?: ControlGeometry;
  onGeometryChange: (surface: 'elevator' | 'aileron' | 'rudder', geometry: Partial<ControlGeometry>) => void;
}

export function ControlGeometryPanel({
  elevatorGeometry,
  aileronGeometry,
  rudderGeometry,
  onGeometryChange,
}: ControlGeometryProps) {
  return (
    <AeroCard title="Control Surface Geometry" icon={Settings2}>
      <Tabs defaultValue="elevator" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="elevator">Elevator</TabsTrigger>
          <TabsTrigger value="aileron">Aileron</TabsTrigger>
          <TabsTrigger value="rudder">Rudder</TabsTrigger>
        </TabsList>

        <TabsContent value="elevator" className="space-y-4">
          <AeroFormField label="Span Fraction" helperText="Elevator span / horizontal tail span">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={elevatorGeometry?.span_fraction || 0.8}
              onChange={(e) =>
                onGeometryChange('elevator', {
                  ...elevatorGeometry,
                  span_fraction: parseFloat(e.target.value) || 0.8,
                })
              }
            />
          </AeroFormField>

          <AeroFormField label="Chord Fraction" helperText="Elevator chord / horizontal tail chord">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={elevatorGeometry?.chord_fraction || 0.3}
              onChange={(e) =>
                onGeometryChange('elevator', {
                  ...elevatorGeometry,
                  chord_fraction: parseFloat(e.target.value) || 0.3,
                })
              }
            />
          </AeroFormField>

          <AeroFormField label="Hinge Line Position" helperText="Hinge position as fraction of chord">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={elevatorGeometry?.hinge_line_position || 0.7}
              onChange={(e) =>
                onGeometryChange('elevator', {
                  ...elevatorGeometry,
                  hinge_line_position: parseFloat(e.target.value) || 0.7,
                })
              }
            />
          </AeroFormField>

          <AeroFormField label="Aerodynamic Balance" helperText="Balance type">
            <Select
              value={elevatorGeometry?.balance_type || 'unbalanced'}
              onValueChange={(value) =>
                onGeometryChange('elevator', {
                  ...elevatorGeometry,
                  balance_type: value as 'unbalanced' | 'horn' | 'overhang',
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unbalanced">Unbalanced</SelectItem>
                <SelectItem value="horn">Horn Balance</SelectItem>
                <SelectItem value="overhang">Overhang Balance</SelectItem>
              </SelectContent>
            </Select>
          </AeroFormField>
        </TabsContent>

        <TabsContent value="aileron" className="space-y-4">
          <AeroFormField label="Span Fraction" helperText="Aileron span / wing span">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={aileronGeometry?.span_fraction || 0.3}
              onChange={(e) =>
                onGeometryChange('aileron', {
                  ...aileronGeometry,
                  span_fraction: parseFloat(e.target.value) || 0.3,
                })
              }
            />
          </AeroFormField>

          <AeroFormField label="Chord Fraction" helperText="Aileron chord / wing chord">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={aileronGeometry?.chord_fraction || 0.25}
              onChange={(e) =>
                onGeometryChange('aileron', {
                  ...aileronGeometry,
                  chord_fraction: parseFloat(e.target.value) || 0.25,
                })
              }
            />
          </AeroFormField>

          <AeroFormField label="Hinge Line Position" helperText="Hinge position as fraction of chord">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={aileronGeometry?.hinge_line_position || 0.75}
              onChange={(e) =>
                onGeometryChange('aileron', {
                  ...aileronGeometry,
                  hinge_line_position: parseFloat(e.target.value) || 0.75,
                })
              }
            />
          </AeroFormField>

          <AeroFormField label="Aerodynamic Balance" helperText="Balance type">
            <Select
              value={aileronGeometry?.balance_type || 'unbalanced'}
              onValueChange={(value) =>
                onGeometryChange('aileron', {
                  ...aileronGeometry,
                  balance_type: value as 'unbalanced' | 'horn' | 'overhang',
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unbalanced">Unbalanced</SelectItem>
                <SelectItem value="horn">Horn Balance</SelectItem>
                <SelectItem value="overhang">Overhang Balance</SelectItem>
              </SelectContent>
            </Select>
          </AeroFormField>
        </TabsContent>

        <TabsContent value="rudder" className="space-y-4">
          <AeroFormField label="Span Fraction" helperText="Rudder span / vertical tail span">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={rudderGeometry?.span_fraction || 0.8}
              onChange={(e) =>
                onGeometryChange('rudder', {
                  ...rudderGeometry,
                  span_fraction: parseFloat(e.target.value) || 0.8,
                })
              }
            />
          </AeroFormField>

          <AeroFormField label="Chord Fraction" helperText="Rudder chord / vertical tail chord">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={rudderGeometry?.chord_fraction || 0.3}
              onChange={(e) =>
                onGeometryChange('rudder', {
                  ...rudderGeometry,
                  chord_fraction: parseFloat(e.target.value) || 0.3,
                })
              }
            />
          </AeroFormField>

          <AeroFormField label="Hinge Line Position" helperText="Hinge position as fraction of chord">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={rudderGeometry?.hinge_line_position || 0.7}
              onChange={(e) =>
                onGeometryChange('rudder', {
                  ...rudderGeometry,
                  hinge_line_position: parseFloat(e.target.value) || 0.7,
                })
              }
            />
          </AeroFormField>

          <AeroFormField label="Aerodynamic Balance" helperText="Balance type">
            <Select
              value={rudderGeometry?.balance_type || 'unbalanced'}
              onValueChange={(value) =>
                onGeometryChange('rudder', {
                  ...rudderGeometry,
                  balance_type: value as 'unbalanced' | 'horn' | 'overhang',
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unbalanced">Unbalanced</SelectItem>
                <SelectItem value="horn">Horn Balance</SelectItem>
                <SelectItem value="overhang">Overhang Balance</SelectItem>
              </SelectContent>
            </Select>
          </AeroFormField>
        </TabsContent>
      </Tabs>
    </AeroCard>
  );
}
