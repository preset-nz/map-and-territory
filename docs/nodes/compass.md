---
title: Compass
node: compass
group: furniture
category: furniture
summary: A compass that shows where north is, printed over the grid.
---

# Compass

<!-- generated:begin — preset-docs rewrites this block; write outside it -->
A compass that shows where north is, printed over the grid.

| Control | Range | Default | What it does |
|---|---|---|---|
| Name | text | Compass | What it is called in the scene list. |
| Visible | on or off | on | Whether the layer is drawn. |
| Opacity | 0 to 1 | 1 | How much of the layer shows through; 0 hides it, 1 draws it in full. |
| Blend | Normal (`normal`), Multiply (`multiply`), Screen (`screen`), Overlay (`overlay`), Darken (`darken`), Lighten (`lighten`) | Normal (`normal`) | How the layer mixes with the layers beneath it. |
| Style | Mark (`mark`), Arrow (`arrow`), Cross (`cross`) | Mark (`mark`) | How the compass is drawn: a plain cross with a crossbar, a split arrow, or four split points. Changing it also sets Labels to the style's own. |
| Labels | N, E, S, W (`cardinal`), North only (`north-only`), None (`none`) | North only (`north-only`) | Which directions are named: all four, north only, or none. Mark and Arrow point one way, so they only ever name north. |
| North word | text | empty | A word to print for north instead of N. Blank prints N. |
| East word | text | empty | A word to print for east instead of E. Blank prints E. |
| South word | text | empty | A word to print for south instead of S. Blank prints S. |
| West word | text | empty | A word to print for west instead of W. Blank prints W. |
| North | -180° to 180° | 0° | Where north points, turned clockwise from straight up. The labels stay upright. |
| Size | 16 px to 400 px | 160 px | How wide the compass is: the disc behind it, edge to edge. |
| Points | 0.2 to 1.2 | 0.75 | How far the points reach within the disc: 1 reaches its edge, more runs past it. The labels sit just outside the points. |
| Anchor | Top left (`top-left`), Top centre (`top-centre`), Top right (`top-right`), Bottom left (`bottom-left`), Bottom centre (`bottom-centre`), Bottom right (`bottom-right`) | Top right (`top-right`) | Which corner or edge of the paper the compass sits at. |
| Inset | 0 px to 200 px | 24 px | How far the compass sits in from the paper's edges. |
| Backing | on or off | on | A plain disc in the paper's colour behind the compass, so busy terrain doesn't show through it. |
| Ring | on or off | on | A line round the disc, drawn in the compass's hand. |
| Face | Map (`map`), Condensed (`condensed`), Serif (`serif`), Blackletter (`blackletter`), Marker (`marker`) | Map (`map`) | The lettering of the labels. Map follows the map's face. |
| Hand | Map (`map`), Clean (`clean`), Drawn (`drawn`), Scratched (`scratched`) | Map (`map`) | How the compass is drawn and its labels lean. Map follows the map's hand. |
<!-- generated:end -->

## Using it

Layer ▸ Add Compass puts a compass on the active map: a Mark, just a cross with N above it, in the top-right corner, over the grid. It prints in the grid's ink on a disc of the paper's colour, ringed by a line (switch Ring off for a bare disc), and lists with the titles above the layers in the scene panel.

Style picks the drawing. Mark is two square-ended strokes, the crossbar a little above the middle. Arrow is a single north arrow, split down the middle into an inked half and a paper half. Cross is four points, each split the same way, so the compass reads in one ink. Changing the style sets Labels to the style's own (Cross names all four directions, Mark and Arrow only north), and one Undo puts both back.

Labels picks which directions are named, and the four words print something else in their place: type Throne as the North word and Throne prints over the compass instead of N; clear it to bring N back. A direction the labels leave out stays out, whatever is typed, and Mark and Arrow only ever name north. The words the compass won't print are greyed.

Size sets how wide the compass is, disc and all, and Points how far the points reach inside the disc: smaller leaves a wide margin of paper inside the ring, 1 runs the tips to the ring, and more runs them past it. The words follow the points in. North turns the compass clockwise, for a map drawn turned to its road or coast. The points turn and the words move with them, but stay upright, and the compass stays where it is. Condensed and Marker set the words in capitals.

Face and Hand start on Map, as a title's do: change the map to Scratched and the compass is scratched in with it. Drawn and Scratched wobble every line of the points, and both halves of a point follow the same wobble down its middle. The ring is drawn in the same hand; the disc stays clean. The words keep clear of the lines however far a hand makes them stray.
