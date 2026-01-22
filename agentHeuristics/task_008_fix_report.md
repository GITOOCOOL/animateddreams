# Task 008 Addendum: Workflow Preset Fix

**Issue Identified**: The user noted the system wasn't respecting UI settings. The cause was `useWorkflow.ts` defaulting to a static JSON preset (`standard-t2i`), which bypassed the new dynamic generator.

**Resolution**:
- Updated `hooks/useWorkflow.ts` to include a new `dynamic` preset.
- Set `dynamic` as the default preset.
- Renamed legacy presets to clarify their static nature.

**Outcome**:
- Default behavior now uses `workflowGenerator.ts`.
- UI settings (Model, Steps, CFG) are now the single source of truth for generation.
- Full control requirement satisfied.
