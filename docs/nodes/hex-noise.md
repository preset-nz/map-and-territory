---
title: Hex Noise
node: hex-noise
group: layer
category: generator
summary: Fills hexes from smooth noise, as greys to shape a landmass or as terrain colour.
---

# Hex Noise

<!-- generated:begin — preset-docs rewrites this block; write outside it -->
Fills hexes from smooth noise, as greys to shape a landmass or as terrain colour.

| Control | Range | Default | What it does |
|---|---|---|---|
| Name | text | Hex Noise | What the layer is called in the layer list. |
| Visible | on or off | on | Whether the layer is drawn. |
| Opacity | 0 to 1 | 1 | How much of the layer shows through; 0 hides it, 1 draws it in full. |
| Blend | Normal (`normal`), Multiply (`multiply`), Screen (`screen`), Overlay (`overlay`), Darken (`darken`), Lighten (`lighten`) | Normal (`normal`) | How the layer mixes with the layers beneath it. |
| Seed | text | seed | The text the noise grows from; the same seed always gives the same pattern. |
| Frequency | 0.01 to 5 | 0.15 | How fast the noise changes from hex to hex; higher gives smaller, busier patches. |
| Offset X | -1000 to 1000 | 0 | Slides the noise sideways without changing its shape. |
| Offset Y | -1000 to 1000 | 0 | Slides the noise up or down without changing its shape. |
| Intensity | 0 to 1 | 1 | How bright the grey is in shape mode; 0 is black. |
| Gamma | 0.1 to 5 | 1 | Bends the noise towards its low or high end; 1 leaves it as it is. |
| Minimum | 0 to 1 | 0 | Hexes whose noise is below this are left empty. |
| Maximum | 0 to 1 | 1 | Hexes whose noise is above this are left empty. |
| Mode | Shape (`shape`), Paint (`paint`) | Shape (`shape`) | Shape fills hexes with grey for use as a mask; paint fills them with terrain colour. |
| Terrain | Water (`water`), Plains (`plains`), Forest (`forest`), Hills (`hills`), Mountains (`mountains`) | Plains (`plains`) | The kind of terrain painted in paint mode. |
| Palette terrain | text | empty | The id of one terrain in the palette to paint with, in place of the kind above. |
<!-- generated:end -->

## Using it

Hex Noise fills hexes from smooth random noise. On a hexmap it's a quick way to rough out a landmass, a forest or a stretch of hills that you can then work over by hand.

Add one from the Layer menu. The same Seed always gives the same pattern, so change the seed until the shape looks right. Frequency sets how big the patches are, and Minimum and Maximum cut the noise off to leave gaps. In shape mode the hexes are filled with grey; in paint mode they are filled with the colour of the terrain you pick, taken from the palette.

Tip: for an island, raise Minimum so only the high ground is filled and the rest stays empty.
