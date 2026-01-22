# Task 008: Transparent Workflow System - UI (URGENT)

**Status**: 🚨 URGENT / BLOCKING
**Assigned To**: Fronty
**Objective**: Implement the UI for the new Transparent Workflow System. This is critical for the "Full Workflow Control" feature.

## Context
Backy has completed the backend (`/api/workflows`, `workflowGenerator.ts`, `comfyService.ts`). The system is ready to accept raw JSON or parameters, but the UI is missing.

## Requirements

### 1. Settings Panel Integration
- **File**: `/components/panels/SettingsPanel.tsx` (and `WorkflowSettingsPanel.tsx`)
- **Action**: Add "Save Workflow" and "Load Workflow" controls.
- "Save": Should capture current settings, optional name/desc, and POST to `/api/workflows`.
- "Load": Should open the Workflow Library.

### 2. Workflow Library UI
- **File**: Create `/components/settings/WorkflowLibraryModal.tsx` (or similar).
- **Features**:
  - List workflows from `GET /api/workflows`.
  - Search/Filter.
  - "Load" action: Fetches details, extracts parameters (using `extractParametersFromWorkflow` from `services/workflowGenerator`), and updates the app state.
  - "Delete" action.

### 3. Save Modal
- **File**: Create `/components/settings/SaveWorkflowModal.tsx`.
- **Features**: Name and Description inputs.

### 4. Integration Logic
- **Hook**: `useEngineContext` or `useDreamEngine` might need helper methods, but direct API calls in simple handlers are fine for now.
- **State**: Ensure `onSettingsChange` is called correctly when loading.

## Handoff Notes
- `workflowGenerator.ts` in `/services/` IS safe to import in frontend (no Node deps).
- Use `extractParametersFromWorkflow` helper to map the JSON back to `ComfySettings`.
- **Constraint**: Do NOT add any "magic" logic. If the user saves 20 steps, it loads 20 steps.

## Progress
- [x] Create Modals (SaveWorkflowModal, WorkflowLibraryModal)
- [x] Update SettingsPanel (Added Load/Save buttons and handlers)
- [x] Connect Save/Load API (Implemented fetch calls)
