# Bug Report: Remote Access & Workflow API Failure

**User Reported Issue**: "still not working... running the client in another pc... Is that the culprit?".

**Culprit Identified**: 🛤️ **Missing Vite Proxy Rules**
When running the client on another PC (Windows), you connect to the Vite Dev Server (running on Mac). The React app then requests `/api/workflows` and `/api/engines`.
Because `vite.config.ts` **did not have proxy rules** for these two new endpoints (added recently), the Vite server didn't know these requests should go to the Backend Server (`localhost:3001`). It likely returned the React app HTML or a 404, causing the JSON parsing errors.

**Fix Applied**:
- Updated `vite.config.ts` to explicitly proxy `/api/workflows` and `/api/engines` to `http://localhost:3001`.

**How it works now**:
1. Windows Browser -> Mac Vite (`:5173/api/workflows`)
2. Mac Vite -> Mac Backend (`:3001/api/workflows`) ✅ Matches Rule!
3. Mac Backend -> Database ✅
4. Response -> Windows Browser ✅

**Action Required**:
Please **RESTART** the development server (`npm run dev`) for the new `vite.config.ts` changes to take effect.
