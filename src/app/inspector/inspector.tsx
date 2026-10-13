// The right panel: a facets panel over the selected node's kind (epic 03). Edits are
// `value.set` through the channel; a slider or number drag is one gesture, so one undo step.
import {
  PropertyPanel,
  registerBuiltinRenderers,
  registerScope,
  type Scope,
} from '@preset.nz/facets';
import { type Channel, type Mirror, useMirror, useNode } from '@preset.nz/pom';
import { useMemo } from 'react';
import { useChannel } from '../document';
import { CAMPAIGN_PATH } from '../scene/frame';
import { selection } from '../selection';
import { label, readValues, schemaFor, type ValueInfo, writeValue } from './schema';

registerBuiltinRenderers();

interface Ctx {
  mirror: Mirror;
  channel: Channel;
}
interface Target {
  id: string;
}

const scopeKey = (type: string) => `inspector:${type}`;

const infoOf = (mirror: Mirror, type: string): ValueInfo[] =>
  (mirror.schema.types.find((t) => t.name === type)?.values ?? []) as ValueInfo[];

const tokens = new Map<string, Promise<number>>();

function scopeOf(info: ValueInfo[]): Scope<Target, Record<string, unknown>> {
  const byKey = new Map(info.map((v) => [v.key, v]));
  const pathOf = (id: string, ctx: Ctx) => ctx.mirror.node(id)?.path;
  return {
    schema: schemaFor(info),
    read: (t, ctx: Ctx) => readValues(ctx.mirror.node(t.id)?.values, info),
    write: (key, value, t, ctx: Ctx) => {
      const at = pathOf(t.id, ctx);
      if (!at) return;
      ctx.channel
        .run('value.set', { at, key, value: writeValue(byKey.get(key), value) })
        .catch((e) => console.error('[inspector] value.set refused', e));
    },
    gesture: {
      begin: (key, t, ctx: Ctx) => {
        tokens.set(`${t.id}:${key}`, ctx.channel.begin(`Set ${label(key)}`));
      },
      end: (key, t, ctx: Ctx) => {
        const token = tokens.get(`${t.id}:${key}`);
        tokens.delete(`${t.id}:${key}`);
        if (token) ctx.channel.end(token).catch((e) => console.error('[inspector] end', e));
      },
    },
  };
}

/** The id of what the inspector shows: the selected layer, map or campaign. */
function useSelectedId(): string | null {
  const mirror = useMirror();
  const selected = selection.use();
  if (selected.kind === 'layer' || selected.kind === 'map') return selected.id;
  if (selected.kind === 'campaign') return mirror.nodeAt(CAMPAIGN_PATH)?.id ?? null;
  return null;
}

export function Inspector() {
  const mirror = useMirror();
  const channel = useChannel();
  const id = useSelectedId();
  const row = useNode(id);
  const ctx = useMemo<Ctx>(() => ({ mirror, channel }), [mirror, channel]);

  const type = row?.type;
  const registered = useMemo(() => {
    if (!type) return null;
    const info = infoOf(mirror, type);
    if (info.length === 0) return null;
    registerScope(scopeKey(type), scopeOf(info));
    return type;
  }, [mirror, type, mirror.schema]);

  if (!id || !row || !registered) {
    return <p className="p-3 text-sm text-muted-foreground">Nothing selected.</p>;
  }
  return (
    <PropertyPanel
      scopeKey={scopeKey(registered)}
      selection={{ id }}
      ctx={ctx}
      emptyState={<p className="p-3 text-sm text-muted-foreground">Nothing to edit.</p>}
    />
  );
}
