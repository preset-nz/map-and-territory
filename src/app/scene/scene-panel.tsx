import { useChildren, useMirror, useNode, useNodeAt } from '@preset.nz/pom';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  cn,
  Icons,
} from '@preset.nz/ux-kit';
import { type KeyboardEvent, useState, useSyncExternalStore } from 'react';
import { useRun } from '../document';
import { type Selected, selection } from '../selection';
import { CAMPAIGN_PATH } from './frame';
import { useMapIds } from './maps';
import {
  actionsFor,
  displayName,
  furnitureTopFirst,
  isBooklet,
  layersTopFirst,
  mapsOffPages,
  pageMap,
  type TreeRow,
} from './tree';

const PAGES_PATH = '/pages';

const isSelected = (s: Selected, kind: Selected['kind'], id?: string) =>
  s.kind === kind && (id === undefined || ('id' in s && s.id === id));

/**
 * The campaign, its maps and each map's furniture and layers, top first (epic 16 story 2,
 * epic 23 story 1). Furniture is drawn over the grid, so it lists above the layers. The
 * campaign is the panel's heading: there is one per window, so its maps aren't indented under
 * it (Georg, 2026-10-28).
 */
export function ScenePanel() {
  const campaign = useNodeAt(CAMPAIGN_PATH);
  const maps = useMapIds();
  const selected = selection.use();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div role="tree" aria-label="Scene" className="min-h-0 flex-1 overflow-y-auto px-1 pt-2 pb-2">
        {campaign && (
          <Item
            row={campaign}
            depth={0}
            selected={isSelected(selected, 'campaign')}
            onSelect={selection.selectCampaign}
            icon={<Icons.BookOpen />}
            heading
          />
        )}
        {isBooklet(campaign) ? (
          <Pages maps={maps} selected={selected} />
        ) : (
          maps.map((id) => <MapItem key={id} id={id} selected={selected} />)
        )}
        {maps.length === 0 && (
          <p className="px-3 py-2 text-muted-foreground text-xs">No maps yet. Map ▸ New Map.</p>
        )}
      </div>
    </div>
  );
}

/**
 * A booklet's pages, cover first and back last, each with its map under it (epic 32 story 4).
 * The maps on no page follow under their own heading, so every map stays in reach.
 */
function Pages({ maps, selected }: { maps: readonly string[]; selected: Selected }) {
  const pages = useNodeAt(PAGES_PATH);
  const ids = useChildren(pages?.id, 'pages');
  const mirror = useMirror();
  // which maps are free changes with any page's map, not only with the page list
  useSyncExternalStore(mirror.subscribe, () => mirror.seq);
  const rows = ids.map((id) => mirror.node(id) as TreeRow | undefined);
  const free = mapsOffPages(maps, rows);
  return (
    <>
      {ids.map((id) => (
        <PageItem key={id} id={id} free={free} selected={selected} />
      ))}
      {free.length > 0 && (
        // biome-ignore lint/a11y/useSemanticElements: a group inside a tree
        <div
          role="group"
          aria-label="Not on a page"
          className="mt-2 border-sidebar-border border-t pt-1"
        >
          <p className="px-2 py-1 text-muted-foreground text-xs">Not on a page</p>
          {free.map((id) => (
            <MapItem key={id} id={id} selected={selected} />
          ))}
        </div>
      )}
    </>
  );
}

function PageItem({
  id,
  free,
  selected,
}: {
  id: string;
  free: readonly string[];
  selected: Selected;
}) {
  const row = useNode(id);
  const run = useRun();
  const mirror = useMirror();
  if (!row) return null;
  const map = pageMap(row as TreeRow);
  const setMap = (path: string | null) => run('page.set-map', { at: row.path, map: path });
  return (
    <>
      <Item
        row={row}
        depth={0}
        selected={isSelected(selected, 'page', id)}
        onSelect={() => selection.selectPage(id)}
        icon={<Icons.File />}
        menu={
          <ContextMenuSub>
            <ContextMenuSubTrigger>Map</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {free.map((m) => {
                const r = mirror.node(m) as TreeRow | undefined;
                return r ? (
                  <ContextMenuItem key={m} onClick={() => setMap(r.path)}>
                    {displayName(r)}
                  </ContextMenuItem>
                ) : null;
              })}
              {free.length > 0 && <ContextMenuSeparator />}
              <ContextMenuItem disabled={map === null} onClick={() => setMap(null)}>
                No Map
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        }
      />
      {map && <MapItem id={map} selected={selected} depth={1} />}
    </>
  );
}

function MapItem({ id, selected, depth = 0 }: { id: string; selected: Selected; depth?: number }) {
  const row = useNode(id);
  const layers = useChildren(id, 'layers');
  const furniture = useChildren(id, 'furniture');
  const [open, setOpen] = useState(true);
  if (!row) return null;
  return (
    <>
      <Item
        row={row}
        depth={depth}
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
            <LayerItem
              key={nodeId}
              id={nodeId}
              selected={selected}
              icon={<Icons.TextT />}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
      {open &&
        layersTopFirst({ ...row, orders: { layers: [...layers] } }).map((layerId) => (
          <LayerItem key={layerId} id={layerId} selected={selected} depth={depth + 1} />
        ))}
    </>
  );
}

/** A layer or a piece of furniture: both select as a layer, so the inspector and Edit follow. */
function LayerItem({
  id,
  selected,
  icon = <Icons.Stack />,
  depth = 1,
}: {
  id: string;
  selected: Selected;
  icon?: React.ReactNode;
  depth?: number;
}) {
  const row = useNode(id);
  if (!row) return null;
  return (
    <>
      <Item
        row={row}
        depth={depth}
        selected={isSelected(selected, 'layer', id)}
        onSelect={() => selection.selectLayer(id)}
        icon={row.type === 'locations' ? <Icons.MapPinArea /> : icon}
      />
      {row.type === 'locations' && (
        <LocationItems layerId={id} selected={selected} depth={depth + 1} />
      )}
    </>
  );
}

/** A locations layer's places, under it in its order (epic 28); each selects as a layer does. */
function LocationItems({
  layerId,
  selected,
  depth,
}: {
  layerId: string;
  selected: Selected;
  depth: number;
}) {
  const ids = useChildren(layerId, 'locations');
  return ids.map((id) => <LocationItem key={id} id={id} selected={selected} depth={depth} />);
}

function LocationItem({ id, selected, depth }: { id: string; selected: Selected; depth: number }) {
  const row = useNode(id);
  if (!row) return null;
  return (
    <Item
      row={row}
      depth={depth}
      selected={isSelected(selected, 'layer', id)}
      onSelect={() => selection.selectLayer(id)}
      icon={<Icons.MapPin />}
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
  /** The campaign: the panel's heading, set apart from its maps. */
  heading?: boolean;
  /** More context-menu items, after Delete. */
  menu?: React.ReactNode;
}

function Item({
  row,
  depth,
  selected,
  onSelect,
  icon,
  expanded,
  onToggleExpanded,
  heading,
  menu,
}: ItemProps) {
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
              heading && 'mb-1 font-semibold',
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
        {menu && <ContextMenuSeparator />}
        {menu}
      </ContextMenuContent>
    </ContextMenu>
  );
}
