'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ColorField, SelectField, PropertyLabel } from '@/components/properties';
import { getPropertySchema } from '@/properties/registry';
import { Separator } from '@/components/ui/separator';

import { useLayoutStore } from '@/stores/layout';
import { useSelectionStore } from '@/stores/selection';
import { useProjectStore } from '@/stores/project';

interface PropertiesPanelProps { className?: string }

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ className = '' }) => {
  const propertiesPanelOpen = useLayoutStore((state) => state.propertiesPanelOpen);
  if (!propertiesPanelOpen) return null;
  return (
    <div className={`h-full w-full border-l bg-background flex flex-col min-h-0 ${className}`} data-testid="properties-panel">
      <div className="p-3 border-b text-xs font-medium text-muted-foreground">Properties</div>
      <div className="p-3 space-y-4 overflow-auto">
        <CampaignProperties />
        <MapProperties />
        <LayerPropertiesGeneric />
      </div>
    </div>
  );
};

export default PropertiesPanel;

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
        <Input value={project.name} onChange={(e) => rename(e.target.value)} placeholder="Untitled Campaign" aria-label="Campaign Name" />
      </div>
      <div>
        <FieldLabel label="Description" />
        <Textarea value={project.description ?? ''} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={5} aria-label="Campaign Description" />
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
  const map = project.maps.find((m) => m.id === selection.id); if (!map) return null;
  const resetPaper = () => { setMapPaperAspect(map.id, '16:10'); setMapPaperColor(map.id, '#ffffff'); };
  return (
    <Group title="Map" actions={<Button size="sm" variant="outline" onClick={resetPaper}>Reset Paper</Button>}>
      <div>
        <FieldLabel label="Title" />
        <Input value={map.name} onChange={(e) => renameMap(map.id, e.target.value)} placeholder="Untitled Map" aria-label="Map Title" />
      </div>
      <div>
        <FieldLabel label="Description" />
        <Textarea value={map.description ?? ''} onChange={(e) => setMapDescription(map.id, e.target.value)} placeholder="Optional description" rows={4} aria-label="Map Description" />
      </div>
      <div>
        <PropertyLabel text="Visibility" />
        <div className="mt-1">
          <Button variant={map.visible ? 'default' : 'outline'} size="sm" onClick={() => useProjectStore.getState().setMapVisibility(map.id, !map.visible)} aria-pressed={map.visible}>
            {map.visible ? 'Visible' : 'Hidden'}
          </Button>
        </div>
      </div>
    </Group>
  );
};

const LayerPropertiesGeneric: React.FC = () => {
  const selection = useSelectionStore((s) => s.selection);
  const project = useProjectStore((s) => s.current);
  const updateLayerState = useProjectStore((s) => s.updateLayerState);
  if (selection.kind !== 'layer' || !project) return null;
  const map = project.maps.find((m) => m.id === project.activeMapId); if (!map) return null;
  const layer = (map.layers ?? []).find((l) => l.id === selection.id); if (!layer) return null;
  const scope = `layer:${layer.type}`;
  const schema = getPropertySchema(scope); if (!schema) return null;
  const getVal = (path: string) => (layer.state as any)?.[path];
  const setVal = (path: string, val: any) => updateLayerState(layer.id, { [path]: val });
  return (
    <>
      {schema.groups.map((g) => (
        <Group key={g.id} title={g.title}>
          {g.rows.map((row, idx) => {
            const fields = Array.isArray(row) ? row : [row];
            return (
              <div key={idx} className={fields.length > 1 ? 'grid grid-cols-2 gap-2' : ''}>
                {fields.map((f) => {
                  if (f.kind === 'select') {
                    const v = getVal(f.path) ?? '';
                    return <SelectField key={f.id} label={f.label} value={v} options={(f as any).options} onChange={(val) => setVal(f.path, val)} />;
                  }
                  if (f.kind === 'color') {
                    const v = getVal(f.path) ?? '#ffffff';
                    return <ColorField key={f.id} label={f.label} value={v} onChange={(val) => setVal(f.path, val)} />;
                  }
                  if (f.kind === 'number') {
                    const v = Number(getVal(f.path) ?? 0);
                    return (
                      <div key={f.id}>
                        <FieldLabel label={f.label || f.id} />
                        <Input type="number" value={v} min={(f as any).min} max={(f as any).max} step={(f as any).step ?? 1} onChange={(e) => setVal(f.path, Number(e.target.value))} />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            );
          })}
        </Group>
      ))}
    </>
  );
};

