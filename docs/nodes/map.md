---
title: Map
node: map
group: document
category: document
summary: "One hexmap in the campaign: a paper, a hex grid and the layers between them."
---

# Map

<!-- generated:begin — preset-docs rewrites this block; write outside it -->
One hexmap in the campaign: a paper, a hex grid and the layers between them.

| Control | Range | Default | What it does |
|---|---|---|---|
| Name | text | empty | What you call the map. |
| Description | text | empty | Notes about this map, such as the region it covers. |
| Layout | Map on top, key below (`map-top`), Map on top, key in two columns (`map-top-2col`), Map on top, key in three columns (`map-top-3col`), Key on top, map below (`map-bottom`), Map alone, key on its own pages (`map-full`) | Map on top, key below (`map-top`) | Where the map sits on its page and where its key goes. The map keeps its shape; a long key runs on to more pages. |
| Visible | on or off | on | Whether the map is shown. |
| Face | Condensed (`condensed`), Serif (`serif`), Blackletter (`blackletter`), Marker (`marker`) | Condensed (`condensed`) | The lettering of every title left on Map: a condensed sans in capitals, an old atlas serif, blackletter, or a marker in capitals. |
| Hand | Clean (`clean`), Drawn (`drawn`), Scratched (`scratched`) | Clean (`clean`) | How every title left on Map is drawn: ruled, pen-drawn, or scratched in and gone over twice. |

References: `palette`.
<!-- generated:end -->

## Using it

A map is one sheet of the campaign: a region, a dungeon level, a town. Each map holds a paper at the bottom, a hex grid on top, and any layers you add between them. Add a new one from the Map menu.

Give maps plain names so the list reads like your session notes. If a map should look different from the rest, give it its own setting; otherwise leave it to follow the campaign's.

Face and Hand are the map's sheet style: every title on the map left on Map letters itself in the map's face and is drawn in its hand, so one change restyles the whole sheet.
