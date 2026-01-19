import { DreamAnalysis } from "../types";

/**
 * Checks if Ollama is reachable and the model is loaded.
 */
export const checkOllamaConnection = async (host: string): Promise<boolean> => {
  try {
    const response = await fetch(`${host}/api/tags`);
    return response.ok;
  } catch (error) {
    // Fail silently to avoid noise in the console, as this is just a capability check
    // console.warn("Ollama connection check failed:", error); 
    return false;
  }
};

/**
 * Fetches the Ollama version.
 */
export const getOllamaVersion = async (host: string): Promise<string | null> => {
    try {
        const response = await fetch(`${host}/api/version`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.version;
    } catch (e) {
        return null; // Fallback
    }
};

/**
 * Fetches available Ollama models.
 */
export const getOllamaModels = async (host: string): Promise<string[]> => {
    try {
        const response = await fetch(`${host}/api/tags`);
        if (!response.ok) return [];
        const data = await response.json();
        // data.models is an array of objects { name: "llama3:latest", ... }
        return data.models?.map((m: any) => m.name) || [];
    } catch (e) {
        console.warn("Failed to fetch Ollama models:", e);
        return [];
    }
};

/**
 * Analyzes dream text using local Ollama model.
 */
/**
 * Generates a fallback analysis when the AI model fails.
 * Uses the original text directly for generation.
 */
const generateFallbackAnalysis = (text: string): DreamAnalysis => {
  return {
    title: "Direct Generation",
    summary: "AI Analysis bypassed. Using original prompt.",
    interpretation: "Neural connection unstable. Direct sensory input enabled.",
    symbolism: ["Direct Input", "Manual Override"],
    visualPrompt: text // Use original prompt directly
  };
};





/**
 * Helper to call Ollama with a specific system prompt
 */
/**
 * Helper to call Ollama with a specific system prompt
 */
/**
 * Generic Planner/Executor for a single Pipeline Layer
 */
export const runOllamaLayer = async (
    host: string,
    config: import('../types').AgentConfig,
    userPrompt: string,
    context: any, // Previous layer output
    images: string[] = [],
    addLog?: (msg: string) => void,
    signal?: AbortSignal // Cancellation Support
): Promise<any> => {
    
    // Construct System Prompt (append specific instructions if needed)
    let systemPrompt = config.systemPrompt || "You are a helpful AI assistant.";
    
    const rawResult = await callOllamaAgent(host, config.model, systemPrompt, userPrompt, config.temperature, images, addLog, signal);
    
    // Validation / Parsing 
    // We try to parse JSON if the prompt asks for it, but if it fails we return raw text
    // The visualizer will handle displaying mixed types
    
    // Check if result is string or object
    if (typeof rawResult === 'string') {
        // Try parsing one last time just in case callOllamaAgent returned a stringified JSON
        try {
             return JSON.parse(rawResult);
        } catch(e) {
             return rawResult;
        }
    }
    
    return rawResult;
};

// Internal Helper (kept private or exported if needed)
const callOllamaAgent = async (
    host: string, 
    model: string, 
    systemPrompt: string, 
    userPrompt: string, 
    temperature: number, 
    images: string[] = [],
    addLog?: (msg: string) => void,
    signal?: AbortSignal
): Promise<any> => {
    
    const log = (msg: string) => {
        if (addLog) addLog(msg);
    };

    const payload = {
        model: model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt, images: images.length > 0 ? images : undefined }
        ],
        stream: false,
        options: {
            temperature: temperature
        }
    };

    // log(`POST /api/chat [Model: ${model}]`);
    // console.log(`[Ollama Raw] Model: ${model}, Payload sent.`);

    const response = await fetch(`${host}/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal // Pass abort signal
    });

    if (!response.ok) {
        log(`Error: ${response.statusText}`);
        throw new Error(`Ollama Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    const textResponse = data.message?.content || data.response;

    if (!textResponse) {
        throw new Error("Ollama returned invalid format");
    }

    // Robust JSON Cleanup & Parsing
    try {
        // 1. Try direct parse
        return JSON.parse(textResponse);
    } catch (e) {
        // 2. Try stripping Markdown Code Blocks (```json ... ```)
        const markdownCleaned = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
            return JSON.parse(markdownCleaned);
        } catch (e2) {
             // 3. Regex Extraction (Find { ... } from the very first opening bracket to the very last closing bracket)
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[0]);
                } catch (e3) {
                    // console.error("Fallback JSON regex extraction failed.");
                }
            }
        }
        
        // Return raw text if JSON parsing fails
        return textResponse;
    }
};


// Helper for validation (Enhanced for Single Pass)
const validateAnalysis = (result: any): DreamAnalysis => {
    // If result is just a string or null, provide full fallback
    if (typeof result !== 'object' || result === null) {
        return {
            title: "Untitled Dream Analysis",
            summary: "The AI returned raw text instead of structured data.",
            interpretation: typeof result === 'string' ? result : "Interpretation unavailable.",
            symbolism: [],
            mood: "Ambiguous",
            visualPrompt: typeof result === 'string' ? result.slice(0, 300) : "surreal abstract dreamscape, high quality, 8k"
        };
    }

    // Ensure all fields exist with defaults
    return {
        title: result.title || "Untitled Dream",
        summary: result.summary || "No summary provided.",
        interpretation: result.interpretation || "Interpretation unavailable.",
        symbolism: Array.isArray(result.symbolism) ? result.symbolism : [],
        mood: result.mood || "Mysterious",
        visualPrompt: result.visualPrompt || result.visual_prompt || "surreal dream scene, cinematic lighting, 8k, highly detailed"
    };
};

// analyzeDreamTextOllama removed - replaced by Pipeline runOllamaLayer


