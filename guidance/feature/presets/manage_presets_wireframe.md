# Manage Presets — Radix Dialog Wireframe (MVP)

Purpose
- Concrete skeleton for the Manage Presets dialog using our Radix-based `Dialog` wrapper components.
- Serves as a blueprint for implementation and a reference for plugin authors.

Component Mapping
- Container: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` (from `src/components/ui/dialog.tsx`)
- Controls: `Button`, `Input` (existing). Tabs can use simple segmented buttons for MVP; Radix Tabs may be added later.
- Lists: start with a basic list; virtualize later.

Wireframe (TSX Skeleton)
```tsx
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Types (align with presets_proposal.md)
// type PresetSummary = { id: string; name: string; updatedAt: number; scope: 'user' | 'campaign' };
// type Scope = 'user' | 'campaign';

export function ManagePresetsDialog({
  open,
  onOpenChange,
  currentNode, // { kind: 'map' | 'layer'; id: string; nodeType: string }
  api,         // AppAPI.preset facet
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentNode?: { kind: 'map' | 'layer'; id: string; nodeType: string };
  api: PresetAPI;
}) {
  // State (wireframe)
  const [scope, setScope] = React.useState<Scope>('user');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [search, setSearch] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [list, setList] = React.useState<PresetSummary[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Effects (load list lazily)
  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = currentNode?.nodeType;
    const nodeType = typeFilter === 'all' ? (t ?? 'all') : typeFilter;
    const items = api.list(nodeType, scope);
    setList(items);
    setLoading(false);
  }, [open, scope, typeFilter, currentNode?.nodeType]);

  const canApply = Boolean(selectedId && currentNode);

  const onApply = () => {
    if (!selectedId || !currentNode) return;
    api.apply(currentNode, selectedId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Presets</DialogTitle>
        </DialogHeader>

        {/* Controls Row */}
        <div className="flex items-center gap-2 pb-2 border-b border-input">
          {/* Scope Segmented */}
          <div className="inline-flex rounded-md border border-input overflow-hidden" role="tablist" aria-label="Scope">
            <button role="tab" aria-selected={scope==='user'} className="px-3 py-1.5 text-sm data-[selected=true]:bg-accent"
              data-selected={scope==='user'} onClick={() => setScope('user')}>User</button>
            <button role="tab" aria-selected={scope==='campaign'} className="px-3 py-1.5 text-sm data-[selected=true]:bg-accent"
              data-selected={scope==='campaign'} onClick={() => setScope('campaign')}>Campaign</button>
          </div>

          {/* Node Type Filter (MVP: input/select stub) */}
          <Input value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Node Type Filter" className="w-40" />

          {/* Search */}
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search presets" aria-label="Search" className="flex-1" />
        </div>

        {/* Body: two columns */}
        <div className="grid grid-cols-2 gap-4 mt-3">
          {/* Left: List */}
          <div className="min-h-[320px] rounded-md border border-input overflow-auto" role="listbox" aria-label="Presets">
            {loading ? (
              <div className="p-3 text-sm text-muted-foreground">Loading…</div>
            ) : list.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">No presets. Use “Save as Preset…” from the properties panel.</div>
            ) : (
              list
                .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
                .map((p) => (
                  <button key={p.id} role="option" aria-selected={selectedId===p.id}
                    onClick={() => setSelectedId(p.id)}
                    className="w-full text-left px-3 py-2 text-sm border-b border-border hover:bg-accent data-[selected=true]:bg-accent"
                    data-selected={selectedId===p.id}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="text-[11px] text-muted-foreground">{new Date(p.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{p.scope}</div>
                  </button>
                ))
            )}
          </div>

          {/* Right: Details Pane (wireframe) */}
          <div className="min-h-[320px] rounded-md border border-input p-3">
            <div className="text-sm font-medium mb-2">Details</div>
            {/* Placeholder metadata fields; wireframe only */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>—</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Node Type</span><span>—</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Updated</span><span>—</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Scope</span><span>{scope}</span></div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">Payload Preview</div>
            <div className="mt-1 h-40 rounded bg-muted/50 border border-input p-2 text-xs overflow-auto">{{/* JSON preview */}}</div>
            <div className="mt-2 text-xs">Compatibility: <span className="text-muted-foreground">—</span></div>
            {/* Secondary actions (rename/delete/duplicate/export/import) can live here or in a toolbar above */}
          </div>
        </div>

        <DialogFooter className="mt-3">
          <div className="mr-auto flex items-center gap-2">
            <Button variant="secondary">Export…</Button>
            <Button variant="secondary">Import…</Button>
          </div>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={onApply} disabled={!canApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Keyboard & A11y
- Scope segmented acts like tabs (role=tablist/tab, aria-selected).
- List uses role=listbox/option; ArrowUp/Down should move selection; Enter applies.
- Esc closes dialog; focus returns to the invoker.
- Labels and aria attributes present for all interactive elements.

State & Data
- `scope`: 'user' | 'campaign'
- `typeFilter`: node type string; default to current node’s type.
- `search`: case-insensitive filter on name/tags.
- `list`: fetched via `AppAPI.preset.list(nodeType, scope)`; lazy-loaded.
- `selectedId`: currently highlighted preset.

Events → AppAPI
- Apply → `preset.apply(currentNode, selectedId)` → emits domain patches → undo/redo supported.
- Export/Import → use File APIs; validate imported payloads by nodeType.

Future Enhancements
- Replace type filter `Input` with a dropdown of known node types.
- Virtualize the list; add favorite/star; inline rename in details or list.
- Show real details: name edit, timestamps, nodeType, payload preview, compatibility message.
- Add disabled state and message if `selectedId` is incompatible with `currentNode`.
