import { useChildren, useNode, useNodeAt } from '@preset.nz/pom';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  cn,
  Icons,
} from '@preset.nz/ux-kit';
import { type KeyboardEvent, useState } from 'react';
import { useRun } from '../document';
import { type Selected, selection } from '../selection';
import { CAMPAIGN_PATH } from './frame';
import { useMapIds } from './maps';
import { actionsFor, displayName, furnitureTopFirst, layersTopFirst, type TreeRow } from './tree';

const isSelected = (s: Selected, kind: Selected['kind'], id?: string) =>
  s.kind === kind && (id === undefined || ('id' in s && s.id === id));

/**
 * The campaign, its maps and each map's furniture and layers, top first (epic 16 story 2,
 * epic 23 story 1). Furniture is drawn over the grid, so it lists above the layers.
 */
export function ScenePanel() {
  const campaign = useNodeAt(CAMPAIGN_PATH);
  const maps = useMapIds();
  const selected = selection.use();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-3 pt-3 pb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
        Scene
      </div>
      <div role="tree" aria-label="Scene" className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        {campaign && (
          <Item
            row={campaign}
            depth={0}
            selected={isSelected(selected, 'campaign')}
            onSelect={selection.selectCampaign}
            icon={<Icons.BookOpen />}
          />
        )}
        {maps.map((id) => (
          <MapItem key={id} id={id} selected={selected} />
        ))}
        {maps.length === 0 && (
          <p className="px-3 py-2 text-muted-foreground text-xs">No maps yet. Map ▸ New Map.</p>
        )}
      </div>
    </div>
  );
}

function MapItem({ id, selected }: { id: string; selected: Selected }) {
  const row = useNode(id);
  const layers = useChildren(id, 'layers');
  const furniture = useChildren(id, 'furniture');
  const [open, setOpen] = useState(true);
  if (!row) return null;
  return (
    <>
      <Item
        row={row}
        depth={1}
        selected={isSelected(selected, 'map', id)}
        onSelect={() => selection.selectMap(id)}
        icon={<Icons.MapTrifold />}
        expanded={open}
        onToggleExpanded={() => setOpen((o) => !o)}
      />
      {open && furniture.length > 0 && (
        // Its own section: a rule under it parts it from the layers. A group of tree items is
        // ARIA's tree pattern, not a form's fieldset.
        // biome-ignore lint/a11y/useSemanticElements: a group inside a tree
        <div
          role="group"
          aria-label="Furniture"
          className="mb-0.5 border-sidebar-border border-b pb-0.5"
        >
          {furnitureTopFirst({ ...row, orders: { furniture: [...furniture] } }).map((nodeId) => (
            <LayerItem key={nodeId} id={nodeId} selected={selected} icon={<Icons.TextT />} />
          ))}
        </div>
      )}
      {open &&
        layersTopFirst({ ...row, orders: { layers: [...layers] } }).map((layerId) => (
          <LayerItem key={layerId} id={layerId} selected={selected} />
        ))}
    </>
  );
}

/** A layer or a piece of furniture: both select as a layer, so the inspector and Edit follow. */
function LayerItem({
  id,
  selected,
  icon = <Icons.Stack />,
}: {
  id: string;
  selected: Selected;
  icon?: React.ReactNode;
}) {
  const row = useNode(id);
  if (!row) return null;
  return (
    <Item
      row={row}
      depth={2}
      selected={isSelected(selected, 'layer', id)}
      onSelect={() => selection.selectLayer(id)}
      icon={icon}
    />
  );
}

interface ItemProps {
  row: TreeRow;
  depth: number;
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}

function Item({ row, depth, selected, onSelect, icon, expanded, onToggleExpanded }: ItemProps) {
  const run = useRun();
  const actions = actionsFor(row);
  const [renaming, setRenaming] = useState(false);
  const name = displayName(row);

  const commit = (value: string) => {
    setRenaming(false);
    const next = value.trim();
    if (next && next !== name) run('node.rename', { at: row.path, name: next });
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commit(e.currentTarget.value);
    if (e.key === 'Escape') setRenaming(false);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <div
            role="treeitem"
            aria-selected={selected}
            aria-expanded={expanded}
            tabIndex={selected ? 0 : -1}
            onClick={onSelect}
            onKeyDown={(e) => {
              // a focused row, not a global shortcut: Enter or Space selects it
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect();
              }
            }}
            onDoubleClick={() => actions.rename && setRenaming(true)}
            onContextMenu={onSelect}
            style={{ paddingLeft: 4 + depth * 12 }}
            className={cn(
              'group flex h-7 cursor-default items-center gap-1.5 rounded-sm pr-1 text-sm',
              selected
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'hover:bg-sidebar-accent/50',
            )}
          />
        }
      >
        {onToggleExpanded ? (
          <button
            type="button"
            aria-label={expanded ? 'Collapse' : 'Expand'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded();
            }}
            className="grid size-4 place-items-center text-muted-foreground"
          >
            {expanded ? <Icons.CaretDown size={12} /> : <Icons.CaretRight size={12} />}
          </button>
        ) : (
          <span className="size-4" />
        )}
        <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
        {renaming ? (
          <input
            // biome-ignore lint/a11y/noAutofocus: renaming starts typing at once
            autoFocus
            defaultValue={name}
            aria-label="Name"
            onKeyDown={onKey}
            onBlur={(e) => commit(e.currentTarget.value)}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 rounded-sm bg-background px-1 outline-none ring-1 ring-ring"
          />
        ) : (
          <span
            className={cn('min-w-0 flex-1 truncate', actions.visible === false && 'opacity-50')}
          >
            {name}
          </span>
        )}
        {actions.visible !== undefined && (
          <button
            type="button"
            aria-label={actions.visible ? `Hide ${name}` : `Show ${name}`}
            onClick={(e) => {
              e.stopPropagation();
              run('node.set-visible', { at: row.path, visible: !actions.visible });
            }}
            className={cn(
              'grid size-6 place-items-center rounded-sm text-muted-foreground hover:text-foreground',
              actions.visible && 'opacity-0 group-hover:opacity-100',
            )}
          >
            {actions.visible ? <Icons.Eye size={14} /> : <Icons.EyeSlash size={14} />}
          </button>
        )}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem disabled={!actions.rename} onClick={() => setRenaming(true)}>
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!actions.duplicate}
          onClick={() => run('edit.duplicate', { at: row.path })}
        >
          Duplicate
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!actions.delete}
          onClick={() => run('edit.delete', { at: row.path })}
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
