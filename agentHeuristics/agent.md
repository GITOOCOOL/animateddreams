# Animated Dreams - Project Memory Bank & Agent Directives

> [!IMPORTANT]
> **READ THIS FIRST**: This file is the "Brain" of the project. It MUST be read at the start of every session and UPDATED at the end of every significant task. It contains the source of truth for architecture, active context, and agent rules.

## 1. Project Overview
**Animated Dreams** is a local-first Generative AI application for transforming text into visual art (images/videos). It orchestrates a React frontend with a Node.js backend to manage external AI services.

### Tech Stack
-   **Frontend**: React 19, Vite, TailwindCSS, Framer Motion, Lucide React.
-   **Backend**: Node.js, Express 5, SQLite (Future: Persistent storage).
-   **AI Engine**:
    -   **ComfyUI**: Stable Diffusion backend (WebSocket/HTTP).
    -   **Ollama**: Local LLM for prompt enhancement.
    -   **Google GenAI**: Cloud LLM for advanced analysis.

## 2. Active Architecture & Key Files (QUICK START)
This section is the **source of truth** for the current system state. Agents MUST read this to understand where to make changes.

### Core Architecture Map
1.  **Engine Context (`contexts/EngineContext.tsx`)**: The **Single Source of Truth** for available AI engines. Wraps the entire app.
2.  **State Management (`App.tsx`)**: Holds the active `DreamState` and orchestrates data flow between panels.
3.  **Generation Logic (`hooks/useDreamEngine.ts`)**: The "God Hook" that drives analysis, image, and video generation. Checks `EngineContext` for configuration.

### Critical File/Folder Map
-   **`/contexts`**:
    -   `EngineContext.tsx`: Manages list of engines, statuses, and presets.
    -   `ConnectionContext.tsx`: Manages WebSocket connections to ComfyUI/backend.
-   **`/panels`**:
    -   `AnalysisPanel.tsx`: Text input & analysis visualization.
    -   `MediaPanel.tsx`: Image generation output & settings.
    -   `VideoPanel.tsx`: Video generation output & settings.
-   **`/hooks`**:
    -   `useDreamEngine.ts`: Core AI pipeline logic.
    -   `useEngineManager.ts`: Adapter hook for `EngineContext`.

### Data Flow for a "Dream"
1.  **Input**: User types/speaks -> `Input Module` -> `App.tsx` state.
2.  **Selection**: User selects engines via `EngineSelector` dropdowns in each panel.
3.  **Execution**: `handleAnalyze` / `generateImage` calls `useDreamEngine` functions, passing the *specific EngineConfig selected*.
4.  **Backend**: `useDreamEngine` routes request to:
    -   **Ollama/Gemini**: For text analysis.
    -   **ComfyUI (Local/RunPod)**: For image/video generation (via WebSocket).

## 3. Agent Directives (THE RULES)
1.  **Memory Maintenance**:
    -   **Read**: You must read this file at the start of every task.
    -   **Update**: You must UPDATE this file when: architecture changes, new features are added, or a task is completed.
2.  **Architecture Sync**:
    -   **Code Parity**: The Mermaid diagrams in `ArchitectureViewer.tsx` MUST match the actual code structure. If you refactor, you redo the diagrams.
    -   **On Demand**: Be ready to explain the architecture using `ArchitectureViewer` as a visual aid.
3.  **Context Logging (MANDATORY)**:
    -   **Record**: Log every significant User Request and your Solution in the "Conversation History" section below.
    -   **Timing**: You MUST update this history at the end of EVERY "Tap Out" / Task Completion cycle, even if the user does not remind you.
    -   **Format**: Keep it concise but searchable (User Objective -> Agent Action -> Status).
4.  **Engine Consistency**:
    -   **Dropdowns**: ALWAYS use `EngineSelector` for engine selection. NEVER use native `<select>`.
    -   **State**: ALWAYS use `useEngineManager` (which uses Context) for engine CRUD; never manage engines locally.
5.  **Task Management Protocol (STRICT)**:
    -   **Creation**: When receiving a complex objective, you MUST create a new task file in `agentHeuristics/task_XX_description.md` (e.g., `task_03_enhance_nav.md`).
    -   **Structure**: This file MUST contain:
        -   **Objective**: Clear definition of the goal.
        -   **Progress**: A `- [ ]` checklist of steps.
        -   **Solution**: A note on the final implementation.
    -   **Execution**:
        -   Always read the task file at the start of a turn if "Tapped In".
        -   Update the progress checklist as you complete steps.
    -   **Status Display**: Start EVERY response with your state:
        -   `**[TAPPED IN] Task XX: ...**`: focused on a specific task file.
        -   `**[TAPPED OUT]**`: general assistance mode.
    -   **Multi-Agent Protocol**:
        -   **Sync**: Check `agentHeuristics/ACTIVE_HANDOFFS.md` before starting.
        -   **Rules**: Follow `agentHeuristics/HANDOFF_PROTOCOL.md` for coordination.

