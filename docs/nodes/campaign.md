---
title: Campaign
node: campaign
group: document
category: document
summary: "The whole document: its maps, its settings and the notes that go with them."
---

# Campaign

<!-- generated:begin — preset-docs rewrites this block; write outside it -->
The whole document: its maps, its settings and the notes that go with them.

| Control | Range | Default | What it does |
|---|---|---|---|
| Name | text | empty | What you call the campaign. |
| Description | text | empty | Notes about the campaign, such as its setting or premise. |
| Page size | A5 (`a5`), A4 (`a4`) | A5 (`a5`) | The paper every map in the campaign is exported onto. A4 is A5 enlarged, so the map looks the same. |
| Page orientation | Portrait (`portrait`), Landscape (`landscape`) | Portrait (`portrait`) | Whether the page is taller than it is wide, or wider than it is tall. |
| Page margin | 0 mm to 40 mm | 10 mm | The plain white border around everything on a printed page. |
| Booklet | None, a collection of maps (`none`), Spine booklet (`spine`), Stapled pages (`stapled`) | None, a collection of maps (`none`) | A loose collection of maps, each printed on its own pages, or a booklet of pages: cover, pages, back. |
| Double-sided | on or off | on | Stapled pages printed on both sides, so pages are added in twos. |

References: `palette`.
<!-- generated:end -->

## Using it

A campaign is the file you save: one `.campaign` document holding every map for a game, plus the settings they draw from. Each file has exactly one, and you can't delete or duplicate it.

Name it after the game or the setting, and use the description for whatever you want to find again. The setting chosen here is the one every map falls back on, so choosing a setting for the campaign gives all its maps the same look. A map can still pick its own.

## The page

The page settings say what paper the campaign prints on. Every map in the campaign is exported onto the same page, which keeps a printed set looking like one book.

Page size is A5 or A4. A4 is A5 enlarged, so the map has the same hexes and the same look, only bigger. Orientation turns the page between portrait and landscape. Margin is the plain white border between the page edge and the map, from 0 to 40 mm; the paper colour and texture stay inside the map. A new campaign is A5 portrait with a 10 mm margin, and so is any campaign saved before these settings existed.

## The booklet

On a zine the campaign is the whole publication, and Booklet says whether it is a booklet at all. None, a collection of maps, keeps the maps loose. Spine booklet and Stapled pages give the campaign a cover, a page for each map and a back; see [Page](page.md). A spine booklet is built in fours. Stapled pages are built one at a time, or two at a time while Double-sided is on. Double-sided has no effect on a spine booklet or on a collection. Changing Booklet or Double-sided is one step in Edit ▸ Undo.

## Recipes

**Clean booklet.** Setting Brittle Empire, Page size A5, Page orientation Portrait, Page margin 10 mm, Booklet Spine booklet. The default margin leaves a plain white border, and a clean look comes from the maps: a thin grid and Hand set to Clean on each map.

**Grimdark zine.** Setting Doom Forge, Page size A5, Page orientation Portrait, Page margin 6 mm, Booklet Stapled pages, Double-sided off. A smaller margin gives each map more of the page. Name the campaign for the place it describes and put the premise in Description, where you can find it again.

**What follows the campaign.** Every map without a setting of its own draws with the campaign's Setting, so the terrain colours of Freeform and Hex Noise layers and the grid line colour change together. The page size, orientation and margin apply to every map's export.
