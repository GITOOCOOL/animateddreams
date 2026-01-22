# System Architecture & Heuristics Guide

> [!NOTE]
> This guide provides a high-level mental model of the **Animated Dreams** architecture to help new agents and developers get up to speed quickly. It complements the `agent.md` directives.

## 🧠 Core Heuristics (The "Golden Rules")

These are the non-negotiable patterns that govern development in this codebase:

1.  **Engine Authority**:
    *   **Rule**: `EngineContext` is the **Single Source of Truth** for all AI engines (Analysis, Image, Video, Dictation).
    *   **Behavior**: Never manage available engines or selections in local component state. Always consume `useEngineManager()` or `useEngine()` hooks.

2.  **UI Components**:
    *   **Rule**: Always use the custom `EngineSelector` component for engine dropdowns.
    *   **Behavior**: Never use native `<select>` elements for engine choices. This ensures consistent UI and status indication (Green/Red/Yellow dots).

3.  **Architecture Parity**:
    *   **Rule**: The code is the truth, but the map must match the territory.
    *   **Behavior**: If you refactor a core data flow or architectural layer, you **MUST** update the Mermaid diagrams in `components/visualizers/ArchitectureViewer.tsx`.

4.  **The "God Hook"**:
    *   **Rule**: `useDreamEngine` is the central orchestrator.
    *   **Behavior**: This hook manages the lifecycle of a "Dream" (Input -> Analysis -> Generation). Do not bypass it for core generation tasks.

---

## 🏗 System Architecture Overview

The system operates in four distinct, interconnected layers:

### 1. Client Layer (The Monolith)
*   **Framework**: React 19 + Vite.
*   **State Hub**: `App.tsx` acts as the central state container, distributing the `DreamState` to all panels.
*   **Logic Core**: `useDreamEngine` (The "God Hook") orchestrates the entire generation pipeline.
*   **Logging**: A unified `useLogging` hook captures system, Ollama, and ComfyUI logs for the Developer Console.

### 2. Server Layer (Node.js/Express)
*   **Role**: Proxy and Persistence.
*   **Key Routes**:
    *   `/api/ai`: Proxies requests to external LLMs (Groq, OpenAI, Gemini) and local Ollama instances to handle CORS and secret management.
    *   `/api/db`: Persistence layer for Dream History (SQLite).
    *   `/api/engines`: Storage for engine configuration presets.
*   **Physical Storage**: Generated media is saved directly to the local disk in the `/saved_dreams` directory.

### 3. AI Services Layer (Adapters)
We use a **Plugin/Adapter Pattern** to support diverse backends seamlessly:

*   **Text Analysis (The Brain)**:
    *   **GeminiService**: Handles complex prompt enhancement and vision analysis.
    *   **OllamaService**: Provides local, privacy-centric analysis.
*   **Visual Generation (The Paintbrush)**:
    *   **ComfyUI**: The heavy lifter for Image and Video generation. Connected via **WebSocket** for real-time progress monitoring.
    *   **Workflows**: The actual logic graphs are defined in JSON files (e.g., `workflow_img2img.json`) and dynamically injected into ComfyUI.

### 4. The "Dream" Workflow Pipeline
The data flow for a single user request follows this path:

1.  **Input**: User Input (Text/Voice/Image) is captured in the **Input Module**.
2.  **Analysis**: The input enters the **Agentic Pipeline** (Vision -> Enhancer -> Formatter layers) to produce a structured JSON prompt.
3.  **Synthesis**:
    *   The structured prompt is accepted by `useDreamEngine`.
    *   The appropriate ComfyUI Workflow is selected (T2I, I2I, or IP-Adapter).
    *   The payload is queued in ComfyUI.
4.  **Result**: The final asset is rendered, saved to disk, and pushed to the **Gallery**.

---

## 📂 Key Architecture Files

| File/Directory | Role |
| :--- | :--- |
| **`contexts/EngineContext.tsx`** | The **Brain**. Manages the global list of engines and their states. |
| **`hooks/useDreamEngine.ts`** | The **Heart**. Contains the core logic for the Dream lifecycle. |
| **`components/visualizers/ArchitectureViewer.tsx`** | The **Map**. Visual documentation that must stay synced with code. |
| **`services/*.ts`** | The **Hands**. Adapters for specific AI providers (Gemini, Comfy, Ollama). |
| **`server/routes/`** | The **Gatekeepers**. API routes for bridging the specific backend needs. |