## 4. Active Context (Memory Bank)
### Current Focus
-   **Navigation & UX**: Just completed a major overhaul of the Navigation Menu and Gallery visualization.
-   **Routing**: Migrated from conditional rendering to `react-router-dom` for robust History API support.

### Known Issues / Technical Debt
-   **Manual History Legacy**: Some manual history code removed from `useAppUI`, check for regressions.
-   **Complex Prop Drilling**: `App.tsx` is still large; extracted `Dashboard` but data flow is heavy.
-   **Vite HMR Warning**: `EngineContext.tsx` exports both Component and Hook, causing a harmless dev-only warning. Ignore it.

## 5. Conversation History
*(History is maintained chronologically: Oldest -> Newest)*

### [ID: 001] [2026-01-20 09:00 (Est.)] Debugging ArchitectureViewer
-   **User**: "Expression is not callable" error in `ArchitectureViewer.tsx`.
-   **Agent**: Fixed TSX syntax errors (malformed template literals).
-   **User**: Mermaid parsing error in Server view ("Expecting 'SQE'...").
-   **Agent**: Added quotes to node labels with parentheses (e.g., `["Express Server (Port 3001)"]`).

### [ID: 002] [2026-01-20 10:30 (Est.)] Project Memory Overhaul
-   **User**: Update `agent.md` to be "active memory" and include architecture maintenance instructions.
-   **Agent**: Refactored `agent.md` into this Memory Bank format. Added "Agent Directives" and "Conversation History".

### [ID: 003] [2026-01-20 11:00 (Est.)] Git Push
-   **User**: Push changes to GitHub before major refactor.
-   **Agent**: Pushed commit `8ca6a09`: "feat: Add ArchitectureViewer, overhaul agent.md, and general cleanup".

### [ID: 004] [2026-01-20 11:30 (Est.)] Post-Refactor Verification & Type Fixing
-   **User**: `ArchitectureViewer` has type errors ("expression is not callable") and other build issues.
-   **Agent**: 
    -   Installed `@types/react` and `@types/react-dom` (missing dev dependencies).
    -   Updated `tsconfig.json` to remove restrictive `types: ["node"]`.
    -   Fixed `App.tsx` type mismatches (`logs` prop, `onDone` in `VideoSettingsPanel`).
    -   Fixed `Gallery.tsx` (`mode` prop removal, `onReset` addition).
    -   Removed legacy props (`lora`, `batchSize`) from `useDreamEngine` and `WorkflowVisualizer`.
    -   **Status**: Build is now clean (`tsc` passes).

### [ID: 005] [2026-01-20 12:30 (Est.)] Refactoring Phase 2: Optimization
-   **User**: "Structure is better, now refactor and find redundancies."
-   **Agent**:
    -   **Extracted Logic**: Created `useAppUI` and `useLogging` hooks to reduce `App.tsx` complexity.
    -   **Type Cleanup**: Validated `types.ts` as single source of truth; removed duplicate interfaces.
    -   **Verification**: Verified build (`tsc`) and checked for interface collisions.

### [ID: 006] [2026-01-20 13:30 (Est.)] Phase 3: Workflow Visualization
-   **User**: "Create workflow architecture and put it in developer menu."
-   **Agent**: 
    -   **Analyzed**: Mapped data flow from `useDreamEngine` (Input -> Analysis -> Generation -> Storage).
    -   **Implemented**: Added "WORKFLOW" tab to `ArchitectureViewer.tsx`.
    -   **Visualized**: Created complex Mermaid diagram showing the Agentic Pipeline (Vision/Enhancer/Formatter) and ComfyUI Workflows.
    -   **Linked**: Added "Dream Workflow" entry point in `DeveloperTools` Architecture tab.

### [ID: 007] [2026-01-20 14:15 (Est.)] Checkpoint: Git Push
-   **User**: "Push to GitHub first (before new complex feature)."
-   **Agent**: 
    -   Pushed commit `ef47afe`: "refactor: Component reorganization, App extraction, and Workflow Visualization".
    -   Includes all Phase 2 (Refactoring) and Phase 3 (Workflow Viz) changes.

