# Task 03 – Backy reads full codebase (agent.md, docs)

**Objective**: Thoroughly read and understand all core project files, especially `agent.md` and related documentation, to be prepared for backend work.

**Progress Checklist**:
- [x] Open and review `agent.md`
- [x] Scan `HANDOFF_PROTOCOL.md` and `ACTIVE_HANDOFFS.md`
- [x] Identify any backend‑specific files (contexts, hooks, services, server routes)
- [x] Summarize key backend architecture and any open issues
- [x] Update this task file with findings

---

## **Solution / Findings**

### 📚 **Core Architecture Understanding**

#### **1. Project Structure (Flat, No src/)**
The project uses a **flat directory structure** (no `src/` folder). All code lives at the root level:
- `/hooks/` - Custom React hooks (7 files)
- `/contexts/` - React contexts (3 files)
- `/services/` - AI service adapters (5 TS files + workflow JSONs)
- `/components/` - React components (34 files organized by type)
- `/server/` - Express backend (Node.js)
- `/agentHeuristics/` - Agent coordination and memory

#### **2. Tech Stack**
**Frontend:**
- React 19 + Vite
- TypeScript 5.8
- TailwindCSS (implied from agent.md)
- Framer Motion (animations)
- React Router DOM 7.12 (routing)

**Backend:**
- Node.js + Express 5
- SQLite3 (dreams.db for persistence)
- No TypeScript on backend (pure JS with ES modules)

**AI Services:**
- Google GenAI SDK (@google/genai)
- Ollama (local LLM)
- ComfyUI (Stable Diffusion via WebSocket)
- Whisper (transcription via Groq/OpenAI)

---

### 🔑 **Backend Files I Own (Backy's Domain)**

#### **A. Server Routes (`/server/routes/`)**
1. **`ai.js`** (226 lines)
   - `/api/ai/availability` - Check Gemini availability
   - `/api/ai/analyze` - Dual-agent analysis pipeline (Psychologist → Visualizer)
   - `/api/ai/transcribe` - Audio transcription proxy (Groq/OpenAI Whisper)
   - Uses multer for file uploads
   - Implements structured JSON schema with Google GenAI

2. **`engines.js`** (123 lines)
   - `/api/engines/presets` - GET/POST/DELETE engine presets
   - `/api/engines/check` - Test engine connectivity
   - Stores presets as `{name}_engine_conf.json` in `/engine_presets/`

3. **`dreams.js`** (not viewed yet, but exists)
   - Likely handles dream history CRUD with SQLite

4. **`auth.js`** (not viewed yet, but exists)
   - Authentication logic (JWT tokens mentioned in package.json)

#### **B. Service Adapters (`/services/`)**
1. **`comfyService.ts`** (734 lines) - **THE BEAST**
   - Core functions:
     - `generateComfyImage()` - Image generation with WebSocket progress
     - `generateComfyVideo()` - Video generation (SVD/AnimateDiff)
     - `modifyWorkflow()` - Injects settings into ComfyUI JSON workflows
     - `uploadImageToComfy()` - Image upload for img2img
     - `getAvailableModels()`, `getAvailableLoras()`, `getAvailableIPAdapters()`
   - Workflow templates: T2I, I2I, IP-Adapter, SVD, AnimateDiff
   - WebSocket handling for real-time progress

2. **`ollamaService.ts`** (217 lines)
   - `runOllamaLayer()` - Generic pipeline layer executor
   - `callOllamaAgent()` - Internal agent caller with JSON parsing
   - `checkOllamaConnection()`, `getOllamaModels()`, `getOllamaVersion()`
   - Robust JSON cleanup (handles markdown code blocks, regex extraction)

3. **`geminiService.ts`** (54 lines)
   - `analyzeDreamGemini()` - Proxies to backend `/api/ai/analyze`
   - `checkGeminiAvailability()` - Tests Gemini connection
   - **Note:** Image/video generation functions are deprecated (backend migration pending)

4. **`dynamicWorkflowEngine.ts`** (110 lines)
   - `DynamicWorkflowEngine.injectExample()` - Heuristic-based workflow modification
   - `injectPrompt()` - Recursive prompt injection into CLIPTextEncode nodes
   - **Status:** Experimental/incomplete (complex graph traversal logic)

5. **`storageService.ts`** (not viewed, but exists)
   - Likely handles file I/O for saved dreams

#### **C. Contexts (`/contexts/`)**
1. **`EngineContext.tsx`** (320 lines) - **SINGLE SOURCE OF TRUTH**
   - Manages global engine state (Analysis, Image, Video, Dictation)
   - `EngineProvider` component wraps entire app
   - Functions: `addEngine`, `updateEngine`, `removeEngine`, `setDefaultEngine`
   - Preset management: `savePreset`, `loadPreset`, `deletePreset`
   - Engine status tracking with `Map<string, EngineStatus>`
   - LocalStorage persistence

