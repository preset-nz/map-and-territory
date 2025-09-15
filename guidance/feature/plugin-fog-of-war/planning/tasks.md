Status: Draft
Last Updated: 2025-09-03

# Fog-of-War Plugin – Tasks

- [ ] ADRs ratified: 0006, 0007, 0008
- [ ] Host: implement `AppAPI.ui` mode API and layout gating
- [ ] Host: implement `AppAPI.hex` utilities and pointer→hex routing
- [ ] Plugin: manifest, layer adapter `fogOfWar`
- [ ] Plugin: (de)serialization for `revealed` set
- [ ] Plugin: tools `fog.reveal` (+ optional `fog.hide`) with kernels
- [ ] Plugin: commands `fog.reset`, `fog.revealAt`, `fog.hideAt`
- [ ] UI: minimal controls for shape/radius/direction
- [ ] Tests: unit (kernels, serialization), integration (tools, z-order), E2E (present mode flow)

## Dependencies

- Requires ADR-0006/0007 availability in host APIs
