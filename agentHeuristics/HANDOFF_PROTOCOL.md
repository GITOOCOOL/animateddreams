# Simple Handoff Protocol

**Goal**: Coordinate work between Gemini and Claude using a shared dashboard.

## core Loop
1.  **Check `ACTIVE_HANDOFFS.md`** at the start of every session.
2.  **Pick up a task** assigned to you (or listed as `PENDING`).
3.  **Work on the task** in its own markdown file (e.g., `agentHeuristics/task_01_feature.md`).
4.  **Update `ACTIVE_HANDOFFS.md`** when you are done or need to pass it back.

## Roles
-   **Fronty** (formerly Gemini): Frontend, UI/UX, Animations. (New Hire - Claude Model)
-   **Backy** (formerly Claude): Backend, Contexts, Logic, API.


## Handoff Statuses
-   `PENDING`: Assigned to an agent but not started.
-   `IN_PROGRESS`: Currently being worked on.
-   `BLOCKED`: Waiting on the other agent or user.
-   `DONE`: Completed.

## How to Create a Handoff
1.  Add an entry to `ACTIVE_HANDOFFS.md`.
2.  Create a `task_XX_name.md` file with details if needed.
3.  Ping the other agent in the chat (if running together) or leave it for the next session.

## Conflict Management & Resource Coordination

### Manager Responsibilities
-   **The Manager (Opus) handles all resource conflicts.** Agents should focus on their assigned tasks.
-   Before starting implementation tasks, the Manager will:
    -   Review both agents' analysis reports
    -   Identify potential file conflicts
    -   Assign tasks with clear domain separation
    -   Add file locks if needed (see below)
-   If conflicts arise, the Manager will reorganize task assignments and notify affected agents.

### Agent Guidelines
-   **Check `ACTIVE_HANDOFFS.md`** before starting work to see what others are doing.
-   **Analysis tasks** (reading code, generating reports) are safe to run in parallel.
-   **Implementation tasks** (editing code) require coordination:
    -   If another agent has a task `IN_PROGRESS` that might touch the same files, wait or ask the Manager.
    -   Update your task status to `IN_PROGRESS` when you start work.
    -   Mark `DONE` immediately when finished to unblock others.
-   **Shared files** (e.g., `App.tsx`, contexts, `ACTIVE_HANDOFFS.md`):
    -   Check the File Locks table below before editing.
    -   If a file is locked, coordinate with the Manager.

### File Locks (Optional)
When needed, the Manager will add locks here:

| File Path | Locked By | Reason | Until Task |
|-----------|-----------|--------|------------|
| *(none currently)* | - | - | - |

### Domain Ownership (Default)
Unless a file lock says otherwise:
-   **Fronty owns**: `/components/`, UI files, styling, animations
-   **Backy owns**: `/server/`, `/services/`, backend logic, API routes, database
-   **Shared ownership** (requires Manager approval): `App.tsx`, `/contexts/`, `/hooks/`, `package.json`

### Urgent Task Escalation (Blocking Dependencies)
If an agent is **BLOCKED** by a missing dependency from another domain (e.g., Backy needs a frontend UI to test an API):
1.  **Create a Task File**: `task_XX_URGENT_description.md`.
2.  **Mark as URGENT**: Add `[URGENT]` prefix to the task name in `ACTIVE_HANDOFFS.md`.
3.  **Notify Manager**: The Manager (Opus) will scan for `[URGENT]` flags and immediately re-prioritize the blocked agent's queue.
4.  **Wait**: The requesting agent marks their current task as `BLOCKED (Waiting for Task XX)` until the urgent dependency is resolved.

### Parallel Work Guidelines
✅ **Safe to work in parallel**:
-   Analysis/reporting tasks (reading code only)
-   Tasks in completely separate file domains
-   Tasks explicitly marked as "parallel-safe" by the Manager

⚠️ **Requires coordination**:
-   Editing shared files (contexts, hooks, App.tsx)
-   Modifying `package.json` or config files
-   Database schema changes
-   Tasks that depend on each other's output

🛑 **Never do in parallel**:
-   Editing the exact same file
-   Conflicting refactors (e.g., both renaming the same function)
-   Tasks marked as `BLOCKED` waiting on another task
