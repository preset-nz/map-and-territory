'use client';

/**
 * PropertiesPanel - Simplified Stable Version
 * 
 * A simplified properties panel that avoids infinite re-renders
 * by using static content and minimal dynamic updates.
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ColorField, SelectField, PropertyLabel } from '@/components/properties';
import { Separator } from '@/components/ui/separator';

import { useLayoutStore } from '@/stores/layout';
import { useSelectionStore } from '@/stores/selection';
import { useProjectStore } from '@/stores/project';

// Icons
import {
  Settings,
  Palette,
  Layers,
  MousePointer2,
} from 'lucide-react';

// ============================================================================
// PropertiesPanel Component
// ============================================================================

interface PropertiesPanelProps {
  className?: string;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  className = '',
}) => {
  const propertiesPanelOpen = useLayoutStore((state) => state.propertiesPanelOpen);
  
  if (!propertiesPanelOpen) {
    return null;
  }
  
  return (
    <div className={`h-full w-full border-l bg-background flex flex-col min-h-0 ${className}`} data-testid="properties-panel">
      <div className="p-3 border-b text-xs font-medium text-muted-foreground">Properties</div>
      <div className="p-3 space-y-4 overflow-auto">
        <CampaignProperties />
        <MapProperties />
        <PaperLayerProperties />
      </div>
    </div>
  );
};

export default PropertiesPanel;

// ============================================================================
// Widgets - MVP
// ============================================================================

const FieldLabel: React.FC<{ label: string }> = ({ label }) => (
  <div className="text-xs text-foreground mb-1">{label}</div>
);

const Group: React.FC<{ title: string; children: React.ReactNode; actions?: React.ReactNode }> = ({ title, children, actions }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <div className="text-[11px] uppercase tracking-wide text-foreground">{title}</div>
      {actions}
    </div>
    <div className="space-y-3">{children}</div>
    <Separator className="my-3" />
  </div>
);

// ============================================================================
// Campaign Properties
// ============================================================================

const CampaignProperties: React.FC = () => {
  const selection = useSelectionStore((s) => s.selection);
  const project = useProjectStore((s) => s.current);
  const rename = useProjectStore((s) => s.rename);
  const setDescription = useProjectStore((s) => s.setDescription);

  if (selection.kind !== 'campaign' || !project) return null;

  return (
    <Group title="Campaign">
      <div>
        <FieldLabel label="Name" />
        <Input
          value={project.name}
          onChange={(e) => rename(e.target.value)}
          placeholder="Untitled Campaign"
          aria-label="Campaign Name"
        />
      </div>
      <div>
        <FieldLabel label="Description" />
        <Textarea
          value={project.description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          rows={5}
          aria-label="Campaign Description"
        />
      </div>
    </Group>
  );
};

const MapProperties: React.FC = () => {
  const selection = useSelectionStore((s) => s.selection);
  const project = useProjectStore((s) => s.current);
  const renameMap = useProjectStore((s) => s.renameMap);
  const setMapDescription = useProjectStore((s) => s.setMapDescription);
  const setMapPaperAspect = useProjectStore((s) => s.setMapPaperAspect);
  const setMapPaperColor = useProjectStore((s) => s.setMapPaperColor);

  if (selection.kind !== 'map' || !project) return null;
  const map = project.maps.find((m) => m.id === selection.id);
  if (!map) return null;

  const resetPaper = () => {
    setMapPaperAspect(map.id, '16:10');
    setMapPaperColor(map.id, '#ffffff');
  };

  return (
    <Group title="Map" actions={<Button size="sm" variant="outline" onClick={resetPaper}>Reset Paper</Button>}>
      <div>
        <FieldLabel label="Title" />
        <Input
          value={map.name}
          onChange={(e) => renameMap(map.id, e.target.value)}
          placeholder="Untitled Map"
          aria-label="Map Title"
        />
      </div>
      <div>
        <FieldLabel label="Description" />
        <Textarea
          value={map.description ?? ''}
          onChange={(e) => setMapDescription(map.id, e.target.value)}
          placeholder="Optional description"
          rows={4}
          aria-label="Map Description"
        />
      </div>
      {/* Paper controls moved to Paper layer */}
      <div>
        <PropertyLabel text="Visibility" />
        <div className="mt-1">
          <Button
            variant={map.visible ? 'default' : 'outline'}
            size="sm"
            onClick={() => useProjectStore.getState().setMapVisibility(map.id, !map.visible)}
            aria-pressed={map.visible}
          >
            {map.visible ? 'Visible' : 'Hidden'}
          </Button>
        </div>
      </div>
    </Group>
  );
};

const PaperLayerProperties: React.FC = () => {
  const selection = useSelectionStore((s) => s.selection);
  const project = useProjectStore((s) => s.current);
  const updateLayerState = useProjectStore((s) => s.updateLayerState);
  if (selection.kind !== 'layer' || !project) return null;
  const map = project.maps.find((m) => m.id === project.activeMapId);
  if (!map) return null;
  const layer = (map.layers ?? []).find((l) => l.id === selection.id);
  if (!layer || layer.type !== 'paper') return null;
  const st = layer.state as any;
  const aspect = st?.aspect ?? '16:10';
  const color = st?.color ?? '#ffffff';
  const reset = () => updateLayerState(layer.id, { aspect: '16:10', color: '#ffffff' });
  return (
    <Group title="Paper" actions={<Button size="sm" variant="outline" onClick={reset}>Reset</Button>}>
      <SelectField
        label="Aspect Ratio"
        value={aspect}
        options={[
          { value: 'square', label: 'Square (1:1)' },
          { value: '4:3', label: '4:3' },
          { value: '16:10', label: '16:10' },
        ]}
        onChange={(v) => updateLayerState(layer.id, { aspect: v })}
      />
      <ColorField label="Color" value={color} onChange={(v) => updateLayerState(layer.id, { color: v })} />
    </Group>
  );
};
