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

export const analyzeDreamTextOllama = async (dreamText: string, attachments: DreamAttachment[] = [], host: string): Promise<DreamAnalysis> => {
  // Determine if this is a vision task or pure text task
  const hasImages = attachments.length > 0;

  // Select the appropriate model
  // If images exist => Use Vision Model (default: llava)
  // If text only => Use Text Model (default: llama3)
  const model = hasImages
    ? (import.meta.env.VITE_OLLAMA_VISION_MODEL || 'llava:latest')
    : (import.meta.env.VITE_OLLAMA_TEXT_MODEL || 'llama3:latest');

  console.log(`[Ollama] Analyzing with model: ${model} (Has Images: ${hasImages})`);

  const systemPrompt = `
    You are an expert dream interpreter.
    Analyze the following dream memory.
    
    Return ONLY valid JSON with this exact structure:
    {
      "title": "A cryptic title",
      "summary": "Short summary",
      "interpretation": "Psychological interpretation",
      "symbolism": ["symbol1", "symbol2"],
      "visualPrompt": "A highly descriptive visual prompt for image generation, focusing on lighting and suralism."
    }
    
    Do not include any text before or after the JSON.
    
    Dream Memory: "${dreamText}"
  `;

  // Extract base64 images if any
  const images = attachments.map(att => att.base64);

  try {
    const response = await fetch(`${host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: systemPrompt,
        stream: false,
        format: "json",
        options: {
          num_ctx: 2048, // Reduce context window to save VRAM
          num_predict: 512, // Limit output tokens
          temperature: 0.7
        },
        images: images.length > 0 ? images : undefined
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API Error: ${response.statusText}`);
    }

    const data = await response.json()

    // Ollama 'json' format usually returns a stringified JSON object in 'response'
    const result = JSON.parse(data.response) as DreamAnalysis;

    // Logic to append dreamText removed to keep prompts separate for metadata injection

    return result;

  } catch (error: any) {
    console.error("Ollama Analysis Failed:", error);
    // Rethrow to allow UI to show the error state instead of failing silently with a mock
    throw error;
  }
};
