---
title: Hex Grid
node: hexgrid
group: layer
category: grid
summary: The hex grid drawn over the map, and the grid every other layer is laid out on.
---

# Hex Grid

<!-- generated:begin — preset-docs rewrites this block; write outside it -->
The hex grid drawn over the map, and the grid every other layer is laid out on.

| Control | Range | Default | What it does |
|---|---|---|---|
| Name | text | Hex Grid | What the layer is called in the layer list. |
| Visible | on or off | on | Whether the grid lines are drawn. |
| Opacity | 0 to 1 | 1 | How much of the grid shows through; 0 hides it, 1 draws it in full. |
| Blend | Normal (`normal`), Multiply (`multiply`), Screen (`screen`), Overlay (`overlay`), Darken (`darken`), Lighten (`lighten`) | Normal (`normal`) | How the grid mixes with the layers beneath it. |
| Hex size | 8 px to 120 px, or more | 24 px | The radius of one hex, from its centre to a corner. |
| Orientation | Pointy-top (`pointy`), Flat-top (`flat`) | Pointy-top (`pointy`) | Which way the hexes sit: a corner up, or a flat edge up. |
| Line colour | colour | #000000 | The colour of the grid lines when the palette's isn't used. |
| Palette colour | on or off | on | Draw the lines in the palette's grid line colour instead of the colour above. |
| Line strength | 0 to 1 | 1 | How solid the grid lines are, on top of the layer's opacity. |
| Line width | 1 px to 8 px, or more | 1 px | How thick the grid lines are. |
<!-- generated:end -->

## Using it

The hex grid sits on top of every other layer and sets the size and orientation of the hexes that Hex Noise, Freeform and Outline are laid out on. There is always exactly one, and it can't be deleted or duplicated.

Change Hex size to make the map coarser or finer. Pointy-top and flat-top change how every hex is laid out, so choose before you start painting. By default the lines take the palette's grid line colour; turn off Palette colour to use your own. A low Line strength keeps the grid in the background.
