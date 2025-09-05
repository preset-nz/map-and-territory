## Backlog (Not Yet Ticketed)

- First-load dark flash: on initial page load, the UI flashes white before switching to dark mode. Add a no-FOUC theme hydration fix (inline `data-theme` or CSS `prefers-color-scheme` guard + early script to set class based on stored preference) to avoid flash.

Notes

- This list only includes items that do not exist in guidance/tickets.md.
- When an item is ticketed, move it to tickets and remove it from here.
