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

[group('quality')]
check:
    ./node_modules/.bin/tsc --noEmit
    ./node_modules/.bin/biome check .
    ./node_modules/.bin/vite build
    ./node_modules/.bin/vitest run
    cargo fmt --manifest-path src-tauri/Cargo.toml --check
    cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
    cargo test --manifest-path src-tauri/Cargo.toml
    just licences

# Fix lint/format issues in place (hooks only ever check; this writes).
[group('quality')]
fmt:
    ./node_modules/.bin/biome check --write .
    cargo fmt --manifest-path src-tauri/Cargo.toml

[group('quality')]
test:
    ./node_modules/.bin/vitest run

# Licence check against the committed lock. Reads files only, no network.
# Re-resolve with `preset-compliance licences scan` after changing dependencies.
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
