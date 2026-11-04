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
PROCESS = "map-and-territory"
BUNDLE_ID = "nz.preset.map-and-territory"
BUNDLE = ROOT / "target" / "release" / "bundle" / "macos" / "Map & Territory.app"
RENDERS = pathlib.Path.home() / "rhizomatic-preset" / "renders"
DESKTOP = pathlib.Path.home() / "Desktop" / "Claude" / "m-and-t-demo"
PLATE = "436d75"  # the app's accent: studio-site's .accent--map-territory

HOLD = 1.0  # scales every hold that paces the video; --rehearse shortens it

# -- the map ---------------------------------------------------------------------------------

MAP_NAME = "The Sallow Fen"
HEX_SIZE = 40  # the guide's; the canvas mapping uses it. A new map's is 24.
PAPER = (1200, 750)  # paper px of a 16:10 map (src/render/geometry.ts, PAPER_LONG_SIDE)

# Doom Forge's terrains (crates/map-and-territory-model/src/settings_2025.rs). A swatch is a
# button whose aria-label is describeTerrain (src/app/inspector/palette-strip.tsx):
# "<name> · <type label> · <traits>". Matching the first two parts is enough.
BONE = "Bone Fields · Plains"  # the ground, and the fen's dry land
MIRE = "Blood Mires · Water"  # the fen's pools and the lake
THICKET = "Ash Thickets · Forest"
GRAVES = "Iron Graves · Hills"
CRAGS = "Doom Crags · Mountains"

# Strokes in hex coordinates (q, r), pointy layout, hex (0, 0) at the paper's centre. Each is a
# straight run along a row, so a drag between the two centres crosses exactly the hexes
# between. At size 40 the paper holds r -5..5 and |q + r/2| <= 7 with room to spare.
# (terrain, from, to), grouped by terrain: one swatch click each.
STROKES = [
    (MIRE, (1, -4), (3, -4)),  # the lake, top middle
    (MIRE, (1, -3), (4, -3)),
    (MIRE, (1, -2), (4, -2)),
    (MIRE, (1, -1), (3, -1)),
    (MIRE, (-4, 2), (0, 2)),  # the fen, lower left
    (MIRE, (-5, 3), (-1, 3)),
    (THICKET, (-3, -4), (-1, -4)),  # the forest, upper left
    (THICKET, (-2, -3), (0, -3)),
    (THICKET, (-2, -2), (0, -2)),
    (THICKET, (-3, -1), (-1, -1)),
    (GRAVES, (3, 1), (5, 1)),  # the hills, right
    (GRAVES, (3, 2), (5, 2)),
    (GRAVES, (2, 3), (4, 3)),
    (CRAGS, (4, -1), (5, -1)),  # a few crags above them
    (CRAGS, (4, 0), (5, 0)),
]

# Where the numbered places go, in order, with their names and notes (the guide's).
PLACES = [
    ((-1, 1), "Reedwall Keep", "Bishop's men, twelve spears"),
    ((4, 2), "The Weeping Well", "Water that tastes of salt"),
    ((-3, 3), "Gallows Ford", "Knee-deep at low water"),
]
# The freeform layer's Opacity: Doom Forge's black and yellow soften to the guide's greys.
TERRAIN_OPACITY = 0.6

# Hexes near the paper's four corners, for the mapping check.
CHECK_HEXES = [(-5, -5), (9, -4), (-9, 4), (5, 5)]

# -- the take's clock ------------------------------------------------------------------------


def hold(seconds: float) -> None:
    """A pause that paces the video for a viewer. Waits for the app poll instead."""
    time.sleep(seconds * HOLD)


