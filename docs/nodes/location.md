---
title: Location
node: location
group: object
summary: "One named place on the map: a hex, its name and what is there."
---

# Location

<!-- generated:begin — preset-docs rewrites this block; write outside it -->
One named place on the map: a hex, its name and what is there.

| Control | Range | Default | What it does |
|---|---|---|---|
| Name | text | Location | Printed beside the marker and in the key. |
| Note | text | empty | A short second line printed under the name: "ford, deep in spring". |
| Description | text | empty | Who holds it, what waits there: for the key and for you. |
| Category | Settlement (`settlement`), Stronghold (`stronghold`), Dungeon (`dungeon`), Ruin (`ruin`), Lair (`lair`), Shrine (`shrine`), Landmark (`landmark`), Other (`other`) | Landmark (`landmark`) | What kind of place it is. |
| Size | 0.5 to 3 | 1 | Its marker and name against the layer's size: 2 for a city among villages. |
| Hexes | structured | empty | Where it is: one hex for a place, several for an area. |
| Hidden | on or off | off | A secret for the map's owner: dashed and faint in the window, left out of an export. |
<!-- generated:end -->

## Using it

A location is one place in a locations layer. Its name prints beside its marker; the note prints as a short second line under it ("ford, deep in spring"). The description is for the key and for you. Category says what kind of place it is.

A place can cover an area, a marsh or a forest. Select it, then shift-click hexes with Add Location to grow it into them, or shift-click one of its own to take it out. An area draws a faint tint inside a dashed edge, with its marker and name in the middle.

Hidden makes it a secret: it draws faint, with a dashed ring, so you can see it while you run the game, and an export leaves it out. The other places keep their numbers, so the printed map matches your window.

On a zine page a location is a mark on the map and a line in the key. The number on the map is the number in the key, beside the place's name, its category and its description. Name is the place as the players will read it; Note adds the short second line on the map. Description is the line the key prints, so put who holds the place and what waits there in it. Category appears in the key, as "Shrine" or "Lair". Size scales this place's marker and name against the layer's Size, so 2 makes a city stand out among villages, and runs from 0.5 to 3.

A location takes its look from its layer. The layer's Marker, Name style and Face apply to it, and Face follows the map's Face while it stays on Map. A location has no Hand of its own and does not follow the map's. Names print in the hex grid's ink. The number comes from the place's order in the scene panel, so changing the order renumbers the key. A place in a layer with Visible off is left out of the printed key as well as the map.

## Recipes

**Clean map.** Name "Harrow Ford", Note "ford, deep in spring", Category Landmark, Size 1, and a one-sentence Description for the key. On its layer, Marker Number and Name style Plain.

**Grimdark map.** Name "The Salt Throne", Category Lair, Size 1.5 so the main threat stands out, and a Description that names what holds it. Mark a secret with Hidden on, so it shows faint in the window and the printed key leaves it out. On its layer, Name style Glow or Label so the names read over dark ground.
