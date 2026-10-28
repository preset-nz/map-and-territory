---
title: Setting
node: palette
group: theme
category: colour
summary: "The world a map is drawn in: its terrains and their colours, for the maps that follow it."
---

# Palette

<!-- generated:begin — preset-docs rewrites this block; write outside it -->
The world a map is drawn in: its terrains and their colours, for the maps that follow it.

| Control | Range | Default | What it does |
|---|---|---|---|
| Name | text | empty | What the setting is called. |
| Description | text | empty | A line on the world the setting gives a map. |
| Grid line | colour | #000000 | The colour of the hex grid lines when a grid follows the setting. |
| Primary | colour | #000000 | The setting's main colour. |
| Secondary | colour | #000000 | The setting's second colour. |
| Accent | colour | #000000 | The setting's highlight colour. |
| Background | colour | #ffffff | The setting's background colour. |
| Terrains | structured | empty | The terrains painted with this setting: each a name, a base type, traits and a colour. |
<!-- generated:end -->

## Using it

A setting is the world a map is drawn in: its terrains and their colours. The terrains are what Freeform and Hex Noise paint with, and the grid line colour is what the hex grid uses by default. Maps and the campaign follow a setting, so changing the one they follow recolours every layer drawn from it.

The strip under the inspector shows the active map's setting: a swatch for each terrain, its name and type on hover, and its other colours in a row below. Click a terrain to paint with it.

The app ships with nine ready-made settings to start from.