class NullTake:
    """Stands in for a Take in a rehearsal: nothing is recorded."""

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
        top, bottom = cy + 20, cy + ch - 20
        px = round(cx + cw + (self.frame[0] + self.frame[2] - cx - cw) / 2)
        for _ in range(30):
            e = find_entry()
            if e and top <= e.cy <= bottom:
                return
            down = e is None or e.cy > bottom
            self.tools.ui("scroll", px, round(cy + ch / 2), 260 if down else -260)
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

    def step_01_untitled(self) -> None:
        self.take.chapter("A campaign and a map")
        self.refresh_canvas()
        hold(3)

    def step_02_new_map(self) -> None:
        self.menu("Map", "New Map")
        poll("the new map's Hex Grid row", lambda: self.scene_row("Hex Grid"))
        hold(3.5)

    def step_03_rename(self) -> None:
        """The inspector's Name field (not a double-click on the row), then Hex size, before any paint."""
        row = poll("the new map's row", lambda: self.scene_row("Map 01") or self.map_row())
        self.tools.ui("click", row.cx, row.cy)
        poll("the Name field", lambda: self.field("Name"))
        self.set_text("Name", MAP_NAME)
        poll("the renamed map's row", lambda: self.scene_row(MAP_NAME))
        hold(3)
        self.click_row("Hex Grid")
        poll("the Hex size field", lambda: self.field("Hex size"))
        self.set_number("Hex size", HEX_SIZE)
        self.size = float(HEX_SIZE)
        self.fit()
        self.check()
        hold(1.5)

    def map_row(self):
        """A map's row when the name isn't the usual first one: the first 'Map ...' row."""
        for e in self.scene_rows():
            if e.label.startswith("Map ") and e.label != "Map canvas":
                return e
        return None

    def step_04_freeform(self) -> None:
        self.take.chapter("Terrain")
        self.menu("Layer", "Add Freeform Layer")
        poll("the Freeform row", lambda: self.scene_row("Freeform"))
        hold(1.5)
        self.slide("Opacity", TERRAIN_OPACITY)
        hold(1)

    def step_05_fill(self) -> None:
        self.swatch(BONE)
        hold(0.8)
        self.tool_key(20, "3", "Fill")
        hold(0.8)
        self.click_hex(0, 0)
        hold(3)

    def step_06_paint(self) -> None:
        self.tool_key(18, "1", "Paint")
        current = None
        for terrain, a, b in STROKES:
            if terrain != current:
                self.swatch(terrain)
                current = terrain
                hold(0.4)
            self.stroke(a, b)
            hold(0.2)
        hold(3)

    def step_07_grid(self) -> None:
        self.take.chapter("The grid")
        self.click_row("Hex Grid")
        poll("the grid's inspector", lambda: self.field("Hex size"))
        hold(1)
        self.set_number("Corner jitter", 3)
        hold(1.5)
        self.set_number("Misregistration", 3)
        hold(1.5)
        self.slide("Width noise", 0.5)
        hold(3)

    def step_08_title_compass(self) -> None:
        self.take.chapter("Title and compass")
        self.menu("Layer", "Add Title")
        poll("the Title row", lambda: self.scene_row("Title"))
        hold(2)
        self.menu("Layer", "Add Compass")
        self.click_row("Compass")
        # Style is a Select: the trigger shows the current choice, Mark, and the options list Rose.
        poll("the Style choice", lambda: self.find("Mark"))
        self.tools.click("Mark")
        time.sleep(0.4)
        poll("the Rose option", lambda: self.find("Rose"))
        self.tools.click("Rose")
        hold(3.5)

    def step_09_places(self) -> float:
        """Returns the take's time when the first place is named: the poster."""
        self.take.chapter("Places")
        self.tool_key(22, "6", "Add Location")
        for i, ((q, r), _, _) in enumerate(PLACES, 1):
            self.click_hex(q, r)
            poll(f"place {i} in the scene panel", lambda: self.count_rows("Location") >= i)
            hold(0.8)
        for _, name, note in PLACES:
            # each named place leaves the "Location" rows, so the next is always the first
            self.click_row("Location", 1)
            poll("the place's Name field", lambda: self.field("Name"))
            hold(0.4)
            self.set_text("Name", name)
            self.set_text("Note", note)
            poll(f"{name} in the scene panel", lambda: self.scene_row(name))
            hold(0.8)
        at = self.take.now()
        hold(3)
        return at

    def step_10_export(self, pdf: pathlib.Path) -> None:
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

    def step_11_printed_page(self, pdf: pathlib.Path, png: pathlib.Path) -> None:
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
            f"{product} {meta['version']}. A hex map of {MAP_NAME}, built by hand: terrain painted in strokes, "
            "the grid inked to look printed, a title and compass, three numbered places, "
            "then exported as an A5 page.")


def run_steps(demo: Demo, pdf: pathlib.Path, png: pathlib.Path) -> float:
    demo.step_01_untitled()
    demo.step_02_new_map()
    demo.step_03_rename()
    demo.step_04_freeform()
    demo.step_05_fill()
    demo.step_06_paint()
    demo.step_07_grid()
    demo.step_08_title_compass()
    poster_at = demo.step_09_places()
    demo.step_10_export(pdf)
    demo.step_11_printed_page(pdf, png)
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
