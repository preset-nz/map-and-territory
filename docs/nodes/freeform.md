---
title: Freeform
node: freeform
group: layer
category: painting
summary: Hexes you paint by hand, each filled with a terrain from the palette.
---

# Freeform

<!-- generated:begin — preset-docs rewrites this block; write outside it -->
Hexes you paint by hand, each filled with a terrain from the palette.

| Control | Range | Default | What it does |
|---|---|---|---|
| Name | text | Freeform | What the layer is called in the layer list. |
| Visible | on or off | on | Whether the layer is drawn. |
| Opacity | 0 to 1 | 1 | How much of the layer shows through; 0 hides it, 1 draws it in full. |
| Blend | Normal (`normal`), Multiply (`multiply`), Screen (`screen`), Overlay (`overlay`), Darken (`darken`), Lighten (`lighten`) | Normal (`normal`) | How the layer mixes with the layers beneath it. |
| Render mode | Paint (`paint`), Texture fill (`texture-fill`) | Paint (`paint`) | Paint fills each painted hex with its terrain colour; texture fill shows an image through the painted hexes. |
| Invert fill | on or off | off | Show the image everywhere except the painted hexes. |
| Texture offset X | -1000 to 1000 | 0 | Slides the image sideways. |
| Texture offset Y | -1000 to 1000 | 0 | Slides the image up or down. |
| Texture scale | 0.05 to 8 | 1 | How large the image is drawn; 1 is its fitted size. |
| Texture rotation | -180° to 180° | 0° | Turns the image about the middle of the map. |
| Texture tiling | Stretch (`stretch`), Fit (`fit`), Repeat (`repeat`) | Stretch (`stretch`) | Stretch fills the map, fit keeps the image's proportions, repeat tiles it. |
| Texture blend | Normal (`normal`), Overlay (`overlay`), Screen (`screen`), Multiply (`multiply`) | Normal (`normal`) | How the image mixes with the terrain colour under it. |

References: `texture`.
<!-- generated:end -->

## Using it

Freeform is the layer you paint by hand. Each painted hex takes the colour of a terrain from the palette, so it's where most of a map's land, water and settlement ends up.

Add one from the Layer menu, then use the Paint, Erase and Fill tools (keys 1, 2 and 3) on the map. Use a separate Freeform layer for each kind of thing you may want to hide or reorder later, such as coastline, roads and settlements.

Texture fill is partly built. The layer stores a path to an image and can draw it through the painted hexes, but there is no picker for the image in the inspector yet.