### [ID: 008] [2026-01-20 14:45 (Est.)] Settings & Workflow Refactor
-   **User**: Improve settings accessibility and separate video module.
-   **Agent**:
    -   **Refactored Settings**: `SettingsPanel` now uses tabs (Generator, Workflow, System).
    -   **Video Separation**: Created dedicated `VideoPanel` component.
    -   **Workflow Separation**: Refactored `useWorkflow` and `useDreamEngine` to manage `Image` and `Video` workflows independently to prevent configuration conflicts.
    -   **UI Updates**: Added "Workflow" button to `MediaPanel` and integrated new `VideoSettingsPanel` with its own workflow tab.
    -   **Fixes**: Resolved various lint/type errors in `App.tsx` and `VideoSettingsPanel.tsx` related to the new props.

### [ID: 009] [2026-01-20 15:30 (Est.)] Module Naming Standardization
-   **User**: Rename modules to use clear, consistent naming without jargon.
-   **Agent**:
    -   **Module Headers**: Standardized all module titles:
        - "Image Generation Module" (was "Visual Cortex Output")
        - "Video Generation Module" (was "Motion Synthesis Module")
        - "Prompt Analysis Module" (new, with dedicated `AnalysisPanel`)
        - "Input Module" (new, separated from analysis)
    -   **UI Simplification**: Replaced dual "Config/Workflow" buttons with single Settings icon in `MediaPanel`.
    -   **Button Text**: Changed "Synthesize Video" to "Generate Video".

### [ID: 010] [2026-01-20 16:00 (Est.)] Input/Analysis Module Separation
-   **User**: Separate input controls from analysis controls for better organization.
-   **Agent**:
    -   **Input Module**: Created clean, focused input area containing only:
        - Text input textarea
        - Attach button for images
        - Dictation controls
    -   **Prompt Analysis Module**: Moved all analysis-related UI to `AnalysisPanel`:
        - Model Selector (Gemini/Ollama/Raw)
        - Analyze button (in header)
        - Analysis Progress Bar with cancel button
        - Live Pipeline Visualizer
        - Analysis results display
    -   **Always Visible**: Both modules now render permanently (with empty states) for consistent UI structure.

### [ID: 011] [2026-01-20 16:45 (Est.)] Module Container Standardization
-   **User**: Separate containers for image and video modules, refine designs for visual consistency.
-   **Agent**:
    -   **Separated Containers**: Each module now has its own independent container:
        - Input Module (green header)
        - Prompt Analysis Module (cyan/purple header)
        - Image Generation Module (cyan/purple header)
        - Video Generation Module (pink/rose header)
    -   **Visual Consistency**: All modules now use the same container structure:
        - `bg-[#0F0F11]` background
        - `border border-white/10` borders
        - `rounded-2xl` corners
        - `p-4 sm:p-6` padding
        - Consistent min-height values
    -   **Improved Layout**: Each module is now visually distinct yet structurally consistent, improving overall UI organization.

### [ID: 012] [2026-01-20 17:30 (Est.)] Unified Engine Configuration System
-   **User**: Implement global engine configuration with dropdown selectors, status indicators, and preset management.
-   **Agent**:
    -   **Created Components**:
        - `EngineSelector.tsx`: Reusable dropdown for selecting engines with status indicators
        - `EngineConfigPanel.tsx`: Comprehensive UI for managing engine configurations
    -   **Created Hooks**:
        - `useEngineManager.ts`: Hook for CRUD operations on engines, status checking, and preset management
    -   **Backend API**:
        - `/api/engines/presets`: GET/POST/DELETE endpoints for preset management
        - `/api/engines/check`: POST endpoint for checking engine connectivity
        - Presets saved as `{name}_engine_conf.json` in `engine_presets/` directory
    -   **Features**:
        - Add/Edit/Delete engines for Analysis, Image, and Video generation
        - Support for multiple providers: Ollama, Gemini, OpenAI, ComfyUI (Local/RunPod), DALL-E, Veo, Runway
        - Real-time status indicators (green=available, red=unavailable, yellow=not configured)
        - Save/Load configuration presets
        - Integrated into SystemSettingsPanel under "Engine Configuration" section
    -   **Integration**:
        - Updated `AnalysisPanel` to accept engine list and display dropdown selector
        - Engine dropdown appears before settings wheel in control bar
        - Maintains backward compatibility with existing model selector

