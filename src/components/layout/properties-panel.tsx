"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ColorField, SelectField } from "@/components/properties";
import { Slider } from "@/components/ui/slider";
import { getPropertySchema } from "@/properties/registry";
import { Separator } from "@/components/ui/separator";

import { useLayoutStore } from "@/stores/layout";
import { useSelectionStore } from "@/stores/selection";
import { useProjectStore } from "@/stores/project";
import { TerrainSettings } from "@/palettes/settings";
import { AppAPI } from "@/appapi";
import { executeCommand } from "@/lib/commands";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PropertiesPanelProps {
  className?: string;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  className = "",
}) => {
  const propertiesPanelOpen = useLayoutStore(
    (state) => state.propertiesPanelOpen,
  );
  if (!propertiesPanelOpen) return null;
  return (
    <div
      className={`h-full w-full border-l bg-background flex flex-col min-h-0 ${className}`}
      data-testid="properties-panel"
    >
      <div className="p-3 border-b text-xs font-medium text-muted-foreground">
        Properties
      </div>
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

const Group: React.FC<{
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ title, children, actions }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <div className="text-[11px] uppercase tracking-wide text-foreground">
        {title}
      </div>
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
  if (selection.kind !== "campaign" || !project) return null;
  const settings = TerrainSettings.getAllSettings();
  const selectedId = project.settingId ?? "doom-forge";
  const options = settings.map((s) => ({ label: s.name, value: s.id }));
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
          value={project.description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          rows={5}
          aria-label="Campaign Description"
        />
      </div>
      <div>
        <FieldLabel label="Setting (Palette)" />
        <SelectField
          label="Setting"
          value={selectedId}
          options={options}
          onChange={(val) => {
            void executeCommand("app.palette.setCampaignSetting", {
              settingId: val,
            });
          }}
        />
        <PalettePreview settingId={selectedId} />
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
  if (selection.kind !== "map" || !project) return null;
  const map = project.maps.find((m) => m.id === selection.id);
  if (!map) return null;
  const resetPaper = () => {
    setMapPaperAspect(map.id, "16:10");
    setMapPaperColor(map.id, "#ffffff");
  };
  const settings = TerrainSettings.getAllSettings();
  const options = settings.map((s) => ({ label: s.name, value: s.id }));
  const hasOverride = !!map.settingId;
  const effectiveSetting = AppAPI.palette.settingId();
  const selectedId = map.settingId ?? effectiveSetting;
  return (
    <Group
      title="Map"
      actions={
        <Button size="sm" variant="outline" onClick={resetPaper}>
          Reset Paper
        </Button>
      }
    >
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
          value={map.description ?? ""}
          onChange={(e) => setMapDescription(map.id, e.target.value)}
          placeholder="Optional description"
          rows={4}
          aria-label="Map Description"
        />
      </div>
      {/* Map visibility control removed; visibility implied by active selection */}
      <Group title="Advanced">
        <div>
          <FieldLabel label="Override Campaign Setting" />
          <div className="flex items-center gap-2">
            <input
              id="map-override-toggle"
              type="checkbox"
              checked={hasOverride}
              onChange={(e) => {
                if (e.target.checked) {
                  // enable with current effective setting as initial value
                  void executeCommand("app.palette.setMapSetting", {
                    mapId: map.id,
                    settingId: selectedId,
                  });
                } else {
                  void executeCommand("app.palette.clearMapSetting", {
                    mapId: map.id,
                  });
                }
              }}
            />
            <label htmlFor="map-override-toggle" className="text-sm">
              Per‑map override
            </label>
          </div>
        </div>
        <div className={hasOverride ? "" : "opacity-50 pointer-events-none"}>
          <FieldLabel label="Map Setting (when override on)" />
          <SelectField
            label="Map Setting"
            value={selectedId}
            options={options}
            onChange={(val) => {
              if (!hasOverride) return;
              void executeCommand("app.palette.setMapSetting", {
                mapId: map.id,
                settingId: val,
              });
            }}
          />
          <PalettePreview settingId={selectedId} />
        </div>
      </Group>
    </Group>
  );
};

const LayerPropertiesGeneric: React.FC = () => {
  const selection = useSelectionStore((s) => s.selection);
  const project = useProjectStore((s) => s.current);
  const updateLayerState = useProjectStore((s) => s.updateLayerState);
  const renameLayer = useProjectStore((s) => s.renameLayer);
  if (selection.kind !== "layer" || !project) return null;
  const map = project.maps.find((m) => m.id === project.activeMapId);
  if (!map) return null;
  const layer = (map.layers ?? []).find((l) => l.id === selection.id);
  if (!layer) return null;
  const scope = `layer:${layer.type}`;
  const schema = getPropertySchema(scope);
  if (!schema) return null;
  const getVal = (path: string) =>
    (layer.state as Record<string, unknown> | undefined)?.[
      path as keyof Record<string, unknown>
    ];
  const setVal = (path: string, val: unknown) =>
    updateLayerState(layer.id, { [path]: val });
  return (
    <>
      <Group title="Layer">
        <div>
          <FieldLabel label="Name" />
          <Input
            aria-label="Layer Name"
            value={layer.name ?? ""}
            onChange={(e) => renameLayer(layer.id, e.target.value)}
            placeholder="Layer Name"
          />
        </div>
      </Group>
      {schema.groups.map((g) => (
        <Group key={g.id} title={g.title}>
          {g.rows.map((row, idx) => {
            const fields = Array.isArray(row) ? row : [row];
            return (
              <div
                key={idx}
                className={fields.length > 1 ? "grid grid-cols-2 gap-2" : ""}
              >
                {fields.map((f) => {
                  if (f.kind === "select") {
                    const v = getVal(f.path) ?? "";
                    const isHexNoiseTerrain =
                      scope === "layer:hexnoise" && f.id === "terrainId";
                    if (isHexNoiseTerrain) {
                      const entries = AppAPI.palette.list();
                      const options = [
                        { value: "", label: "— Select Terrain —" },
                        ...entries.map((e) => ({
                          value: e.id,
                          label: e.themedName,
                        })),
                      ];
                      return (
                        <SelectField
                          key={f.id}
                          label={f.label}
                          value={String(v)}
                          options={options}
                          onChange={(val) => {
                            const color = val
                              ? AppAPI.palette.fillById(val)
                              : undefined;
                            updateLayerState(layer.id, {
                              terrainId: val || undefined,
                              paintColor: color,
                            });
                          }}
                        />
                      );
                    }
                    const isFreeformBrushTerrain =
                      scope === "layer:freeform" && f.id === "brushTerrainId";
                    if (isFreeformBrushTerrain) {
                      const entries = AppAPI.palette.list();
                      const options = [
                        { value: "", label: "— Select Terrain —" },
                        ...entries.map((e) => ({
                          value: e.id,
                          label: e.themedName,
                        })),
                      ];
                      return (
                        <SelectField
                          key={f.id}
                          label={f.label}
                          value={String(v)}
                          options={options}
                          onChange={(val) => {
                            const color = val
                              ? AppAPI.palette.fillById(val)
                              : undefined;
                            updateLayerState(layer.id, {
                              brushTerrainId: val || undefined,
                              brushColor: color,
                            });
                          }}
                        />
                      );
                    }
                    return (
                      <SelectField
                        key={f.id}
                        label={f.label}
                        value={String(v)}
                        options={f.options}
                        onChange={(val) => setVal(f.path, val)}
                      />
                    );
                  }
                  if (f.kind === "color") {
                    const v = getVal(f.path) ?? "#ffffff";
                    return (
                      <ColorField
                        key={f.id}
                        label={f.label}
                        value={String(v)}
                        onChange={(val) => setVal(f.path, val)}
                      />
                    );
                  }
                  if (f.kind === "number") {
                    const v = Number(getVal(f.path) ?? 0);
                    return (
                      <div key={f.id}>
                        <FieldLabel label={f.label || f.id} />
                        <Input
                          type="number"
                          value={v}
                          min={f.min}
                          max={f.max}
                          step={f.step ?? 1}
                          onChange={(e) =>
                            setVal(f.path, Number(e.target.value))
                          }
                        />
                      </div>
                    );
                  }
                  if (f.kind === "slider") {
                    const v = Number(getVal(f.path) ?? 0);
                    return (
                      <div key={f.id}>
                        <FieldLabel label={f.label || f.id} />
                        <Slider
                          value={v}
                          min={f.min}
                          max={f.max}
                          step={f.step ?? 1}
                          onChange={(val) => setVal(f.path, val)}
                        />
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
      {layer.type === "hexnoise"
        ? (() => {
            const terrainId = (layer.state as Record<string, unknown>)?.[
              "terrainId"
            ] as string | undefined;
            if (!terrainId) return null;
            const entry = AppAPI.palette.list().find((e) => e.id === terrainId);
            if (!entry?.description) return null;
            return (
              <div className="px-2 text-xs text-muted-foreground">
                {entry.description}
              </div>
            );
          })()
        : null}
    </>
  );
};

const Swatch: React.FC<{ color: string; label?: string; desc?: string }> = ({
  color,
  label,
  desc,
}) => {
  const chip = (
    <div
      className="h-4 w-4 rounded-sm border"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
  if (!label && !desc) return chip;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent>
        <div className="max-w-64">
          {label ? <div className="font-medium mb-0.5">{label}</div> : null}
          {desc ? <div className="opacity-80">{desc}</div> : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

const PalettePreview: React.FC<{ settingId: string }> = ({ settingId }) => {
  const s = TerrainSettings.getAllSettings().find((x) => x.id === settingId);
  if (!s) return null;
  // Show all terrain swatches from the setting (no base-type assumptions)
  const entries = s.terrains;
  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        {entries.map((t, i) => (
          <Swatch
            key={`${t.id}-${i}`}
            color={t.color}
            label={t.themedName}
            desc={t.description}
          />
        ))}
        <div className="ml-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="h-4 w-4 rounded-sm border inline-block"
                style={{ backgroundColor: s.palette.gridLine }}
              />
            </TooltipTrigger>
            <TooltipContent>Grid Line: {s.palette.gridLine}</TooltipContent>
          </Tooltip>
          Grid
        </div>
      </div>
      {s.description ? (
        <div className="mt-1 text-xs text-muted-foreground">
          {s.description}
        </div>
      ) : null}
    </div>
  );
};
