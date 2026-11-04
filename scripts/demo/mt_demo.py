#!/usr/bin/env python3
"""A scripted demo of Map & Territory: Untitled to a printed zine page in about 90 s.

    just demo                 # record ~/rhizomatic-preset/renders/mt-demo-<date>.mov, an edit
                              # (-edit.mp4, 1920x1200 H.264, no audio) ending on the printed
                              # page, and a poster (-poster.jpg); copies go to
                              # ~/Desktop/Claude/m-and-t-demo/
    just demo --rehearse      # the same moves, short holds, no recording
    just demo --recut         # the edit again from today's take and its .json
    just demo --kill          # quit any running Map & Territory first (unsaved work lost)
    just demo --dev           # `just run` instead of the release bundle
    just demo --build         # `just build` even when the bundle looks current

The choreography is guidance/projects/map-and-territory/features/34-first-release/
demo-choreography.md. The take is the window, not the screen: demo-kit switches the display and
puts the window in the middle, and restores the display however the run ends.

The default build is the release bundle (target/release/bundle/macos/Map & Territory.app),
rebuilt with `just build` when it is older than src/, src-tauri/src/ or crates/. Every
Map & Territory build shares the process name `map-and-territory` and the bundle id, so the
script refuses to start while one runs unless given --kill.

Every control is found by name in the accessibility tree; hexes are not in it, so the canvas
is mapped from the frame of "Map canvas" (the same arithmetic as src/render/geometry.ts) and
checked against the status bar's Hex readout before anything is painted. Standard library only.
"""

import argparse
import contextlib
import datetime
import json
import math
import os
import pathlib
import shutil
import subprocess
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parents[2]
DEMOKIT = ROOT.parents[1] / "packages" / "demo-kit"
sys.path.insert(0, str(DEMOKIT))

from demokit.edit import edit  # noqa: E402
from demokit.take import Take  # noqa: E402
from demokit.tools import Tools  # noqa: E402

BIN = DEMOKIT.parent / "target" / "demo"
# ui's pace (demo-kit ui.swift): a quicker glide to each control and quicker typing than its
# defaults, for a take of about two minutes (Georg, 2026-11-04)
os.environ.setdefault("DEMO_GLIDE_MS", "260")
os.environ.setdefault("DEMO_TYPE_MS", "28")
PROCESS = "map-and-territory"
BUNDLE_ID = "nz.preset.map-and-territory"
BUNDLE = ROOT / "target" / "release" / "bundle" / "macos" / "Map & Territory.app"
RENDERS = pathlib.Path.home() / "rhizomatic-preset" / "renders"
DESKTOP = pathlib.Path.home() / "Desktop" / "Claude" / "m-and-t-demo"
PLATE = "436d75"  # the app's accent: studio-site's .accent--map-territory

HOLD = 0.4  # scales every hold that paces the video; --rehearse shortens it

# -- the map ---------------------------------------------------------------------------------
# The take rebuilds the guide's Sallow Fen by hand: the map is read from its fixture, the
# campaign tests/window/fixtures/sallow-fen.campaign (written by crates/map-and-territory-model/
# tests/sallow_fen.rs), so the video and the guide show one map. Its first map only.

FIXTURE = ROOT / "tests" / "window" / "fixtures" / "sallow-fen.campaign"
PAPER = (1200, 750)  # paper px of a 16:10 map (src/render/geometry.ts, PAPER_LONG_SIDE)
CHUNK = 16  # crates/map-and-territory-model/src/freeform.rs

# Doom Forge's terrain for each base type the fixture paints (settings_2025.rs). A swatch is a
# button whose aria-label is describeTerrain (src/app/inspector/palette-strip.tsx).
SWATCH = {
    "water": "Blood Mires · Water",
    "forest": "Ash Thickets · Forest",
    "hills": "Iron Graves · Hills",
    "mountains": "Doom Crags · Mountains",
}
# Plains is the paper: the fixture paints it, the take leaves it unpainted and sets the paper's
# colour instead, so the ground is one colour with no brushwork.


def hex_colour(rgba) -> str:
    return "#" + "".join(f"{round(c * 255):02x}" for c in rgba[:3])