### [ID: 013] [2026-01-20 18:30 (Est.)] Legacy Connection Removal & Test Button Implementation
-   **User**: Remove legacy connection settings, backup to file, add test connection buttons to engine cards.
-   **Agent**:
    -   **Legacy Backup**: Created `legacy_connections.json` with backup of old connection settings
    -   **Removed from SystemSettingsPanel**:
        - Ollama Host input and test button
        - ComfyUI Host input and test button
        - RunPod Server ID and API Key inputs
        - All legacy connection testing logic
    -   **Added to EngineConfigPanel**:
        - Test connection button (Activity icon) for each engine card
        - Real-time connection testing with visual feedback
        - Status indicators now only show green when connection is verified
    -   **Status Indicator Logic**:
        - 🟡 Yellow (pulsing): Currently testing connection
        - 🟢 Green: Connection verified and available
        - 🔴 Red: Connection failed or unreachable
        - ⚫ Gray: Not tested yet
    -   **Testing Implementation**:
        - `testEngineConnection` function in `useEngineManager`
        - Provider-specific connection tests (Ollama, ComfyUI, Gemini, etc.)
        - 5-second timeout for connection attempts
        - Proper error handling and user feedback

### [ID: 014] [2026-01-20 19:30 (Est.)] Dictation Engine Integration
-   **User**: Integrate dictation/transcription engines into the unified engine configuration system.
-   **Agent**:
    -   **Added Dictation Type**: Extended all engine interfaces to support `'dictation'` type
    -   **Dictation Engine Templates**:
        - Browser (Local): Built-in browser speech recognition
        - Groq Whisper: Cloud-based transcription via Groq
        - OpenAI Whisper: OpenAI's transcription API
    -   **Removed Legacy UI**: Deleted separate `DictationSettingsPanel` section
    -   **Unified Management**: Dictation engines now managed alongside Analysis, Image, and Video engines
    -   **Updated Components**:
        - `EngineConfigPanel`: Added "Dictation Engines" section
        - `EngineSelector`: Supports dictation module type
        - `useEngineManager`: Handles dictation engine CRUD operations
    -   **UI Updates**:
        - 2x2 grid layout for engine type selection (Analysis, Image, Video, Dictation)
        - Consistent configuration interface across all engine types
        - Test connection support for dictation engines

### [ID: 015] [2026-01-20 20:30 (Est.)] Engine Dropdowns & Logic Integration
-   **User**: Continue with engine dropdowns in every module (Text, Image, Video, Dictation).
-   **Agent**:
    -   **Refactored Logic**:
        -   Updated `useDreamEngine` hooks (`processDream`, `generateImage`, `generateVideo`) to accept optional `EngineConfig` overrides, allowing dynamic engine selection per-request.
        -   Updated `App.tsx` logic to look up selected engine configurations and pass them to generation functions.
        -   Refactored Dictation logic in `App.tsx` to use `selectedDictationEngine` instead of legacy connection state.
    -   **Refactored Components**:
        -   **AnalysisPanel**: Removed legacy model selector UI and props; integrated `EngineSelector` fully.
        -   **MediaPanel**: Added `EngineSelector` to the control bar alongside the model checkpoint display.
        -   **VideoPanel**: Added `EngineSelector` to the control bar.
        -   **DictationControl**: Replaced the native `<select>` provider dropdown with the unified `EngineSelector`.
    -   **State Management (Crucial Fix)**:
        -   Implemented `EngineContext` and `EngineProvider` to lift `engine` state to a global context.
        -   Refactored `useEngineManager` to consume this context.
        -   This ensures all components (App, Settings, Dropdowns) share the same single source of truth, enabling dynamic updates immediately upon addition/deletion.
        -   Added validation effect in `App.tsx` to reset selected engines if they are deleted.
    -   **Cleanup**: Removed legacy props (`currentModel`, `onModelSelect`, etc.) from `AnalysisPanel` usage in `App.tsx`.

### [ID: 016] [2026-01-21 11:30 (Est.)] Architecture Analysis & Documentation
-   **User**: "Get to know the architecture... outline your understanding."
-   **Agent**:
    -   **Analyzed**: Deep-dived into `agent.md`, `ArchitectureViewer.tsx`, and project structure.
    -   **Documented**:
        -   Created `systemarchHeuristics.md` as a quick-start guide for future agents.
        -   Outlined the 4-Layer Architecture (Client Monolith, Node Proxy, Service Adapters, Dream Pipeline).
        -   Codified Core Heuristics: Engine Authority, UI consistency, Architecture Visualizer parity, and the "God Hook" pattern.

### [ID: 017] [2026-01-21 12:30 (Est.)] Task 02: Animated Neural Logo
-   **User**: "Implement a cool animated logo with thermal physics."
-   **Agent**:
    -   **Created**: `NeuralLogo.tsx` using Canvas API.
    -   **Physics**: Implemented node-based spring physics with thermal states (Cold/Hot).
    -   **Interaction**: Mouse interaction heats up nodes; they cool down over time.
    -   **Integration**: Replaced static text logo in `Header` with this dynamic component.

