---
title: Paper
node: paper
group: layer
category: background
summary: "The sheet the map is drawn on: a flat colour at the bottom of every map."
---

# Paper

<!-- generated:begin — preset-docs rewrites this block; write outside it -->
The sheet the map is drawn on: a flat colour at the bottom of every map.

| Control | Range | Default | What it does |
|---|---|---|---|
| Aspect | Square (`square`), 4:3 (`4:3`), 16:10 (`16:10`) | 16:10 (`16:10`) | The shape of the sheet, as width to height. |
| Colour | colour | #ffffff | The colour of the paper. |
| Mix with paper | Image only (`normal`), Multiply (`multiply`) | Multiply (`multiply`) | How the image mixes with the paper colour: image only, or multiplied over the colour so the paper shows through its light parts. |
| Texture fit | Cover (`cover`), Fit (`contain`), Repeat (`repeat`) | Cover (`cover`) | Cover fills the sheet and crops the edges, fit keeps the whole image inside, repeat tiles it. |
| Texture scale | 0.05 to 8 | 1 | How large the image is drawn; 1 is its fitted size. Repeat tiles it at its own size times this. |

References: `texture`.
<!-- generated:end -->

## Using it

Paper is the bottom layer of every map. It's one flat colour that fills the sheet, so it sets the base tone everything else is drawn over. There is always exactly one, and it can't be deleted or duplicated.

Pick a colour that suits the look you want, such as an off-white for a parchment feel. Aspect sets the shape of the sheet: square, 4:3 or 16:10.

An image can go over the colour: choose a Texture, such as a scan of old paper. Mix with paper says how it sits on the colour. Multiply lets the colour show through the light parts of the image, so a white scan takes on the paper colour. Image only shows the image as it is. Texture fit sets how it fills the sheet: cover fills it and crops the edges, fit keeps the whole image inside, and repeat tiles it. Texture scale makes the image larger or smaller. The campaign stores the image's path, not the image, so keep the file where it is. If the file goes missing, the paper shows just its colour until it comes back.
