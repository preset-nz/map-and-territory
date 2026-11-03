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

The app ships with nine ready-made settings to start from. To pick one, select the campaign and choose it in the **Setting** field. Maps follow the campaign's setting. To draw one map in another, select the map and choose a different setting in its **Setting** field. Choose the first entry, **Campaign's**, to follow the campaign again. Each choice is one step in Edit ▸ Undo.

The nine are Doom Forge, Space Opera, Event Horizon, Gloomy Garden, Excess Throne, Data Nexus, Street Level, Brittle Empire and Hostile Waters. Eight have five terrains, one each for water, plains, forest, hills and mountains; Hostile Waters has ten, all water. Each has a grid line colour. Doom Forge has Blood Mires (a dark red water), Bone Fields (pale grey plains), Ash Thickets, Iron Graves and Doom Crags; its grid line is #333333. Brittle Empire has Salt Marshes, Burnt Plains, Withered Groves, Crumbling Estates and Fallen Citadels, in mostly tans and browns; its grid line is #2a1a15.

On a zine page the setting is the colour of the printed map. It reaches three places. Freeform layers and Hex Noise layers in Paint mode paint terrain in the setting's colours. The hex grid draws its lines in the setting's grid line colour while its Setting colour is on. Titles, compasses and location names print in the grid's ink, so the grid line colour is their colour too. The Paper layer's Colour is the paper's own and does not change with the setting.

## Recipes

**Clean booklet.** Set Brittle Empire on the campaign. Its terrains are mostly tans and browns, and its grid line is a dark brown to match. Leave the maps on Campaign's.

**Grimdark zine.** Set Doom Forge on the campaign. Blood Mires, Bone Fields and Ash Thickets give red, pale grey and grey ground, with Doom Crags in yellow for the peaks. Give one map a different setting, such as Hostile Waters, by selecting the map and choosing it in its Setting field, so a flooded level reads as another place.
