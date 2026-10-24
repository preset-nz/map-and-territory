---
title: Image
node: image
group: layer
category: painting
summary: A picture from a file laid over the map, for stains, paper grain or a scanned drawing.
---

# Image

<!-- generated:begin — preset-docs rewrites this block; write outside it -->
A picture from a file laid over the map, for stains, paper grain or a scanned drawing.

| Control | Range | Default | What it does |
|---|---|---|---|
| Name | text | Image | What the layer is called in the layer list. |
| Visible | on or off | on | Whether the layer is drawn. |
| Opacity | 0 to 1 | 1 | How much of the layer shows through; 0 hides it, 1 draws it in full. |
| Blend | Normal (`normal`), Multiply (`multiply`), Screen (`screen`), Overlay (`overlay`), Darken (`darken`), Lighten (`lighten`) | Normal (`normal`) | How the layer mixes with the layers beneath it. |
| Fit | Cover (`cover`), Fit (`contain`), Repeat (`repeat`) | Cover (`cover`) | Cover fills the paper and crops the edges, fit shows the whole picture, repeat tiles it. |
| Scale | 0.05 to 8 | 1 | How large the picture is drawn; 1 is its fitted size. |
| Offset X | -1000 to 1000 | 0 | Slides the picture sideways. |
| Offset Y | -1000 to 1000 | 0 | Slides the picture up or down. |
| Rotation | -180° to 180° | 0° | Turns the picture about the middle of the paper. |

References: `file`.
<!-- generated:end -->

## Using it

Add one from the Layer menu. The picture is chosen by its path and stays a file on disk, so keep it beside the campaign or give its full path. It sits above the paper and below the hex grid, so the grid stays clean on top. Drawing the picture arrives in a later story.
