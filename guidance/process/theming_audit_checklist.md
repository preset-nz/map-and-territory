# Theming Audit Checklist

Purpose: Ensure dark mode and theme support across core app and plugins with zero hardcoded colors. Applies to MVP and future theme packs.

## Scope

- App components in `src/components/**`
- Properties panel components in `src/components/properties/**`
- Dialogs and overlays in `src/components/ui/**`
- Plugin UI (where applicable) – must use tokens or shared components

## Audit Steps

1. Search for color literals
   - Hex: `#[0-9a-fA-F]{3,8}`
   - RGB/A: `rgb\(|rgba\(`
   - HSL/A: `hsl\(|hsla\(`
   - Named colors: `\b(white|black|red|green|blue|gray|grey)\b`
   - Tailwind fixed colors: `bg-(red|blue|slate|zinc|gray)-`, `text-...`, `border-...` (except token utilities)
2. Replace with tokens
   - Use Tailwind token utilities: `bg-background`, `text-foreground`, `border-input`, `ring-ring`, `bg-accent`, etc.
   - If missing, add a token (see tech_stack.md Theming and Tokens) rather than introducing a literal.
3. Focus/hover states
   - Use existing `ring-ring`, `focus-visible:ring-ring`, `hover:bg-accent` patterns.
4. Disabled/read-only/error states
   - Use `disabled:opacity-50`, `text-muted-foreground`, and `bg-muted` or `border-input`.
   - Errors: `text-destructive`, `border-destructive` (if utility exists) or a small CSS class that references `--destructive`.
5. Overlays and shadows
   - Overlays should use opacity with neutral surfaces (e.g., `bg-black/60`) is permitted; consider `--overlay` token later if needed.
   - Shadows should not encode color; rely on CSS `box-shadow` defaults or tokens if needed.
6. Plugins
   - Require use of `@/components/ui` and `@/components/properties` where possible.
   - Custom plugin styles must reference CSS variables, not literals.
7. Properties Panel
   - Ensure `design_system.md` guidance is followed; groups, labels, and inputs use only tokens.
8. Tests
   - Add a unit/UI test that renders key components under `.dark` and `.light` and asserts presence of token classes.
   - E2E: switch theme via `ThemeToggle`, reload, assert persistence and dark UI appearance.

## Disallowed Patterns

- Hardcoded hex/RGB/HSL colors in components or plugins (except in the central token definitions/CSS).
- Tailwind fixed palette classes (e.g., `bg-slate-900`) in component files.
- Inline styles that set specific colors (unless they reference CSS variables).

## Replacement Map (Common)

- `text-gray-500` → `text-muted-foreground`
- `border-gray-200` → `border-input` or `border`
- `bg-white` → `bg-background`
- `bg-black` → consider `bg-foreground/90` or a token-driven overlay
- `text-black` → `text-foreground`
- `text-white` → `text-primary-foreground` (contextual) or `text-foreground` (on neutral surfaces)

## Validation

- Manual pass in light and dark modes for key screens.
- Accessibility: verify focus styles and contrast (WCAG AA) on primary components.
- Run grep checks in CI to fail builds on literals (optional script).

## References

- Tokens: `guidance/reference/theme_tokens.md`
- Theming summary: `guidance/tech_stack.md` (Theming and Tokens)
- Properties Panel: `guidance/feature/properties-panel/design_system.md`
