
# Animated Dreams

A generative AI dream journal that uses local LLMs (Ollama) and Image Generation models (ComfyUI) to interpret and visualize your dreams.

![UI Preview](https://via.placeholder.com/800x450?text=Animated+Dreams+Preview)

## Features
- **Dream Interpretation**: Uses Ollama (Llama3, Mistral, etc.) to analyze dream symbolism.
- **Visual Generation**: Connects to ComfyUI (Stable Diffusion, Flux) to generate high-quality images.
- **Video Synthesis**: Generates short video clips from dream images (SVD/Veo).
- **Dynamic Connection**: Configure your AI servers (Local or Remote) directly from the UI.
- **Dream Journal**: Saves your dreams, analysis, and media to a local database.

## Prerequisites

1.  **Node.js**: v18 or higher.
2.  **Ollama**: Installed and running.
    -   Must allow CORS or be proxied (Default: `127.0.0.1:11434`).
    -   Models: `llama3` (or similar text model) and `llava` (optional for vision).
3.  **ComfyUI**: Installed and running.
    -   Must be started with `--listen --enable-cors-header *` to accept external connections.
    -   Must have a valid workflow (default template included in `workflow_template.json`).

## Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Setup Environment (Optional but recommended):
    -   Copy `.env.example` to `.env` (if exists, otherwise create it).
    -   The app now supports **Dynamic Configuration** via the UI, so `.env` is less critical for connections.

## Running the App

1.  Start the development server (Frontend + Backend):
    ```bash
    npm run dev
    ```
2.  Open your browser at `http://localhost:5173`.

## Configuration

### Neural Network Connections
You can configure where the app looks for Ollama and ComfyUI directly in the **Settings Panel**.

1.  Click the **Settings** icon.
2.  Scroll to **Network Connections**.
3.  Enter your host URLs (e.g., `http://192.168.1.5:11434` for Ollama).
4.  Click the **Test** icon to verify connectivity.
5.  These settings are saved to your browser.

### ComfyUI Setup
Ensure your ComfyUI has the necessary nodes:
-   `CheckpointLoaderSimple`
-   `KSampler`
-   `SaveImage`
-   `LoraLoader` (if using LoRAs)

## Troubleshooting

-   **Ollama Connection Failed**:
    -   Ensure Ollama is running (`ollama serve`).
    -   If running on a different machine, ensure `OLLAMA_HOST=0.0.0.0` environment variable is set on that machine.
    -   Check CORS settings if connecting directly from browser.

-   **ComfyUI Connection Failed (CORS)**:
    -   The browser blocks connections to remote servers by default.
    -   **Fix**: Start ComfyUI with: `python main.py --listen --enable-cors-header *`

-   **Saving Dreams Fails (403/Forbidden)**:
    -   Your session might be expired. Refresh the page to log in again.