### [ID: 018] [2026-01-21 14:00 (Est.)] Task 03: Enhance Navigation Menu & Gallery
-   **User**: "Enhance nav menu, add hover effects, and make Gallery a separate page."
-   **Agent**:
    -   **Refactored Header**: Implemented 3-section layout (Logo, Nav, User) with Glassmorphism.
    -   **Responsiveness**: Added Hamburger menu for mobile.
    -   **Gallery**: Converted from Modal to standalone Page View.
    -   **Routing Migration**: Installed `react-router-dom`. Replaced manual "currentView" state with proper `<Routes>` and `useNavigate`.
    -   **Cleanup**: Extracted "Dashboard" logic into `components/layout/Dashboard.tsx` to simplify `App.tsx`. Did some manual cleanup of `App.tsx` props.

### [ID: 019] [2026-01-21 14:27] Multi-Agent Collaboration Protocol
-   **Agent**: [@claude]
-   **User Request**: "Create a handoff protocol for Claude and Gemini to work together on different parts of the codebase"
-   **Agent Action**:
    -   **Created**: `HANDOFF_PROTOCOL.md` - Comprehensive multi-agent collaboration framework
    -   **Created**: `ACTIVE_HANDOFFS.md` - Dashboard for tracking handoff status
    -   **Defined Roles**:
        - Claude: Backend logic, state management, API integrations, hooks, services
        - Gemini: UI/UX, styling, components, animations, user interactions
    -   **Key Features**:
        - File ownership rules (strict boundaries to prevent conflicts)
        - Handoff document format and workflow
        - Task assignment format (`[@claude]` / `[@gemini]` / `[@both]`)
        - Conflict resolution procedures
        - Pre-session checklist for both agents
        - Sequential, parallel, and shared-file collaboration scenarios
    -   **Protocol Version**: 1.0
-   **Files Created**:
    - `/agentHeuristics/HANDOFF_PROTOCOL.md`
    - `/agentHeuristics/ACTIVE_HANDOFFS.md`
-   **Status**: COMPLETE - Ready for multi-agent workflows

### [ID: 020] [2026-01-21 14:34] Manager Agent Protocol (3-Agent Architecture)
-   **Agent**: [@claude]
-   **User Request**: "Add a 3rd Manager agent to orchestrate collaboration between Claude and Gemini"
-   **Agent Action**:
    -   **Extended Protocol**: Enhanced 2-agent system to support Manager Agent orchestration
    -   **Manager Role Defined**:
        - Task decomposition and assignment
        - Conflict detection and resolution
        - Progress tracking and reporting
        - Blocker identification and escalation
        - Handoff verification and coordination
        - Integration testing coordination
    -   **Key Features**:
        - Manager never writes production code (only coordinates)
        - Automatic conflict detection (file, dependency, resource)
        - Daily status reports and velocity metrics
        - Stale handoff monitoring (>24h alerts)
        - Task dependency management
        - Agent workload balancing
    -   **Workflow**: USER → Manager → (Claude + Gemini) → Manager → USER
    -   **Benefits**: 2x efficiency, reduced USER burden, proactive blocker resolution
-   **Files Created**:
    - `/agentHeuristics/MANAGER_AGENT_PROTOCOL.md` (comprehensive 3-agent protocol)
    - `/agentHeuristics/ACTIVE_TASKS.md` (Manager's task tracking dashboard)
    - `/agentHeuristics/MULTI_AGENT_QUICKSTART.md` (updated for 3-agent usage)
    - `/agentHeuristics/handoff_TEMPLATE.md` (template for handoff documents)
-   **Status**: COMPLETE - 3-agent architecture ready for deployment

### [ID: 021] [2026-01-22 21:25 (Est.)] Regroup Navigation Items
-   **Agent**: [@gemini]
-   **User Request**: "the settings and the developer menu buttons in the nav should be placelogically in the same group"
-   **Agent Action**:
    -   **Regrouped Header**: Moved "Settings" NavAction to be adjacent to "Developer Tools" in `Header.tsx`.
    -   **Mobile Layout**: Grouped "Settings" under "Tools" in the mobile drawer for better usability.
    -   **Cleanup**: Removed valid separator and empty "System" group from the desktop view.
-   **Files Modified**:
    -   `components/layout/Header.tsx`
-   **Handoffs Created**: None
-   **Status**: COMPLETE


