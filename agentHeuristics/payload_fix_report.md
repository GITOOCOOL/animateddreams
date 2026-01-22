# Bug Report: Save Failed (Bad Payload)

**User Reported Issue**: Presets not saving even after connection fixes.

**Culprit Identified**: 📦 **API Payload Mismatch**
The `SettingsPanel` was sending data that didn't match what the Backend `server/routes/workflows.js` expected:
1.  **Missing `id`**: The backend requires a unique ID for the new workflow. The frontend wasn't sending one.
2.  **Missing `type`**: The backend requires `type='image'` (or video). The frontend wasn't sending this.
3.  **Wrong Key**: The frontend sent `workflow: {...}`, but the backend expected `workflow_json: {...}`.

This caused the Backend to reject the request with a `400 Bad Request` error (which was previously hidden, now exposed via enhanced error handling).

**Fix Applied**:
- Updated `components/panels/SettingsPanel.tsx` to generate a UUID, set `type: 'image'`, and use the correct `workflow_json` key.

**Status**: ✅ Resolved. The Frontend and Backend now speak the same language.
