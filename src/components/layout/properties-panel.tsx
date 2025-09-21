"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ColorField,
  SelectField,
  CheckboxField,
  FileField,
} from "@/components/properties";
import { Slider } from "@/components/ui/slider";
import {
  getPropertySchema,
  type PropertySchema,
  type FieldDef,
  type SelectFieldDef,
  type NumberFieldDef,
  type SliderFieldDef,
  type TextareaFieldDef,
  type FileFieldDef,
} from "@/properties/registry";
import { Separator } from "@/components/ui/separator";
import { useLayoutStore } from "@/stores/layout";
import { useSelectionStore } from "@/stores/selection";
import { useCampaignStore } from "@/stores/campaign";
import { AppAPI } from "@/appapi";

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
        <GenericProperties />
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

async function readFileAsDataUrl(file: File): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function measureImage(
  dataUrl: string,
): Promise<{ width: number; height: number }> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = (event) => reject(event);
    img.src = dataUrl;
  });
}

function generateTextureId(name: string): string {
  const base = name.replace(/\s+/g, "-").toLowerCase();
  return `texture-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${base}`;
}

async function buildTexturePayload(file: File) {
  const dataUrl = await readFileAsDataUrl(file);
  const { width, height } = await measureImage(dataUrl);
  return {
    id: generateTextureId(file.name || "texture"),
    name: file.name || "texture",
    mimeType: file.type || "application/octet-stream",
    dataUrl,
    width,
    height,
  };
}

const GenericProperties: React.FC = () => {
  const selection = useSelectionStore((s) => s.selection);
  const campaign = useCampaignStore((s) => s.current);
  const renameCampaign = useCampaignStore((s) => s.rename);
  const setCampaignDescription = useCampaignStore((s) => s.setDescription);
  const setCampaignSetting = useCampaignStore((s) => s.setCampaignSetting);
  const renameMap = useCampaignStore((s) => s.renameMap);
  const setMapDescription = useCampaignStore((s) => s.setMapDescription);
  const setMapSetting = useCampaignStore((s) => s.setMapSetting);
  const updateLayerState = useCampaignStore((s) => s.updateLayerState);
  const renameLayer = useCampaignStore((s) => s.renameLayer);

  if (!campaign) return null;

  if (selection.kind === "campaign") {
    const schema = getPropertySchema("campaign");
    if (!schema) return null;
    const getVal = (path: string) => {
      switch (path) {
        case "name":
          return campaign.name;
        case "description":
          return campaign.description ?? "";
        case "settingId":
          return campaign.settingId ?? AppAPI.palette.settingId();
        default:
          return undefined;
      }
    };
    const setVal = (path: string, val: unknown) => {
      if (path === "name" && typeof val === "string") renameCampaign(val);
      else if (path === "description" && typeof val === "string")
        setCampaignDescription(val);
      else if (path === "settingId") setCampaignSetting(String(val || ""));
    };
    return <>{renderSchemaGroups(schema, getVal, setVal)}</>;
  }

  if (selection.kind === "map") {
    const map = campaign.maps.find((m) => m.id === selection.id);
    if (!map) return null;
    const schema = getPropertySchema("map");
    if (!schema) return null;
    const getVal = (path: string) => {
      switch (path) {
        case "name":
          return map.name;
        case "description":
          return map.description ?? "";
        case "overrideEnabled":
          return Boolean(map.settingId);
        case "settingId":
          return map.settingId ?? AppAPI.palette.settingId();
        default:
          return undefined;
      }
    };
    const setVal = (path: string, val: unknown) => {
      switch (path) {
        case "name":
          if (typeof val === "string") renameMap(map.id, val);
          break;
        case "description":
          if (typeof val === "string") setMapDescription(map.id, val);
          break;
        case "overrideEnabled": {
          const checked = Boolean(val);
          if (checked) setMapSetting(map.id, AppAPI.palette.settingId());
          else setMapSetting(map.id, undefined);
          break;
        }
        case "settingId":
          setMapSetting(map.id, String(val || ""));
          break;
      }
    };
    return <>{renderSchemaGroups(schema, getVal, setVal)}</>;
  }

  if (selection.kind === "layer") {
    const map = campaign.maps.find((m) => m.id === campaign.activeMapId);
    if (!map) return null;
    const layer = (map.layers ?? []).find((l) => l.id === selection.id);
    if (!layer) return null;
    const scope = `layer:${layer.type}`;
    const schema = getPropertySchema(scope);
    const getVal = (path: string) => {
      if (layer.type === "hexgrid") {
        const st = (layer.state ?? {}) as {
          color?: string;
          usePaletteColor: boolean;
        };
        if (path === "color") {
          return st.color ?? AppAPI.palette.gridLine();
        }
        if (path === "usePaletteColor") {
          return st.usePaletteColor !== false;
        }
      }
      if (layer.type === "freeform") {
        const st = (layer.state ?? {}) as Record<string, unknown>;
        if (path === "renderMode") {
          return (st["renderMode"] as string | undefined) ?? "paint";
        }
        if (path === "textureFill") {
          return st["textureFill"] as
            | Record<string, unknown>
            | null
            | undefined;
        }
        if (path === "fillMode") {
          return (st["fillMode"] as string | undefined) ?? "auto";
        }
        if (path === "textureFillInvert") {
          return Boolean(st["textureFillInvert"]);
        }
      }
      return (layer.state as Record<string, unknown> | undefined)?.[
        path as keyof Record<string, unknown>
      ];
    };
    const setVal = (path: string, val: unknown) => {
      if (layer.type === "hexnoise" && path === "terrainId") {
        const color = val ? AppAPI.palette.fillById(String(val)) : undefined;
        updateLayerState(layer.id, {
          terrainId: val || undefined,
          paintColor: color,
        });
        return;
      }
      if (layer.type === "freeform" && path === "brushTerrainId") {
        const color = val ? AppAPI.palette.fillById(String(val)) : undefined;
        updateLayerState(layer.id, {
          brushTerrainId: val || undefined,
          brushColor: color,
        });
        return;
      }
      if (layer.type === "freeform" && path === "textureFillInvert") {
        updateLayerState(layer.id, { textureFillInvert: Boolean(val) });
        return;
      }
      if (layer.type === "hexgrid") {
        if (path === "color" && typeof val === "string") {
          updateLayerState(layer.id, {
            usePaletteColor: false,
            color: val,
          });
          return;
        }
        if (path === "usePaletteColor") {
          const checked = Boolean(val);
          updateLayerState(layer.id, {
            usePaletteColor: checked,
          });
          if (checked) {
            updateLayerState(layer.id, {
              color: AppAPI.palette.gridLine(),
            });
          }
          return;
        }
      }
      updateLayerState(layer.id, { [path]: val });
    };
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
        {schema ? renderSchemaGroups(schema, getVal, setVal) : null}
      </>
    );
  }
  return null;
};

