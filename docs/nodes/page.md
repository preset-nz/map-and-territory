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

A page belongs to a booklet: set the campaign's Booklet to a spine booklet or stapled pages and it gets a cover, a page for each map in order, and a back. A spine booklet goes in fours, so adding pages adds four; stapled pages add one, or two when double-sided. Each page shows at most one map, and a map sits on one page only. Set Booklet back to None and the campaign prints as a collection of maps again; the pages stay for next time.
