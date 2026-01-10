/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_COMFY_API_HOST: string
    readonly VITE_OLLAMA_API_HOST: string
    readonly VITE_OLLAMA_TEXT_MODEL: string
    readonly VITE_OLLAMA_VISION_MODEL: string
    readonly VITE_OLLAMA_MODEL: string
    readonly GEMINI_API_KEY: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
