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

## 2. Architecture & Design Patterns
### Core Concepts
-   **Local-First Network**: Designed for LAN usage. Frontend (5173) talks to Backend (3001) via relative paths `/api` to avoid CORS/IP issues.
-   **God Object State**: `useDreamEngine` is the central hook managing `isGenerating`, `logs`, and service connections. It is "drilled" into almost every panel.
-   **Service Adapters**: `services/` contains simple wrappers that normalize external APIs (Ollama, Comfy) into a standard app format.

### Active Directory Structure
-   `/server`: Express backend (`index.js` entry).
-   `/src`: React source.
    -   `/components`: Feature-rich dumb components (`MediaPanel`, `ArchitectureViewer`).
    -   `/hooks`: Logic containers (`useDreamEngine`).
    -   `/services`: API layers (`comfyService.ts`, `ollamaService.ts`).
    -   `/workers`: Web Workers for heavy lifting (e.g., local logs).
-   `/saved_dreams`: Output directory for generated media.

## 3. Agent Directives (THE RULES)
1.  **Memory Maintenance**:
    -   **Read**: You must read this file at the start of every task.
    -   **Update**: You must UPDATE this file when: architecture changes, new features are added, or a task is completed.
2.  **Architecture Sync**:
    -   **Code Parity**: The Mermaid diagrams in `ArchitectureViewer.tsx` MUST match the actual code structure. If you refactor, you redo the diagrams.
    -   **On Demand**: Be ready to explain the architecture using `ArchitectureViewer` as a visual aid.
3.  **Context Logging**:
    -   **Record**: Log every significant User Request and your Solution in the "Conversation History" section below. Keep it concise but searchable.

## 4. Active Context (Memory Bank)
### Current Focus
-   **System Self-Improvement**: Overhauling `agent.md` to be a dynamic memory bank.
-   **Architecture Visualization**: Debugging and refining the `ArchitectureViewer`.

### Known Issues / Technical Debt
-   **Mermaid Parsing**: Fixed syntax error in Server View (parenthesis in node labels).
-   **Prop Drilling**: `useDreamEngine` is drilled deep; consider Context or specialized hooks for sub-panels in future refactors.

## 5. Conversation History
*(Newest entries at the bottom)*

### [2026-01-20] Debugging ArchitectureViewer
-   **User**: "Expression is not callable" error in `ArchitectureViewer.tsx`.
-   **Agent**: Fixed TSX syntax errors (malformed template literals).
-   **User**: Mermaid parsing error in Server view ("Expecting 'SQE'...").
-   **Agent**: Added quotes to node labels with parentheses (e.g., `["Express Server (Port 3001)"]`).

### [2026-01-20] Project Memory Overhaul
-   **User**: Update `agent.md` to be "active memory" and include architecture maintenance instructions.
-   **Agent**: Refactored `agent.md` into this Memory Bank format. Added "Agent Directives" and "Conversation History".