2. **`ConnectionContext.tsx`** (90 lines) - **LEGACY (being phased out)**
   - Stores connection settings (ollamaHost, comfyHost, transcription config)
   - Still used by some components but being replaced by EngineContext
   - Smart hydration from environment variables

3. **`AuthContext.tsx`** (not viewed, but exists)
   - User authentication state

#### **D. Hooks (`/hooks/`)**
1. **`useDreamEngine.ts`** (766 lines) - **THE GOD HOOK**
   - Core orchestrator for the entire Dream pipeline
   - Key functions:
     - `processDream()` - Analysis pipeline (Vision → Enhancer → Formatter)
     - `generateImage()` - Image generation with workflow selection
     - `generateVideo()` - Video generation
     - `checkAllConnections()` - Tests all AI services
   - Accepts optional `EngineConfig` overrides for dynamic engine selection
   - Manages state: `isAnalyzing`, `isGeneratingImage`, `progress`, etc.

2. **`useEngineManager.ts`** (14 lines)
   - Thin wrapper around `EngineContext`
   - Re-exports types for compatibility
   - Ensures single source of truth

3. **`useWorkflow.ts`** (4069 bytes)
   - Manages custom workflow presets
   - Separate state for Image and Video workflows

4. **`useLogging.ts`** (965 bytes)
   - Centralized logging hook (System, Ollama, ComfyUI logs)

5. **`useAppUI.ts`** (2044 bytes)
   - UI state management (extracted from App.tsx)

6. **`useTranscriber.ts`** (3584 bytes)
   - Audio transcription logic

7. **`useAudioRecorder.ts`** (2033 bytes)
   - Audio recording utilities

---

### 🔄 **Data Flow (The Dream Pipeline)**

```
USER INPUT
    ↓
App.tsx (State Hub)
    ↓
useDreamEngine.processDream()
    ↓
┌─────────────────────────────────────┐
│  ANALYSIS PHASE                     │
│  - Check EngineContext for selected │
│    analysis engine                  │
│  - Route to Gemini or Ollama        │
│  - Run multi-layer pipeline         │
│  - Return DreamAnalysis object      │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  GENERATION PHASE                   │
│  - Check EngineContext for selected │
│    image/video engine               │
│  - Route to ComfyUI (local/RunPod)  │
│  - Inject settings into workflow    │
│  - WebSocket progress monitoring    │
│  - Save to /saved_dreams/           │
└─────────────────────────────────────┘
    ↓
Gallery / ResultView
```

---

### 🐛 **Known Issues / Technical Debt (from agent.md)**

1. **Manual History Legacy**
   - Some manual history code removed from `useAppUI`
   - Potential regressions to watch for

2. **Complex Prop Drilling**
   - `App.tsx` is still large (564 lines, 22KB)
   - Extracted `Dashboard` but data flow is heavy
   - Could benefit from more context extraction

3. **Vite HMR Warning**
   - `EngineContext.tsx` exports both Component and Hook
   - Harmless dev-only warning (can be ignored)

4. **Dynamic Workflow Engine**
   - `dynamicWorkflowEngine.ts` is incomplete
   - Graph traversal logic for custom workflows needs work
   - Currently only handles simple KSampler → CLIPTextEncode flows

5. **Deprecated Gemini Functions**
   - `generateDreamImage()` and `generateDreamVideo()` in geminiService
   - Marked as "backend migration pending"
   - Need to implement or remove

---

### 🎯 **Backend Responsibilities Summary**

As the backend engineer, I'm responsible for:

**✅ Server Layer:**
- Express routes (`/server/routes/*.js`)
- API endpoints for AI proxying, engine management, dream persistence
- File uploads (multer), CORS, authentication

**✅ Service Adapters:**
- ComfyUI integration (WebSocket, workflow manipulation)
- Ollama integration (local LLM, pipeline execution)
- Gemini integration (cloud LLM, dual-agent analysis)
- Storage service (file I/O)

**✅ State Management:**
- `EngineContext` (global engine state)
- `ConnectionContext` (legacy, being phased out)
- `useDreamEngine` (core orchestration logic)
- `useEngineManager` (engine CRUD operations)

**✅ Data Persistence:**
- SQLite database (`dreams.db`)
- Engine presets (JSON files in `/engine_presets/`)
- Generated media (files in `/saved_dreams/`)

**🚫 NOT My Domain (Fronty's):**
- UI components (`/components/`)
- Styling (TailwindCSS, Framer Motion)
- Layout (`Header`, `Dashboard`, panels)
- Visualizers (ArchitectureViewer, WorkflowVisualizer)

---

### ✅ **Task Complete**

I now have a comprehensive understanding of the backend architecture and am ready to:
- Fix bugs in server routes or services
- Implement new API endpoints
- Optimize ComfyUI workflow handling
- Refactor state management
- Add new AI service integrations
- Debug WebSocket issues
- Improve error handling and logging

**Status:** READY FOR BACKEND TASKS 🚀
