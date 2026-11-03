---
title: Page
node: page
group: document
summary: "One page of a booklet: the cover, the back, or a page between that may show a map."
---

# Page

<!-- generated:begin — preset-docs rewrites this block; write outside it -->
One page of a booklet: the cover, the back, or a page between that may show a map.

| Control | Range | Default | What it does |
|---|---|---|---|
| Name | text | Page | What you call the page. |

References: `map`.
<!-- generated:end -->

## Using it

A page belongs to a booklet. On a zine it fixes where each map sits in the running order: the cover first, the back last, and the maps on the pages between. Set the campaign's Booklet to Spine booklet or Stapled pages and it gets a cover, a page for each map in order, and a back. A spine booklet goes in fours, so Map ▸ Add Pages adds four; stapled pages add one, or two when Double-sided is on. Each page shows at most one map, and a map sits on one page only. Set Booklet back to None and the campaign is a collection of maps again; the pages stay in the file for when you choose a booklet again.

The scene panel lists the pages in order, with each page's map under it, and the maps on no page under Not on a page. Right-click a page and choose Map to put one of those maps on it, or No Map to take it off. Name is the only setting a page has: rename a page for the room or region it holds, since Cover and Back are the names the first and last start with.

A booklet always keeps its cover, two pages and its back, in whole steps: deleting a page that would leave a spine booklet short of a four is refused, and pages aren't duplicated, since Add Pages adds the step. Turning Double-sided on adds a page when the count is odd.

## Recipes

**Clean booklet.** Campaign: Booklet Spine booklet, Page size A5, Page orientation Portrait, Page margin 10 mm. Eight pages is a cover, six between and a back, in two steps of four. Put one map on each inner page, in the order the reader meets them.

**Grimdark zine.** Campaign: Booklet Stapled pages, Double-sided off, Page margin 6 mm. Map ▸ Add Pages adds one page at a time. Name the inner pages for the places they hold, such as Blood Mires or The Salt Throne.
