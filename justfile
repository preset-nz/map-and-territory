# Map & Territory — hexmap editor for tabletop RPGs.
# Standard verbs: prep, install, run, check, build, fmt, licences, release.

default:
    @just --list

[group('setup')]
prep:
    @echo "node:   $(node --version 2>/dev/null || echo MISSING)"
    @echo "pnpm:   $(pnpm --version 2>/dev/null || echo MISSING)"
    @echo "rustc:  $(rustc --version 2>/dev/null || echo MISSING)"
    @echo "preset-compliance: $(preset-compliance --version 2>/dev/null || echo 'MISSING (cargo binstall preset-compliance)')"
    @echo "knope:             $(knope --version 2>/dev/null || echo 'MISSING (cargo binstall knope)')"

[group('setup')]
install:
    pnpm install
    pnpm exec lefthook install

# Run the app in its Tauri window. There is no browser-only mode (family rule).
[group('dev')]
run:
    pnpm tauri dev

# Node pages (docs/nodes/) from the words the kinds carry. Rewrites each page's generated
# block and leaves the prose around it. The generator is its own crate (docs/gen) and the
# only thing that needs preset-docs, from crates.io (family-alignment: "preset-docs comes
# from crates.io").
[group('docs')]
docs:
    cargo run -q --manifest-path docs/gen/Cargo.toml

# Fails if a page is missing, stale or orphaned, or a kind has no summary.
[group('docs')]
docs-check:
    cargo run -q --manifest-path docs/gen/Cargo.toml -- --check

# Window tests (tests/window/*.toml) against a debug bundle, through the menu bar, with the
# app in the background. Needs `app-smoke` (tools/app-smoke, `just build` there) and a
# logged-in session, so it isn't part of `check`. Quit `just run` first. Its own target
# dir, so it doesn't rebuild over the dev binary.
[group('quality')]
smoke *args:
    CARGO_TARGET_DIR="{{justfile_directory()}}/target/smoke" pnpm tauri build --debug --bundles app
    app-smoke run --app "target/smoke/debug/bundle/macos/Map & Territory.app" {{args}} tests/window

[group('quality')]
check:
    ./node_modules/.bin/tsc --noEmit
    ./node_modules/.bin/biome check .
    ./node_modules/.bin/depcruise src
    ./node_modules/.bin/vite build
    ./node_modules/.bin/vitest run
    cargo fmt --all --check
    cargo clippy --workspace --all-targets -- -D warnings
    cargo test --workspace
    just docs-check
    just licences

# Fix lint/format issues in place (hooks only ever check; this writes).
[group('quality')]
fmt:
    ./node_modules/.bin/biome check --write .
    cargo fmt --all

[group('quality')]
test:
    ./node_modules/.bin/vitest run

# Licence check against the committed lock. Reads files only, no network.
# Re-resolve with `preset-compliance licences scan` after changing dependencies.
# Writes the window-test campaigns again from the commands that build them: the names given
# (`one-of-everything`, `every-layout`, `orlo`, `sallow-fen`), or every one.
[group('dev')]
fixtures *names='all':
    FIXTURES="$(echo {{names}} | tr ' ' ',')" cargo test -q -p map-and-territory-model --tests

[group('quality')]
licences:
    preset-compliance licences check

[group('build')]
build:
    pnpm tauri build

# Version, changelog, commit and tag from the conventional commits since the last
# tag (knope.toml). Pushing stays by hand.
[group('build')]
release:
    knope release

# What `release` would do, without touching anything.
[group('build')]
release-preview:
    knope release --dry-run
