---
title: Palette
node: palette
group: theme
category: colour
summary: A set of colours and terrains for the maps that follow it.
---

# Palette

<!-- generated:begin — preset-docs rewrites this block; write outside it -->
A set of colours and terrains for the maps that follow it.

| Control | Range | Default | What it does |
|---|---|---|---|
| Name | text | empty | What the palette is called. |
| Description | text | empty | A line on the look the palette gives a map. |
| Grid line | colour | #000000 | The colour of the hex grid lines when a grid follows the palette. |
| Primary | colour | #000000 | The palette's main colour. |
| Secondary | colour | #000000 | The palette's second colour. |
| Accent | colour | #000000 | The palette's highlight colour. |
| Background | colour | #ffffff | The palette's background colour. |
| Terrains | structured | empty | The terrains painted with this palette: each a name, a base type, traits and a colour. |
<!-- generated:end -->

## Using it

A palette is a set of colours and terrains. The terrains are what Freeform and Hex Noise paint with, and the grid line colour is what the hex grid uses by default. Maps and the campaign refer to a palette, so changing the palette they follow recolours every layer drawn from it.

The app ships with nine ready-made palettes to start from.