function renderSchemaGroups(
  schema: PropertySchema,
  getVal: (path: string) => unknown,
  setVal: (path: string, val: unknown) => void,
) {
  return (
    <>
      {schema.groups.map((g) => (
        <Group key={g.id} title={g.title}>
          {g.rows.map((row, idx) => {
            const fields = Array.isArray(row) ? row : [row];
            return (
              <div
                key={idx}
                className={fields.length > 1 ? "grid grid-cols-2 gap-2" : ""}
              >
                {fields.map((f: FieldDef) => {
                  const disabled = (() => {
                    const cond = f.disabledWhen as
                      | { path: string; equals?: unknown; notEquals?: unknown }
                      | undefined;
                    if (!cond) return false;
                    const v = getVal(cond.path);
                    if (Object.prototype.hasOwnProperty.call(cond, "equals"))
                      return v === cond.equals;
                    if (Object.prototype.hasOwnProperty.call(cond, "notEquals"))
                      return v !== cond.notEquals;
                    return false;
                  })();

                  if (f.kind === "select") {
                    const v = getVal(f.path) ?? "";
                    const sel = f as SelectFieldDef;
                    const options = sel.optionsProvider
                      ? sel.optionsProvider(AppAPI)
                      : (sel.options ?? []);
                    return (
                      <div
                        key={f.id}
                        className={
                          disabled ? "opacity-50 pointer-events-none" : ""
                        }
                      >
                        <SelectField
                          label={f.label}
                          value={String(v)}
                          options={options}
                          onChange={(val) => setVal(f.path, val)}
                        />
                      </div>
                    );
                  }
                  if (f.kind === "color") {
                    const v = getVal(f.path) ?? "#ffffff";
                    const cf = f as ColorFieldDef;
                    return (
                      <div
                        key={f.id}
                        className={
                          disabled ? "opacity-50 pointer-events-none" : ""
                        }
                      >
                        <ColorField
                          label={f.label}
                          value={String(v)}
                          onChange={(val) => setVal(f.path, val)}
                          presets={cf.presets}
                        />
                      </div>
                    );
                  }
                  if (f.kind === "text") {
                    const v = String(getVal(f.path) ?? "");
                    return (
                      <div
                        key={f.id}
                        className={
                          disabled ? "opacity-50 pointer-events-none" : ""
                        }
                      >
                        <FieldLabel label={f.label || f.id} />
                        <Input
                          type="text"
                          aria-label={f.label || f.id}
                          value={v}
                          onChange={(e) => setVal(f.path, e.target.value)}
                        />
                      </div>
                    );
                  }
                  if (f.kind === "textarea") {
                    const v = String(getVal(f.path) ?? "");
                    const tf = f as TextareaFieldDef;
                    return (
                      <div
                        key={f.id}
                        className={
                          disabled ? "opacity-50 pointer-events-none" : ""
                        }
                      >
                        <FieldLabel label={f.label || f.id} />
                        <Textarea
                          aria-label={f.label || f.id}
                          value={v}
                          rows={tf.rows ?? 3}
                          onChange={(e) => setVal(f.path, e.target.value)}
                        />
                      </div>
                    );
                  }
                  if (f.kind === "number") {
                    const v = Number(getVal(f.path) ?? 0);
                    const nf = f as NumberFieldDef;
                    return (
                      <div
                        key={f.id}
                        className={
                          disabled ? "opacity-50 pointer-events-none" : ""
                        }
                      >
                        <FieldLabel label={f.label || f.id} />
                        <Input
                          type="number"
                          aria-label={f.label || f.id}
                          value={v}
                          min={nf.min}
                          max={nf.max}
                          step={nf.step ?? 1}
                          onChange={(e) =>
                            setVal(f.path, Number(e.target.value))
                          }
                        />
                      </div>
                    );
                  }
                  if (f.kind === "slider") {
                    const v = Number(getVal(f.path) ?? 0);
                    const sf = f as SliderFieldDef;
                    return (
                      <div
                        key={f.id}
                        className={
                          disabled ? "opacity-50 pointer-events-none" : ""
                        }
                      >
                        <FieldLabel label={f.label || f.id} />
                        <Slider
                          value={v}
                          min={sf.min}
                          max={sf.max}
                          step={sf.step ?? 1}
                          onChange={(val) => setVal(f.path, val)}
                        />
                      </div>
                    );
                  }
                  if (f.kind === "file") {
                    const ff = f as FileFieldDef;
                    const asset = getVal(f.path) as
                      | { name?: string }
                      | null
                      | undefined;
                    const handlePick = (file: File) => {
                      void (async () => {
                        try {
                          const payload = await buildTexturePayload(file);
                          setVal(f.path, payload);
                          ff.cascade?.forEach(({ path, value }) =>
                            setVal(path, value),
                          );
                        } catch (error) {
                          console.error(
                            "[properties] failed to load file",
                            error,
                          );
                        }
                      })();
                    };
                    const handleClear = asset
                      ? () => {
                          setVal(f.path, null);
                          ff.clearCascade?.forEach(({ path, value }) =>
                            setVal(path, value),
                          );
                        }
                      : undefined;
                    return (
                      <div
                        key={f.id}
                        className={
                          disabled ? "opacity-50 pointer-events-none" : ""
                        }
                      >
                        <FileField
                          label={f.label || f.id}
                          fileName={asset?.name}
                          disabled={disabled}
                          accept={ff.accept}
                          helperText={ff.helperText}
                          onPick={handlePick}
                          onClear={handleClear}
                        />
                      </div>
                    );
                  }
                  if (f.kind === "checkbox") {
                    const v = Boolean(getVal(f.path));
                    return (
                      <div
                        key={f.id}
                        className={
                          disabled ? "opacity-50 pointer-events-none" : ""
                        }
                      >
                        <CheckboxField
                          label={f.label}
                          checked={v}
                          onChange={(checked) => setVal(f.path, checked)}
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
    </>
  );
}
