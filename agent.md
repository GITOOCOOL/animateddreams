# Animated Dreams - Agent & Developer Documentation

## Project Overview
**Animated Dreams** is a Generative AI application that transforms text into visual art (images and videos). It uses a local-first approach with a Node.js/Express backend and a React/Vite frontend.

### Core Technologies
-   **Frontend**: React, Vite, TailwindCSS, Framer Motion
-   **Backend**: Node.js, Express, SQLite
-   **AI Services**:
    -   **Ollama**: Local text analysis and prompt enhancement.
    -   **Google Gemini**: Cloud-based advanced text analysis (optional).
    -   **ComfyUI**: Node-based Stable Diffusion engine for image/video generation.

## Architecture & Network
The app is designed to run on a host machine (GPU server) and be accessible from any device on the local network (LAN).

-   **Frontend Port**: `5173` (Vite, exposes `0.0.0.0`)
-   **Backend Port**: `3001` (Express, proxies `/api`)
-   **Safe Local Mode**: Uses relative paths (`/api/...`) to ensure proxies work correctly across the network.
-   **Security**: Uses a manual `generateUUID()` polyfill to support functionality in non-secure (HTTP) LAN contexts where `crypto.randomUUID` is unavailable.

## Directory Structure
-   `/server`: Express backend logic (`index.js`).
-   `/src`: React frontend source.
    -   `/components`: UI components (`MediaPanel`, `ResultView`, etc.).
    -   `/hooks`: Custom hooks (`useDreamEngine.ts` - Core Logic).
    -   `/services`: API wrappers (`comfyService.ts`, `ollamaService.ts`).
    -   `/contexts`: Global state (`ConnectionContext`, `AuthContext`).

## Recent Changes (Changelog)
### Fixes & Refinements [Latest]
1.  **Remote Access Support**:
    -   Replaced hardcoded `localhost:3001` with relative paths.
    -   Added `generateUUID` polyfill to fix crashes on HTTP LAN connections.
2.  **UI/UX Improvements**:
    -   **Separated Progress Bars**: Dedicated purple bar for Text Analysis (Input Card) vs. Cyan bar for Neural Generation (Media Panel).
    -   **Result View Layout**: Refactored to a flex-column layout to prevent image truncation. Details panel now sits *below* the image.
    -   **Settings**: Fixed "Denoise" slider snapping issue (allow `0` value).

## Development Setup
1.  **Prerequisites**: Node.js 18+, Python 3.10+ (for ComfyUI), Ollama.
2.  **Install**: `npm install`
3.  **Run**: `npm run dev` (Starts both Frontend and Backend concurrently).

## Troubleshooting
-   **"crypto.randomUUID is not a function"**: This is fixed by the polyfill. If it reappears, ensure you aren't using raw `crypto` calls in client-side code without the helper.
-   **Images not loading remotely**: Ensure the backend allows CORS (it does) and that you are accessing via the IP address, not `localhost`.
