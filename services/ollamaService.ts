import { DreamAnalysis, DreamAttachment } from "../types";

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
const callOllamaAgent = async (
    host: string, 
    model: string, 
    systemPrompt: string, 
    userPrompt: string, 
    temperature: number, 
    images: string[] = [],
    addLog?: (msg: string) => void
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

    log(`POST /api/chat [Model: ${model}]`);

    console.log(`[Ollama Raw] Model: ${model}, Payload sent.`);

    const response = await fetch(`${host}/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        log(`Error: ${response.statusText}`);
        throw new Error(`Ollama Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    const textResponse = data.message?.content || data.response;

    if (!textResponse) {
        log("Error: No 'message.content' or 'response' field in Ollama output");
        console.error("Ollama Unexpected Response:", data);
        throw new Error("Ollama returned invalid format");
    }

    log(`Response Received (${textResponse.length} chars)`);
    // console.log(`[Ollama Raw] Model: ${model}, Response:`, textResponse);

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
                    console.error("Fallback JSON regex extraction failed.");
                }
            }
        }
        
        console.warn("[Ollama] Parsing failed. Returning raw text.");
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

export const analyzeDreamTextOllama = async (
    dreamText: string, 
    attachments: DreamAttachment[] = [], 
    host: string, 
    settings?: import('../types').DualAgentSettings,
    addLog?: (msg: string) => void
): Promise<DreamAnalysis> => {
  const hasImages = attachments.length > 0;
  const images = attachments.map(att => att.base64);

  // Use Psychologist settings as the "Main" settings for single-pass
  // Logic: The user likely selected their best "Smart" model for the Psychologist
  const model = settings?.psychologist.model || (hasImages ? (import.meta.env.VITE_OLLAMA_VISION_MODEL || 'llava:latest') : (import.meta.env.VITE_OLLAMA_TEXT_MODEL || 'llama3:latest'));
  const temperature = settings?.psychologist.temperature ?? 0.7;

  const log = (msg: string) => {
      console.log(`[Ollama] ${msg}`);
      if (addLog) addLog(msg);
  };

  log(`Starting Single-Pass Analysis with model: ${model}`);

  // Combined System Prompt
  const systemPrompt = `
    You are an expert Dream Interpreter and Visual Artist.
    Your goal is to analyze the user's dream and describe it visually.

    1. ANLYZE the dream for hidden meaning, symbolism, and mood.
    2. CREATE a "visualPrompt" for Stable Diffusion that captures this scene artistically.

    Return ONLY valid JSON with this exact structure:
    {
      "title": "Short poetic title",
      "summary": "Brief summary of the dream",
      "interpretation": "Deep psychological meaning",
      "symbolism": ["symbol1", "symbol2", "symbol3"],
      "mood": "Emotional atmosphere",
      "visualPrompt": "Detailed, comma-separated image generation prompt, focusing on visual elements, lighting, and style. NO text."
    }
  `;

  log("Sending request...");
  // Pass logger to inner helper via closure or argument. 
  // Let's pass it to callOllamaAgent explicitly to get raw logs.
  const rawResult = await callOllamaAgent(host, model, systemPrompt, dreamText, temperature, images, addLog);
  
  const finalResult = validateAnalysis(rawResult);
  log(`Analysis Complete: ${finalResult.title}`);

  return finalResult;
};


