# Theme Tokens Reference

This document lists the CSS variable tokens used across the app and how they map to Tailwind utilities. Light values are defined under `:root`, dark overrides under `.dark`.

## Token Set

| Token                      | Purpose                  | Typical Usage                         |
| -------------------------- | ------------------------ | ------------------------------------- |
| `--background`             | App/page background      | `bg-background`                       |
| `--foreground`             | Primary text color       | `text-foreground`                     |
| `--muted`                  | Subtle surface (fills)   | `bg-muted`                            |
| `--muted-foreground`       | Subtle text              | `text-muted-foreground`               |
| `--border`                 | Generic borders          | `border`, `border-border`             |
| `--input`                  | Input borders/background | `border-input`                        |
| `--ring`                   | Focus ring color         | `ring-ring`                           |
| `--card`                   | Card surfaces            | `bg-card`                             |
| `--card-foreground`        | Card text                | `text-card-foreground`                |
| `--popover`                | Popover surfaces         | `bg-popover`                          |
| `--popover-foreground`     | Popover text             | `text-popover-foreground`             |
| `--primary`                | Brand/action             | `bg-primary`, `text-primary`          |
| `--primary-foreground`     | Text on primary          | `text-primary-foreground`             |
| `--secondary`              | Secondary accents        | `bg-secondary`, `text-secondary`      |
| `--secondary-foreground`   | Text on secondary        | `text-secondary-foreground`           |
| `--accent`                 | Hover/selection accents  | `bg-accent`, `text-accent-foreground` |
| `--accent-foreground`      | Text on accent           | `text-accent-foreground`              |
| `--destructive`            | Errors/danger            | `bg-destructive`, `text-destructive`  |
| `--destructive-foreground` | Text on destructive      | `text-destructive-foreground`         |
| `--success`                | Success states           | `bg-success`, `text-success`          |
| `--success-foreground`     | Text on success          | `text-success-foreground`             |
| `--warning`                | Warnings                 | `bg-warning`, `text-warning`          |
| `--warning-foreground`     | Text on warning          | `text-warning-foreground`             |

## CSS Variables (HSL triplets)

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 4.9% 83.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --success: 142 44% 36%;
  --success-foreground: 0 0% 98%;
  --warning: 38 92% 50%;
  --warning-foreground: 25 30% 15%;
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;
  --ring: 240 3.7% 15.9%;
  --card: 240 10% 3.9%;
  --card-foreground: 0 0% 98%;
  --popover: 240 10% 3.9%;
  --popover-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  --secondary: 240 3.7% 15.9%;
  --secondary-foreground: 0 0% 98%;
  --accent: 240 3.7% 15.9%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 85.7% 97.3%;
  --success: 142 44% 32%;
  --success-foreground: 0 0% 98%;
  --warning: 38 92% 55%;
  --warning-foreground: 55 30% 88%;
}
```

Notes

- Follow Tailwind v4/shadcn conventions using HSL triplets.
- Use token utilities in components; do not hardcode colors.
- See `guidance/process/theming_audit_checklist.md` for audit steps.