class Fen:
    """The fixture's first map, as the take needs it."""

    def __init__(self, path: pathlib.Path = FIXTURE):
        nodes = {n["path"]: n for n in json.loads(path.read_text())["nodes"]}
        v = lambda p: nodes[f"/maps/map{p}"].get("values") or {}  # noqa: E731
        self.name = v("")["name"]
        self.orientation = nodes["/campaign/campaign"]["values"].get("pageOrientation", "portrait")
        self.paper = hex_colour(v("/paper")["color"])
        self.grid = v("/hexgrid")
        self.terrain_opacity = v("/freeform").get("opacity", 1.0)
        self.title = v("/title")
        self.compass = v("/compass")
        self.cells = {}
        for p, n in nodes.items():
            if p.startswith("/maps/map/freeform/") and n["type"] == "chunk":
                cq, cr = map(int, p.rsplit("/", 1)[1].split("_"))
                vox = n["values"]["voxels"]
                i = 0
                for tok in vox["cells"].split():
                    val, star, cnt = tok.partition("*")
                    n_ = int(cnt) if cnt else (CHUNK * CHUNK - i if star else 1)
                    for _ in range(n_):
                        if int(val):
                            self.cells[(cq * CHUNK + i % CHUNK, cr * CHUNK + i // CHUNK)] = \
                                vox["palette"][int(val) - 1]["terrainId"]
                        i += 1
        self.outlines = [v(s) for s in ("/outline", "/outline-2")]
        self.places = [n["values"] for p, n in sorted(nodes.items())
                       if p.startswith("/maps/map/locations/") and not n["values"].get("hidden")]

    def islands(self):
        """Each connected patch of one terrain, plains left out, largest first, as
        (terrain, cells, inner): inner are the cells whose six neighbours are all in the patch,
        so painting the rest rings them and one Fill click covers them."""
        seen, out = set(), []
        for c, t in sorted(self.cells.items()):
            if c in seen or t not in SWATCH:
                continue
            patch, todo = [], [c]
            seen.add(c)
            while todo:
                x = todo.pop()
                patch.append(x)
                for n in neighbours(x):
                    if n not in seen and self.cells.get(n) == t:
                        seen.add(n)
                        todo.append(n)
            inner = {x for x in patch if all(self.cells.get(n) == t for n in neighbours(x))}
            out.append((t, patch, inner))
        return sorted(out, key=lambda i: (-len(i[2]), -len(i[1])))


def neighbours(c):
    q, r = c
    return [(q + 1, r), (q - 1, r), (q, r + 1), (q, r - 1), (q + 1, r - 1), (q - 1, r + 1)]


def tour(cells):
    """One walk through every cell, hex to neighbouring hex, as a hand would sweep a brush:
    on to an unvisited neighbour, keeping its heading where it can; when none is left, back
    through painted cells (same terrain, so harmless) to the nearest unvisited one."""
    cells = set(cells)
    if not cells:
        return []
    at = min(cells, key=lambda c: (c[1], c[0]))
    path, left, heading = [at], cells - {at}, (1, 0)
    while left:
        near = [n for n in neighbours(at) if n in left]
        if near:
            nxt = max(near, key=lambda n: (n[0] - at[0]) * heading[0] + (n[1] - at[1]) * heading[1])
            heading = (nxt[0] - at[0], nxt[1] - at[1])
            path.append(nxt)
            left.discard(nxt)
            at = nxt
            continue
        # breadth-first through the island to the nearest unvisited cell
        back, todo = {at: None}, [at]
        found = None
        while todo and not found:
            x = todo.pop(0)
            for n in neighbours(x):
                if n in cells and n not in back:
                    back[n] = x
                    if n in left:
                        found = n
                        break
                    todo.append(n)
        if not found:  # a cell not joined to the rest: a new stroke starts there
            return path + [None] + tour(left)
        way = []
        while found != at:
            way.append(found)
            found = back[found]
        path += reversed(way)
        at = path[-1]
        left.discard(at)
    return path


def corner_key(q: int, r: int, i: int) -> tuple[int, int]:
    """A corner's place, so the three hexes that share it name one corner (unit hex size)."""
    a = math.radians(-30 + 60 * i)
    return (round((math.sqrt(3) * (q + r / 2) + math.cos(a)) * 1000),
            round((1.5 * r + math.sin(a)) * 1000))


def corner_steps(start, reach: int = 60) -> dict:
    """Edges from `start` to every corner within `reach`: breadth first over hex edges."""
    nxt = {}
    q0, r0 = start[0], start[1]
    for q in range(q0 - 14, q0 + 15):
        for r in range(r0 - 14, r0 + 15):
            for i in range(6):
                k = corner_key(q, r, i)
                for j in ((i + 1) % 6, (i + 5) % 6):
                    nxt.setdefault(k, set()).add(corner_key(q, r, j))
    s = corner_key(*start)
    dist, todo = {s: 0}, [s]
    while todo:
        k = todo.pop(0)
        if dist[k] >= reach:
            continue
        for n in nxt.get(k, ()):
            if n not in dist:
                dist[n] = dist[k] + 1
                todo.append(n)
    return dist


MAX_RUN = 8


def turns(corners) -> list:
    """The corners to click so the Outline tool, which joins two clicks by a shortest run of hex
    edges (src/lib/outline/geometry.ts interpolateCorners), draws the whole path: the first, then
    from each click the farthest corner the path still reaches by a shortest run."""
    path = [(c["q"], c["r"], c["corner"]) for c in corners]
    out, k = [path[0]], 0
    while k < len(path) - 1:
        dist = corner_steps(path[k])
        j = k + 1
        # at most MAX_RUN edges per click: between far corners many shortest runs tie, and the
        # tool's pick may wander from the line
        while j + 1 < len(path) and j + 1 - k <= MAX_RUN and dist.get(corner_key(*path[j + 1])) == j + 1 - k:
            j += 1
        out.append(path[j])
        k = j
    return out


# The notes printed under each place's name: the guide's picture of the places
# (docs/guides/img/places.webp); the fixture has none. Georg, 2026-11-04: "I like that".
NOTES = {
    "Reedwall Keep": "Bishop's men, twelve spears",
    "The Weeping Well": "Water that tastes of salt",
    "Gallows Ford": "Knee-deep in spring",  # Georg's, in his tweak of the take
}
# The compass turned, as for a map drawn at an angle (Georg, 2026-11-04).
COMPASS_NORTH = 18


# A faint print over the terrain (Georg's tweak of the take, 2026-11-04): his urchin drawing,
# kept outside the repo, on an image layer at Blend Multiply.
TEXTURE = RENDERS / "mt-demo-urchin.jpeg"
TEXTURE_OPACITY = 0.17
TEXTURE_SCALE = 1.65


# Hexes near the paper's four corners, for the mapping check (at Hex size 38).
CHECK_HEXES = [(-5, -5), (9, -4), (-9, 4), (5, 5)]

# The setting the take switches to (Georg, 2026-11-04): a fen in Gloomy Garden. Its plains,
# Bog Rot, is the paper's colour, so the ground is paper rather than paint.
SETTING = "Gloomy Garden"
PAPER_COLOUR = "#deb887"
SWATCH = {
    "water": "Plague Pools · Water",
    "forest": "Rust Gardens · Forest",
    "hills": "Bone Mounds · Hills",
    "mountains": "Miasma Peaks · Mountains",
}

# -- the take's clock ------------------------------------------------------------------------


def hold(seconds: float) -> None:
    """A pause that paces the video for a viewer. Waits for the app poll instead."""
    time.sleep(seconds * HOLD)


@contextlib.contextmanager
def _nothing():
    yield


class NullTake:
    """Stands in for a Take in a rehearsal: nothing is recorded."""

    def wait(self, label: str = ""):
        return _nothing()

    def note(self, caption: str, seconds: float = 1.8) -> None:
        pass

    def chapter(self, title: str) -> None:
        pass

    def now(self) -> float:
        return 0.0


def poll(what: str, probe, timeout: float = 15.0, every: float = 0.25):
    """Calls `probe` until it returns something truthy; stops the run when it doesn't."""
    end = time.monotonic() + timeout
    while True:
        got = probe()
        if got:
            return got
        if time.monotonic() > end:
            raise SystemExit(f"timed out after {timeout:g} s waiting for {what}")
        time.sleep(every)


# -- the accessibility tree --------------------------------------------------------------------


class Entry:
    """One line of `ax dump`: role, name, value, frame."""

    def __init__(self, role, name, value, x, y, w, h):
        self.role, self.name, self.value = role, name, value
        self.x, self.y, self.w, self.h = x, y, w, h

    @property
    def label(self) -> str:
        return self.name.split(" | ")[0]

    @property
    def cx(self) -> int:
        return round(self.x + self.w / 2)

    @property
    def cy(self) -> int:
        return round(self.y + self.h / 2)


def parse_dump(text: str) -> list[Entry]:
    out = []
    for line in text.splitlines():
        parts = line.split("\t")
        if len(parts) < 4:
            continue
        try:
            pos, size = parts[3].split(" ")
            x, y = pos.split(",")
            w, h = size.split("x")
            out.append(Entry(parts[0], parts[1], parts[2], int(x), int(y), int(w), int(h)))
        except ValueError:
            continue
    return out


class Demo:
    """The app's window: finds things in the tree and maps hexes onto the screen."""

    def __init__(self, tools: Tools, take):
        self.tools = tools
        self.take = take
        self.frame = (0, 0, 0, 0)  # the window, x y w h in points
        self.canvas = (0.0, 0.0, 0.0, 0.0)  # x y w h in points
        self.size = 24.0  # the map's Hex size, as far as the mapping knows
        self.fen = Fen()
        self.tool = "Select"
        self.terrain = None

    # -- tree ----------------------------------------------------------------------------------

    def dump(self) -> list[Entry]:
        # The webview builds its tree on the first query; an empty dump is retried.
        for _ in range(20):
            entries = parse_dump(self.tools.ax_raw("dump").stdout)
            if entries:
                return entries
            time.sleep(0.25)
        raise SystemExit("ax dump: the tree is empty")

    def find(self, name: str):
        """Centre and size of the element named `name`, or None."""
        out = self.tools.ax_raw("find", name)
        return [int(v) for v in out.stdout.split()] if out.returncode == 0 else None

    def left(self, e: Entry) -> bool:
        return e.cx < self.canvas[0]

    def right(self, e: Entry) -> bool:
        return e.cx > self.canvas[0] + self.canvas[2]

    def scene_rows(self) -> list[Entry]:
        """The scene panel's rows, top first: what sits left of the canvas and names a node."""
        rows = [e for e in self.dump() if self.left(e) and e.role in ("AXRow", "AXStaticText", "AXGroup", "AXButton")]
        return sorted(rows, key=lambda e: (e.cy, e.cx))

    @staticmethod
    def named(e: Entry, name: str) -> bool:
        """A row called `name`, or `name` and a number: new layers are "Freeform 01"."""
        return any(t == name or (t.startswith(name + " ") and t[len(name) + 1:].isdigit()) for t in (e.label, e.value))

    def scene_row(self, name: str, n: int = 1):
        hits = [e for e in self.scene_rows() if self.named(e, name)]
        return hits[n - 1] if len(hits) >= n else None

    def map_row(self):
        """The new map's row: "Map 01", or the first row named "Map" and a number."""
        return self.scene_row("Map")

    def map_row(self):
        """The new map's row: "Map 01", or the first row named "Map" and a number."""
        return self.scene_row("Map")

    def count_rows(self, name: str) -> int:
        # a row may be several elements (the row, its text): count distinct lines
        return len({e.cy // 6 for e in self.scene_rows() if self.named(e, name)})

    def click_row(self, name: str, n: int = 1) -> None:
        row = poll(f"the scene row {name!r}", lambda: self.scene_row(name, n))
        self.tools.ui("click", row.cx, row.cy)

    def field(self, label: str):
        """The inspector's text field named `label`."""
        for e in self.dump():
            if self.right(e) and e.role.startswith("AXText") and e.role != "AXStaticText" and e.label == label:
                return e
        return None

    def status(self, label: str):
        """The status bar's value after the item labelled `label`: the AXStaticText after the one valued so."""
        entries = self.dump()
        for i, e in enumerate(entries):
            if e.role == "AXStaticText" and e.value == label:
                for f in entries[i + 1 :]:
                    if f.role == "AXStaticText":
                        return f.value
                return None
        return None

    # -- inspector -----------------------------------------------------------------------------

    def scroll_to(self, find_entry, what: str) -> None:
        """Scrolls the inspector until the element's centre is inside the canvas's rows."""
        cx, cy, cw, ch = self.canvas
        px = round(cx + cw + (self.frame[0] + self.frame[2] - cx - cw) / 2)
        for _ in range(30):
            # the inspector ends where the setting strip starts, not at the canvas's foot: a
            # field behind the strip can't be clicked (the first take's Cmd+A then selected the
            # page)
            strip = [e.y for e in self.dump() if self.right(e) and e.role == "AXGroup" and e.label == "Setting"]
            top, bottom = cy + 20, min([cy + ch] + strip) - 30
            e = find_entry()
            if e and top <= e.cy <= bottom:
                return
            down = e is None or e.cy > bottom
            self.tools.ui("scroll", px, round((top + bottom) / 2), 260 if down else -260)
            time.sleep(0.3)
        raise SystemExit(f"couldn't scroll {what} into view")

    def set_number(self, label: str, value) -> None:
        """Types into the inspector's number field: click, Cmd+A, the value, Return."""
        self.scroll_to(lambda: self.field(label), label)
        e = self.field(label)
        self.tools.ui("click", e.cx, e.cy)
        time.sleep(0.2)
        self.tools.key_code(0, "command")  # a
        self.tools.ui("type", str(value))
        self.tools.key_code(36)  # Return
        time.sleep(0.4)

    def set_text(self, label: str, text: str) -> None:
        self.set_number(label, text)

    def slide(self, label: str, to: float) -> None:
        def label_entry():
            for e in self.dump():
                if self.right(e) and e.role == "AXStaticText" and e.value == label:
                    return e
            return None

        self.scroll_to(label_entry, label)
        self.tools.slide(label, to)

    # -- keys ----------------------------------------------------------------------------------

    def tool_key(self, code: int, key: str, name: str) -> None:
        self.tool = name
        self.take.note(f"{key} · {name}")
        self.tools.key_code(code)
        poll(f"the status bar to say {name}", lambda: self.status("Tool") == name)

    def fit(self) -> None:
        """Fit in Window (Cmd+0), before every pointer step that follows a view change."""
        self.tools.key_code(29, "command")
        time.sleep(0.6)
        self.refresh_canvas()

    # -- canvas --------------------------------------------------------------------------------

    def refresh_canvas(self) -> None:
        cx, cy, w, h = poll("the Map canvas", lambda: self.find("Map canvas"))
        self.canvas = (cx - w / 2, cy - h / 2, float(w), float(h))

    def paper(self) -> tuple[float, float, float]:
        """The paper's screen rect and scale: src/render/geometry.ts computePaperRect and paperView."""
        x0, y0, w, h = self.canvas
        pad_x, pad_y = max(12.0, w * 0.05), 12.0
        avail_w, avail_h = max(0.0, w - pad_x * 2), max(0.0, h - pad_y * 2)
        aw, ah = 16.0, 10.0
        paper_w = avail_w
        paper_h = paper_w * ah / aw
        if paper_h > avail_h:
            paper_h = avail_h
            paper_w = paper_h * aw / ah
        left = x0 + pad_x + max(0.0, (avail_w - paper_w) / 2)
        top = y0 + pad_y  # top-aligned, not centred
        return left, top, paper_w / PAPER[0]

    def hex_xy(self, q: int, r: int) -> tuple[int, int]:
        """Screen points of hex (q, r)'s centre: pointy layout in paper px, then the paper's rect."""
        px = PAPER[0] / 2 + self.size * math.sqrt(3) * (q + r / 2)
        py = PAPER[1] / 2 + self.size * 1.5 * r
        left, top, fit = self.paper()
        return round(left + px * fit), round(top + py * fit)

    def check(self) -> None:
        """Moves to four hexes near the paper's corners and compares the status bar's Hex with
        what the mapping meant. A port that drifts from geometry.ts stops the run here."""
        for q, r in CHECK_HEXES:
            x, y = self.hex_xy(q, r)
            self.tools.ui("move", x, y)
            want = f"{q}, {r}"
            end = time.monotonic() + 4
            got = None
            while time.monotonic() < end:
                got = self.status("Hex")
                if got == want:
                    break
                time.sleep(0.25)
            if got != want:
                raise SystemExit(f"canvas mapping: hex ({want}) at {x}, {y} reads {got!r} in the status bar")

    def paper_xy(self, q: int, r: int) -> tuple[int, int]:
        """Hex (q, r)'s centre on screen, pulled inside the paper when the hex hangs off its
        edge: the fixture paints a border ring past the paper, and a pointer off the paper lands
        on the panels (the first rehearsal hid the map through its row's eye)."""
        left, top, fit = self.paper()
        px = PAPER[0] / 2 + self.size * math.sqrt(3) * (q + r / 2)
        py = PAPER[1] / 2 + self.size * 1.5 * r
        inset = 4.0
        px = min(max(px, inset), PAPER[0] - inset)
        py = min(max(py, inset), PAPER[1] - inset)
        return round(left + px * fit), round(top + py * fit)

    def click_hex(self, q: int, r: int) -> None:
        self.tools.ui("click", *self.hex_xy(q, r))

    def stroke(self, a, b, ms: int = 450) -> None:
        (x1, y1), (x2, y2) = self.hex_xy(*a), self.hex_xy(*b)
        self.tools.ui("drag", x1, y1, x2, y2, ms)

    def swatch(self, label: str) -> None:
        self.tools.click(label)
        time.sleep(0.3)

    # -- menus ---------------------------------------------------------------------------------

    def menu(self, bar: str, item: str) -> None:
        self.tools.menu(bar, item, note=self.take.note)

    # -- the steps (demo-choreography.md, step table) ------------------------------------------

    def choose(self, label: str, option: str) -> None:
        """A Select in the inspector: the combo box after the text `label`, then `option` in
        the list it opens (drawn last in the tree, so the last match)."""
        def combo():
            entries = self.dump()
            for i, e in enumerate(entries):
                if self.right(e) and e.role == "AXStaticText" and e.value == label:
                    return next((f for f in entries[i + 1:] if f.role == "AXComboBox"), None)
            return None

        self.scroll_to(combo, label)
        e = combo()
        if e.value == option:
            return
        self.tools.ui("click", e.cx, e.cy)
        hits = poll(f"the {option!r} option", lambda: [
            f for f in self.dump() if f.role != "AXComboBox" and (f.value == option or f.label == option)
            and f.y > 0])
        self.tools.ui("click", hits[-1].cx, hits[-1].cy)
        poll(f"{label} to read {option}", lambda: (combo() or Entry("", "", "", 0, 0, 0, 0)).value == option)
        time.sleep(0.3)

    def on_paper(self, q: int, r: int, i: int) -> bool:
        a = math.radians(-30 + 60 * i)
        px = PAPER[0] / 2 + self.size * (math.sqrt(3) * (q + r / 2) + math.cos(a))
        py = PAPER[1] / 2 + self.size * (1.5 * r + math.sin(a))
        return 0 <= px <= PAPER[0] and 0 <= py <= PAPER[1]

    def corner_xy(self, q: int, r: int, i: int) -> tuple[int, int]:
        """A hex corner on screen; the app's numbering, pointy-top: 0 at upper right, clockwise."""
        a = math.radians(-30 + 60 * i)
        px = PAPER[0] / 2 + self.size * (math.sqrt(3) * (q + r / 2) + math.cos(a))
        py = PAPER[1] / 2 + self.size * (1.5 * r + math.sin(a))
        left, top, fit = self.paper()
        return round(left + px * fit), round(top + py * fit)

    def step_01_untitled(self) -> None:
        """Untitled, then the campaign's setting and page: Gloomy Garden, landscape A5."""
        self.take.chapter("A campaign and a map")
        self.refresh_canvas()
        hold(2)
        self.click_row("Untitled Campaign")
        poll("the campaign's inspector", lambda: self.field("Name"))
        hold(0.6)
        self.choose("Setting", SETTING)
        hold(0.8)
        self.choose("Page orientation", self.fen.orientation.capitalize())
        hold(1)

    def step_02_new_map(self) -> None:
        self.menu("Map", "New Map")
        poll("the new map's Hex Grid row", lambda: self.scene_row("Hex Grid"))
        hold(2)

    def step_03_rename(self) -> None:
        """The map's name, its paper the setting's plains colour, and the guide's Hex size."""
        row = poll("the new map's row", lambda: self.map_row())
        self.tools.ui("click", row.cx, row.cy)
        poll("the Name field", lambda: self.field("Name"))
        self.set_text("Name", self.fen.name)
        poll("the renamed map's row", lambda: self.scene_row(self.fen.name))
        hold(1.5)
        self.click_row("Paper")
        poll("the paper's inspector", lambda: self.field("Hex"))
        self.set_text("Hex", PAPER_COLOUR)
        hold(1.5)
        self.click_row("Hex Grid")
        poll("the Hex size field", lambda: self.field("Hex size"))
        self.set_number("Hex size", f"{self.fen.grid['size']:g}")
        self.size = float(self.fen.grid["size"])
        self.fit()
        self.check()
        hold(1)

    def step_04_terrain(self) -> None:
        """A freeform layer, then the fen's terrain island by island: an island with an inside
        gets its rim painted and its inside filled with one click; the rest are painted. The
        first island at a viewer's pace, the others sped up in the edit."""
        self.take.chapter("Terrain")
        self.menu("Layer", "Add Freeform Layer")
        poll("the Freeform row", lambda: self.scene_row("Freeform"))
        hold(1)
        first, *rest = self.fen.islands()
        self.island(*first, ms=140, pace=True)
        hold(1.5)
        with self.take.wait("Painting the fen"):
            # one terrain after another, so each swatch is picked once
            for island in sorted(rest, key=lambda i: list(SWATCH).index(i[0]) - (i[0] == first[0]) * 9):
                self.island(*island, ms=70)
        if self.tool != "Paint":
            self.tool_key(18, "1", "Paint")
        hold(2)

    def island(self, terrain, cells, inner, ms: int, pace: bool = False) -> None:
        """The island in one flowing stroke (or one per separate part); with an inside, only its
        rim, then one Fill click inside it."""
        if self.terrain != terrain:  # a swatch already picked stays picked
            self.swatch(SWATCH[terrain])
            self.terrain = terrain
        if self.tool != "Paint":
            self.tool_key(18, "1", "Paint")
        filled = inner if len(inner) >= 2 else set()
        walk = tour([c for c in cells if c not in filled])
        part = []
        for c in walk + [None]:
            if c is not None:
                part.append(c)
                continue
            if part:
                pts = [v for h in part for v in self.paper_xy(*h)]
                self.tools.ui("stroke", max(250, ms * len(part)), *pts)
                if pace:
                    hold(0.3)
            part = []
        if filled:
            hold(0.6 if pace else 0)
            self.tool_key(20, "3", "Fill")
            inside = sorted(filled)[len(filled) // 2]
            self.click_hex(*inside)
            hold(1 if pace else 0.2)

    def step_04b_texture(self) -> None:
        """An image layer on the paper, before the terrain: the freeform layer added next lands
        above it, so the print shows only on bare paper (Georg, 2026-11-04)."""
        self.take.chapter("A texture on the paper")
        self.menu("Layer", "Add Image Layer")
        poll("the Image row", lambda: self.scene_row("Image"))
        hold(0.6)
        self.set_text("Name", "Texture")
        self.tools.click("Choose File…")
        self.tools.open_panel(TEXTURE)
        poll("the texture on the layer", lambda: self.find(TEXTURE.name), timeout=20)
        self.choose("Blend", "Multiply")
        self.slide("Opacity", TEXTURE_OPACITY)
        self.slide("Scale", (TEXTURE_SCALE - 0.05) / 7.95)  # 0.05..8
        hold(1.5)

    def step_05_grid(self) -> None:
        """The grid inked by hand, at the fixture's values."""
        self.take.chapter("The grid")
        g = self.fen.grid
        self.click_row("Hex Grid")
        poll("the grid's inspector", lambda: self.field("Hex size"))
        hold(0.6)
        self.slide("Line strength", g.get("alpha", 1.0))
        hold(0.6)
        self.set_number("Misregistration", f"{g.get('misregistration', 0):g}")
        self.set_number("Corner jitter", f"{g.get('cornerJitter', 0):g}")
        hold(0.6)
        self.slide("Width noise", g.get("widthNoise", 0))
        self.slide("Ink noise", g.get("inkNoise", 0))
        hold(2.5)

    def step_06_outlines(self) -> None:
        """The Edge of the Fen and the Old Road, corner by corner with the Outline tool."""
        self.take.chapter("Edges")
        for n, o in enumerate(self.fen.outlines):
            # the first line at a viewer's pace; the second, the same moves again, sped up
            with self.take.wait(f"Drawing the {o['name'].removeprefix('The ')}") if n else _nothing():
                self.outline(n, o)
            hold(1.5)

    def outline(self, n: int, o: dict) -> None:
        self.menu("Layer", "Add Outline Layer")
        poll("the new Outline row", lambda: self.count_rows("Outline") >= n + 1)
        hold(0.6)
        self.set_text("Name", o["name"])
        if o.get("strokeColor"):
            self.set_text("Hex", hex_colour(o["strokeColor"]))
        self.slide("Stroke width", (o.get("strokeWidth", 4) - 1) / 11)  # 1..12
        if o.get("strokePattern"):
            self.choose("Stroke pattern", o["strokePattern"].capitalize())
        self.tool_key(23, "5", "Outline")
        self.fit()
        # the fixture's lines run past the paper's edge; a click there misses the map
        on = [c for c in o["paths"][0]["corners"] if self.on_paper(c["q"], c["r"], c["corner"])]
        clicks = turns(on)
        for c in clicks:
            self.tools.ui("click", *self.corner_xy(*c))
            hold(0.35)
        # the last corner again ends the path
        self.tools.ui("click", *self.corner_xy(*clicks[-1]))

    def step_07_title_compass(self) -> None:
        self.take.chapter("Title and compass")
        t, c = self.fen.title, self.fen.compass
        self.menu("Layer", "Add Title")
        self.click_row("Title")
        poll("the title's inspector", lambda: self.field("Subtitle"))
        hold(0.6)
        self.set_text("Subtitle", t.get("subtitle", ""))
        self.set_text("Credit", t.get("credit", ""))
        self.choose("Frame", t.get("frame", "rule").capitalize())
        self.choose("Face", t.get("face", "map").capitalize())
        hold(1.5)
        self.menu("Layer", "Add Compass")
        self.click_row("Compass")
        poll("the compass's inspector", lambda: self.field("North word"))
        self.choose("Style", c.get("style", "mark").capitalize())
        self.choose("Anchor", c.get("anchor", "top-right").replace("-", " ").capitalize())
        self.slide("North", (COMPASS_NORTH + 180) / 360)  # -180..180
        hold(2.5)

    def step_08_places(self) -> float:
        """The fixture's places, numbered, each named. Returns the take's time when the last is
        named: the poster."""
        self.take.chapter("Places")
        self.fit()
        self.tool_key(22, "6", "Add Location")
        for i, p in enumerate(self.fen.places, 1):
            h = p["hexes"][0]
            self.click_hex(h["q"], h["r"])
            poll(f"place {i} in the scene panel", lambda: self.count_rows("Location") >= i)
            hold(0.6)
        for p in self.fen.places:
            # each named place leaves the "Location" rows, so the next is always the first
            self.click_row("Location", 1)
            poll("the place's Name field", lambda: self.field("Name"))
            self.set_text("Name", p["name"])
            if NOTES.get(p["name"]):
                self.set_text("Note", NOTES[p["name"]])
            poll(f"{p['name']} in the scene panel", lambda: self.scene_row(p["name"]))
            hold(0.6)
        at = self.take.now()
        hold(3)
        return at

    def step_09_export(self, pdf: pathlib.Path) -> None:
        self.take.chapter("Print it")
        pdf.parent.mkdir(parents=True, exist_ok=True)
        pdf.unlink(missing_ok=True)  # an old file would raise a Replace sheet
        self.tools.frontmost()
        time.sleep(0.5)
        self.tools.menu_path("File", "Export", "Map as PDF…", note=self.take.note)
        self.tools.save_panel(pdf)
        poll("the status bar to say Exported PDF.", lambda: self.find("Exported PDF."), timeout=30)
        if not pdf.exists():
            raise SystemExit(f"the status bar says exported, but {pdf} isn't there")
        hold(3)

    def step_10_printed_page(self, pdf: pathlib.Path, png: pathlib.Path) -> None:
        """The PDF's page as a PNG for the edit to hold for 4 s after the last frame."""
        self.take.chapter("The printed page")
        render_still(pdf, png)


def render_still(pdf: pathlib.Path, png: pathlib.Path) -> None:
    """qlmanage writes <pdf name>.png into the folder it is given; it moves to `png`."""
    tmp = png.parent / "ql"
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True)
    subprocess.run(["qlmanage", "-t", "-s", "2400", "-o", str(tmp), str(pdf)], check=True, capture_output=True)
    made = tmp / (pdf.name + ".png")
    if not made.exists():
        raise SystemExit(f"qlmanage made no {made}")
    made.replace(png)
    shutil.rmtree(tmp, ignore_errors=True)


# -- launching ------------------------------------------------------------------------------------


def running() -> bool:
    return subprocess.run(["pgrep", "-x", PROCESS], capture_output=True).returncode == 0


def newest_source() -> float:
    newest = 0.0
    for top in ("src", "src-tauri/src", "crates"):
        for dirpath, dirnames, filenames in os.walk(ROOT / top):
            dirnames[:] = [d for d in dirnames if d not in ("target", "node_modules")]
            for f in filenames:
                newest = max(newest, (pathlib.Path(dirpath) / f).stat().st_mtime)
    return newest


def ensure_bundle(force: bool) -> None:
    if force or not BUNDLE.exists() or BUNDLE.stat().st_mtime < newest_source():
        print("building the release bundle (just build)...", flush=True)
        subprocess.run(["just", "build"], cwd=ROOT, check=True)
    if not BUNDLE.exists():
        raise SystemExit(f"just build left no {BUNDLE}")


def launch(tools: Tools, dev: bool, kill: bool) -> None:
    cmd = ["just", "run"] if dev else ["open", "-n", str(BUNDLE)]
    log = pathlib.Path(os.environ.get("TMPDIR", "/tmp")) / "mt-demo-run.log"  # outside the repo: Vite reloads on a write
    tools.relaunch(cmd, lambda: tools.ax_raw("find", "Scene").returncode == 0,
                   kill=PROCESS if kill else None, log=log, cwd=ROOT)
    time.sleep(2)  # the rest of the webview


# -- the take -------------------------------------------------------------------------------------


def take_meta(dev: bool) -> dict:
    conf = json.loads((ROOT / "src-tauri" / "tauri.conf.json").read_text())
    version = json.loads((ROOT / "package.json").read_text())["version"]
    commit = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    return {"product": conf["productName"], "version": version, "commit": commit,
            "build": "dev" if dev else "bundle",
            "date": datetime.datetime.now().astimezone().isoformat(timespec="seconds")}


def edit_text(meta: dict) -> tuple[str, str]:
    product = meta["product"]
    return (f"{product}: a hex map to a printed zine page",
            f"{product} {meta['version']}. The Sallow Fen built by hand in the Gloomy Garden setting: terrain painted "
            "and filled, the grid inked to look printed, the edges of the fen, a title and compass, "
            "three numbered places, then exported as an A5 page.")


def run_steps(demo: Demo, pdf: pathlib.Path, png: pathlib.Path) -> float:
    demo.step_01_untitled()
    demo.step_02_new_map()
    demo.step_03_rename()
    demo.step_04b_texture()
    demo.step_04_terrain()
    demo.step_05_grid()
    demo.step_06_outlines()
    demo.step_07_title_compass()
    poster_at = demo.step_08_places()
    demo.step_09_export(pdf)
    demo.step_10_printed_page(pdf, png)
    return poster_at


def main() -> None:
    global HOLD
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--rehearse", action="store_true", help="the same moves, short holds, no recording")
    ap.add_argument("--recut", action="store_true", help="edit today's take again from its .json")
    ap.add_argument("--kill", action="store_true", help="quit a running Map & Territory first")
    ap.add_argument("--dev", action="store_true", help="`just run` instead of the release bundle")
    ap.add_argument("--build", action="store_true", help="`just build` even when the bundle looks current")
    a = ap.parse_args()

    stamp = f"{datetime.date.today():%Y%m%d}"
    out = RENDERS / f"mt-demo-{stamp}.mov"
    pdf = RENDERS / f"mt-demo-{stamp}{'-rehearsal' if a.rehearse else ''}.pdf"
    png = RENDERS / f"mt-demo-{stamp}-end.png"

    if a.recut:
        take = json.loads(out.with_suffix(".json").read_text())
        if not png.exists():
            render_still(RENDERS / f"mt-demo-{stamp}.pdf", png)
        title, description = edit_text(take["meta"])
        finish(out, take, title, description, png)
        return

    if not TEXTURE.exists():
        raise SystemExit(f"the take's texture isn't at {TEXTURE}")
    if not (BIN / "ax").exists():
        raise SystemExit(f"{BIN} has no tools: run `just demo` (it builds them) or `just -f ../../packages/demo-kit/justfile build`")
    if running() and not a.kill:
        raise SystemExit("Map & Territory is running. Every Map & Territory build (the release bundle, `just run`, "
                         "`just examples`) has the same process name and bundle id, so ax and System Events would "
                         "pick whichever comes first. Quit it, or pass --kill (unsaved work is lost).")

    tools = Tools(BIN, process=PROCESS, bundle_id=BUNDLE_ID)
    if not a.dev:
        ensure_bundle(a.build)
    launch(tools, a.dev, a.kill)

    if a.rehearse:
        HOLD = 0.3
    meta = take_meta(a.dev)
    with tools.display_restored():
        frame = tools.stage()
        if a.rehearse:
            demo = Demo(tools, NullTake())
            demo.frame = tuple(frame)
            run_steps(demo, pdf, png)
            return
        with Take(tools, out, frame, audio=False, meta=meta) as take:
            demo = Demo(tools, take)
            demo.frame = tuple(frame)
            poster_at = run_steps(demo, pdf, png)
    doc = json.loads(out.with_suffix(".json").read_text())
    doc["poster_at"] = poster_at  # the take's seconds when the first place is named
    out.with_suffix(".json").write_text(json.dumps(doc, ensure_ascii=False, indent=1))
    title, description = edit_text(meta)
    finish(out, doc, title, description, png)


def finish(out: pathlib.Path, take: dict, title: str, description: str, png: pathlib.Path) -> None:
    edit(out, take, plate=PLATE, title=title, description=description,
         poster_at=take.get("poster_at"), end_still=(str(png), 4))
    DESKTOP.mkdir(parents=True, exist_ok=True)
    for suffix in ("-edit.mp4", "-poster.jpg"):
        shutil.copy2(out.with_name(out.stem + suffix), DESKTOP / (out.stem + suffix))
    print(f"copies in {DESKTOP}")


if __name__ == "__main__":
    sys.exit(main())
