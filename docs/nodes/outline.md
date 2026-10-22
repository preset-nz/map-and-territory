---
title: Outline
node: outline
group: layer
category: lines
summary: Lines drawn along hex edges, for coasts, borders and roads.
---

# Outline

<!-- generated:begin — preset-docs rewrites this block; write outside it -->
Lines drawn along hex edges, for coasts, borders and roads.

| Control | Range | Default | What it does |
|---|---|---|---|
| Name | text | Outline | What the layer is called in the layer list. |
| Visible | on or off | on | Whether the layer is drawn. |
| Opacity | 0 to 1 | 1 | How much of the layer shows through; 0 hides it, 1 draws it in full. |
| Blend | Normal (`normal`), Multiply (`multiply`), Screen (`screen`), Overlay (`overlay`), Darken (`darken`), Lighten (`lighten`) | Normal (`normal`) | How the layer mixes with the layers beneath it. |
| Paths | structured | empty | The lines drawn, each a run of hex corners, open or closed. |
| Stroke colour | colour | #f8f5e5 | The colour of every line on the layer. |
| Stroke width | 1 px to 12 px | 4 px | How thick the lines are. |
| Stroke pattern | Solid (`solid`), Dashed (`dashed`), Dotted (`dotted`) | Solid (`solid`) | Whether the lines are unbroken, dashed or dotted. |
| Roughness | 0 to 1 | 0 | How far the corners wander off the grid, for a hand-drawn line; 0 is exact. |
<!-- generated:end -->

## Using it

Outline draws lines along the edges of the hexes, following the grid. Use it for coastlines, borders, rivers and roads.

Add one from the Layer menu and use the Outline tool (key 5) to click out a path along hex corners. Stroke colour, width and pattern apply to every line on the layer, so keep roads and borders on separate Outline layers if they should look different. Roughness bends the corners off the grid a little, for a hand-drawn line.
