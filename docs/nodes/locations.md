---
title: Locations
node: locations
group: layer
category: markers
summary: "Named places on the map, numbered for the key: keeps, wells, fords, lairs."
---

# Locations

<!-- generated:begin — preset-docs rewrites this block; write outside it -->
Named places on the map, numbered for the key: keeps, wells, fords, lairs.

| Control | Range | Default | What it does |
|---|---|---|---|
| Name | text | Locations | What the layer is called in the layer list. |
| Visible | on or off | on | Whether the layer is drawn. |
| Opacity | 0 to 1 | 1 | How much of the layer shows through; 0 hides it, 1 draws it in full. |
| Blend | Normal (`normal`), Multiply (`multiply`), Screen (`screen`), Overlay (`overlay`), Darken (`darken`), Lighten (`lighten`) | Normal (`normal`) | How the layer mixes with the layers beneath it. |
| Marker | Number (`number`), Dot (`dot`), None (`none`) | Number (`number`) | How each location is marked: its number in a ring, a dot, or nothing but its name. |
| Names | on or off | on | Print each location's name beside its marker. |
| Numbered | on or off | on | Count this layer's locations in the map's numbering. Off, they keep their names but take no number. |
| Face | Map (`map`), Condensed (`condensed`), Serif (`serif`), Blackletter (`blackletter`), Marker (`marker`) | Map (`map`) | The lettering of the names and numbers. Map follows the map's face. |
<!-- generated:end -->

## Using it

Layer ▸ Add Locations Layer adds a layer for named places: keeps, wells, fords, lairs. Press 6 for the Location tool and click a hex to put a place there; with no locations layer on the map, the first click makes one. Each place lists under its layer in the scene panel, where you select it to name it and write what is there.

Places are numbered for the key, top of the scene panel first, and the numbers run on across every numbered locations layer on the map, so a "Towns" layer and a "Secrets" layer share one count. Turn Numbered off for a layer whose places should keep their names but take no number. Marker sets how each place shows: its number in a ring, a dot, or only its name. The names print in the grid's ink with a halo of the paper's colour so they read over any terrain, in the map's face unless you pick one.
