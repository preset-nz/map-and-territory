# Map & Territory — hexmap editor for tabletop RPGs.
# Standard verbs: prep, install, run, check, build, fmt, licences, release.

default:
    @just --list

[group('setup')]
prep:
    @echo "node:  $(node --version 2>/dev/null || echo MISSING)"
    @echo "pnpm:  $(pnpm --version 2>/dev/null || echo MISSING)"
    @echo "preset-compliance: $(preset-compliance --version 2>/dev/null || echo 'MISSING (cargo binstall preset-compliance)')"
    @echo "knope:             $(knope --version 2>/dev/null || echo 'MISSING (cargo binstall knope)')"

[group('setup')]
install:
    pnpm install
    pnpm exec lefthook install

[group('dev')]
run:
    @echo "No app until epic 14 (shell from the template). The 2025 app is the tag v2025-next." && exit 1

[group('quality')]
check:
    ./node_modules/.bin/tsc --noEmit
    ./node_modules/.bin/biome check .
    ./node_modules/.bin/vitest run
    just licences

# Fix lint/format issues in place (hooks only ever check; this writes).
[group('quality')]
fmt:
    ./node_modules/.bin/biome check --write .

[group('quality')]
test:
    ./node_modules/.bin/vitest run

[group('build')]
build:
    @echo "No app until epic 14 (shell from the template). The 2025 app is the tag v2025-next." && exit 1

# Licence check against the committed lock. Reads files only, no network.
# Re-resolve with `preset-compliance licences scan` after changing dependencies.
[group('quality')]
licences:
    preset-compliance licences check

# Version, changelog, commit and tag from the conventional commits since the last
# tag (knope.toml). Pushing stays by hand.
[group('build')]
release:
    knope release

# What `release` would do, without touching anything.
[group('build')]
release-preview:
    knope release --dry-run
