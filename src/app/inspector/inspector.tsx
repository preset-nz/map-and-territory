// The right panel: a facets panel over the selected node's kind (epic 03). Edits are
// `value.set` through the channel, apart from file fields and the few values a model command
// owns (`valueCommand`); a slider or number drag is one gesture, so one undo step.

import { useDocument } from '@preset.nz/app-kit';
import {
  PropertyPanel,
  registerBuiltinRenderers,
  registerScope,
  type Scope,
} from '@preset.nz/facets';
import { type Channel, type Mirror, useMirror, useNode } from '@preset.nz/pom';
import { useEffect, useMemo, useState } from 'react';
import { useChannel } from '../document';
import { setDocumentFolder } from '../files';
import { CAMPAIGN_PATH } from '../scene/frame';
import { selection } from '../selection';
import {
  FOLLOW,
  fileRefCommand,
  labelOf,
  messageOf,
  readRefs,
  readValues,
  schemaFor,
  settingRef,
  type ValueInfo,
  valueCommand,
  writeValue,
} from './schema';

registerBuiltinRenderers();

interface Ctx {
  mirror: Mirror;
  channel: Channel;
  /** The campaign file's folder: a change to it re-reads the file fields' Missing check. */
  folder?: string | null;
}
interface Target {
  id: string;
}

const scopeKey = (type: string) => `inspector:${type}`;

const infoOf = (mirror: Mirror, type: string): ValueInfo[] =>
  (mirror.schema.types.find((t) => t.name === type)?.values ?? []) as ValueInfo[];

const refsOf = (mirror: Mirror, type: string): string[] =>
  mirror.schema.types.find((t) => t.name === type)?.refs ?? [];

/** The names of the built-in settings, from the model's catalogue; fetched once. */
let catalogue: Promise<string[]> | null = null;
function settingNames(channel: Channel): Promise<string[]> {
  catalogue ??= channel
    .run('palette.catalogue')
    .then((ran) => {
      // a text outcome comes back as `{ text }` (pom's `Ran`)
      if (typeof ran !== 'object' || !('text' in ran)) throw new Error('no catalogue text');
      return (JSON.parse(ran.text) as { name: string }[]).map((s) => s.name);
    })
    .catch((e) => {
      console.error('[inspector] palette.catalogue refused', e);
      catalogue = null;
      return [];
    });
  return catalogue;
}

/** The setting names, once the catalogue is in; empty until then. */
function useSettingNames(channel: Channel): string[] {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    settingNames(channel).then((n) => live && setNames(n));
    return () => {
      live = false;
    };
  }, [channel]);
  return names;
}

/** The name of the setting the campaign uses, through the mirror. */
function campaignSettingName(ctx: unknown): string | null {
  const mirror = (ctx as Ctx | undefined)?.mirror;
  const id = mirror?.nodeAt(CAMPAIGN_PATH)?.refs?.palette?.node;
  const name = id ? mirror?.node(id)?.values?.name : undefined;
  return typeof name === 'string' ? name : null;
}

const tokens = new Map<string, Promise<number>>();

export function scopeOf(
  type: string,
  info: ValueInfo[],
  refs: string[],
  settings: string[] = [],
): Scope<Target, Record<string, unknown>> {
  const byKey = new Map(info.map((v) => [v.key, v]));
  const pathOf = (id: string, ctx: Ctx) => ctx.mirror.node(id)?.path;
  return {
    schema: schemaFor(info, refs, type, settings, campaignSettingName),
    read: (t, ctx: Ctx) => {
      const node = ctx.mirror.node(t.id);
      return { ...readValues(node?.values, info), ...readRefs(node?.refs, refs, type, ctx.mirror) };
    },
    write: (key, value, t, ctx: Ctx) => {
      const at = pathOf(t.id, ctx);
      if (!at) return;
      if (settingRef(type, key)) {
        // A setting field: the model makes or reuses the theme; follow clears a map's reference.
        const args = value === FOLLOW || !value ? { at } : { at, preset: value };
        ctx.channel
          .run('palette.use', args)
          .catch((e) => console.error('[inspector] palette.use refused', e));
        return;
      }
      const command = fileRefCommand(type, key);
      if (command) {
        // A file field: the command checks the file, and its refusal (not an image, too
        // large, unreadable) comes back to the field as its message. An empty value clears.
        return ctx.channel.run(command, { at, file: value || null }).then(
          () => undefined,
          (e) => ({ error: messageOf(e) }),
        );
      }
      const written = writeValue(byKey.get(key), value);
      const own = valueCommand(type, key);
      ctx.channel
        .run(own ?? 'value.set', own ? { at, [key]: written } : { at, key, value: written })
        .catch((e) => console.error(`[inspector] ${own ?? 'value.set'} refused`, e));
    },
    gesture: {
      begin: (key, t, ctx: Ctx) => {
        tokens.set(`${t.id}:${key}`, ctx.channel.begin(`Set ${labelOf(byKey.get(key), key)}`));
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
  if (selected.kind === 'layer' || selected.kind === 'map' || selected.kind === 'page')
    return selected.id;
  if (selected.kind === 'campaign') return mirror.nodeAt(CAMPAIGN_PATH)?.id ?? null;
  return null;
}

export function Inspector() {
  const mirror = useMirror();
  const channel = useChannel();
  const id = useSelectedId();
  const row = useNode(id);
  // File fields resolve a relative path against the campaign file's folder. Set during render so
  // it is current before the fields below read it; a new folder gives a new ctx, so they re-check.
  const documentPath = useDocument()?.path ?? null;
  setDocumentFolder(documentPath);
  const ctx = useMemo<Ctx>(
    () => ({ mirror, channel, folder: documentPath }),
    [mirror, channel, documentPath],
  );

  const settings = useSettingNames(channel);

  const type = row?.type;
  const registered = useMemo(() => {
    if (!type) return null;
    const info = infoOf(mirror, type);
    if (info.length === 0) return null;
    registerScope(scopeKey(type), scopeOf(type, info, refsOf(mirror, type), settings));
    return type;
  }, [mirror, type, mirror.schema, settings]);

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
