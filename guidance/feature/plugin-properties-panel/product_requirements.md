---
ticket: T-001
feature: plugin-properties-panel
owner: product-owner
date: 2025-09-10
level: 2
---

## Problem & Value

- Properties panel currently has hardcoded components (`CampaignProperties`, `MapProperties`, `LayerPropertiesGeneric`) that cannot be extended by plugins
- Plugins cannot contribute custom property panels for their features, limiting extensibility
- Core application functionality is tightly coupled to the properties panel instead of being plugin-based (no dogfooding)

## In Scope

- Declarative parameter template system for defining property UI without React components
- Conditional enable/disable logic for parameters based on other parameter values
- Plugin contribution mechanism allowing plugins to register property panels for specific selection types
- Migration of existing hardcoded property panels to plugins using the new system
- Support for folders/groups to organize parameters logically

## Out of Scope

- Custom React components in plugins (plugins provide data, panel renders UI)
- Backward compatibility with existing property schema registry (clean migration)
- Advanced dynamic validation beyond basic type constraints (min/max/step)
- Real-time parameter dependencies that require custom JavaScript logic

## Acceptance Criteria

- [ ] Plugins can declare property panels using declarative parameter templates
- [ ] Parameter templates support folders, basic types (string, number, boolean, color, menu), and conditional disable logic
- [ ] Properties panel dynamically renders registered templates based on current selection
- [ ] Campaign and Map properties are moved to a core plugin and work identically to before
- [ ] Layer-specific properties (hex-noise, freeform) are defined in their respective plugins
- [ ] Conditional logic works for map palette override (checkbox enables/disables palette selection)
- [ ] No regression in existing property panel functionality

## Risks & Assumptions

- Assumes declarative parameter templates can cover all current property UI needs
- Risk of template complexity growing if conditional logic requirements expand
- Assumes plugin authors prefer declarative templates over React components for simplicity
