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
| Hairline | on or off | off | Always the thinnest line the output can draw: one screen pixel at any zoom, one pixel of the 300 dpi export on paper. Line width and width noise don't apply. |
| Line style | Solid (`solid`), Dashed (`dashed`), Dotted (`dotted`), Dash-dot (`dash-dot`) | Solid (`solid`) | Whether the grid lines are unbroken, dashed, dotted, or dashes and dots in turn. |
| Dash length | 1 to 20, or more | 4 | How long each dash is, in line widths. Each edge stretches the pattern slightly so it fits whole repeats. |
| Gap length | 0.5 to 20, or more | 2 | The empty space between dashes and dots, in line widths. |
| Seed | text | grid | The text the grid's misregistration and corner jitter grow from; the same seed always gives the same grid. |
| Misregistration | 0 px to 12 px, or more | 0 px | How far the whole grid sits off the paper, as if printed out of register. The seed picks the direction. |
| Corner jitter | 0 px to 8 px, or more | 0 px | How far each corner of the grid wanders from its place, up to this distance. The lines stay joined but go irregular. |
| Width noise | 0 to 1 | 0 | How much the line swells and thins along its length, like a pen with uneven pressure. At 1 it goes from almost nothing to double its width. Solid lines only. |
| Noise scale | 2 px to 200 px, or more | 24 px | The length of one swell along the line. Solid lines only. |
| Join at corners | on or off | on | Make the lines that meet at a corner the same width there, so they join cleanly. Off, each line has its own swells and widths jump at corners. Solid lines only. |
| Ink noise | 0 to 1 | 0 | How uneven the ink is: patches where the line is stronger and weaker, with a fine grain over them, like a print with uneven ink. It never goes lighter than the line's colour at full strength, and some ink always remains. |
| Ink scale | 4 px to 400 px, or more | 40 px | The size of one patch of stronger or weaker ink. |
<!-- generated:end -->

## Using it

The hex grid sits on top of every other layer and sets the size and orientation of the hexes that Hex Noise, Freeform and Outline are laid out on. There is always exactly one, and it can't be deleted or duplicated.

Sizes are in the paper's pixels, which scale with the window and the export, so the same map shows the same hexes and line weights everywhere. Change Hex size to make the map coarser or finer. Pointy-top and flat-top change how every hex is laid out, so choose before you start painting. By default the lines take the palette's grid line colour; turn off Palette colour to use your own. A low Line strength keeps the grid in the background. Hairline draws the thinnest line the output can: one pixel on screen however far you zoom, and one pixel of the 300 dpi export on paper. Line width and the width noise fields are greyed out while it is on; dashes, misregistration, jitter and ink noise still do. Line style turns the lines dashed, dotted or dash-dot; Dash length and Gap length are in line widths, so a thicker line keeps the same rhythm, and they are greyed out while the style is Solid. Each edge between two hexes is drawn once, and its pattern is stretched a little so a whole number of repeats fits and every corner gets ink. Seed, Misregistration and Corner jitter make the grid look printed by hand: Misregistration slides the whole grid off the paper by that many pixels, in a direction the seed picks, and Corner jitter moves every corner by up to that many pixels so the lines stay joined but go irregular. Both are 0 by default, and the same seed always gives the same grid, however you pan, zoom or resize. With jitter on, a dashed grid fits each edge's own length. Width noise makes a solid line swell and thin along its length, like a pen with uneven pressure: at 1 it goes from almost nothing to double its width, and never breaks. Noise scale is the length of one swell. With Join at corners on, the lines meeting at a corner are the same width there; off, each line has its own swells and widths jump at corners. Width noise draws solid lines only, so the three fields are greyed out for dashed and dotted lines and for a hairline, and it follows the grid's seed, misregistration and jitter. Ink noise makes the ink itself uneven, like a print with too little ink in places: the line stays the same colour but is stronger in some patches and weaker in others, with a fine grain over them. Ink scale is the size of a patch. It works with every line style, never lightens the line past its colour, always leaves some ink, and follows the grid's seed and misregistration, so it stays put when you pan, zoom or resize.
