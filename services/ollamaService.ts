import { DreamAnalysis, DreamAttachment } from "../types";

// Use local proxy path
const OLLAMA_HOST = '/api/ollama';

/**
 * Checks if Ollama is reachable and the model is loaded.
 */
export const checkOllamaConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${OLLAMA_HOST}/tags`);
    return response.ok;
  } catch (error) {
    console.warn("Ollama connection check failed:", error);
    return false;
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

export const analyzeDreamTextOllama = async (dreamText: string, attachments: DreamAttachment[] = []): Promise<DreamAnalysis> => {
  const model = import.meta.env.VITE_OLLAMA_MODEL || 'llama3';
  
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
      const response = await fetch(`${OLLAMA_HOST}/generate`, {
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
        
      if (result.visualPrompt) {
            result.visualPrompt = `${dreamText}, ${result.visualPrompt}`;
      }
        
      return result;

  } catch (error: any) {
      console.error("Ollama Analysis Failed:", error);
      console.warn("Switching to Fallback Analysis Mode");
      
      // If the error is network related or model crash, use fallback
      return generateFallbackAnalysis(dreamText);
  }
};
