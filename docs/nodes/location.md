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
| Hexes | structured | empty | Where it is: one hex for a place, several for an area. |
| Hidden | on or off | off | A secret for the map's owner: dashed and faint in the window, left out of an export. |
<!-- generated:end -->

## Using it

A location is one place in a locations layer. Its name prints beside its marker; the note prints as a short second line under it ("ford, deep in spring"). The description is for the key and for you. Category says what kind of place it is.

A place can cover an area, a marsh or a forest. Select it, then shift-click hexes with Add Location to grow it into them, or shift-click one of its own to take it out. An area draws a faint tint inside a dashed edge, with its marker and name in the middle.

Hidden makes it a secret: it draws faint, with a dashed ring, so you can see it while you run the game, and an export leaves it out. The other places keep their numbers, so the printed map matches your window.
