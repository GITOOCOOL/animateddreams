import { DreamAnalysis, DreamAttachment } from "../types";

const API_BASE = '/api/ai';

export const checkGeminiAvailability = async (): Promise<boolean> => {
   try {
     const response = await fetch(`${API_BASE}/availability`);
     if (!response.ok) return false;
     const data = await response.json();
     return data.available === true;
   } catch (error) {
     console.warn("Gemini Availability Check Failed:", error);
     return false;
   }
};

/**
 * Analyzes the dream text using the backend API.
 */
export const analyzeDreamGemini = async (dreamText: string, attachments: DreamAttachment[] = []): Promise<DreamAnalysis> => {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        dreamText,
        attachments
    })
  });

  if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Analysis failed: ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Generates a high-quality still image using Gemini 3 Pro Image Preview.
 * @deprecated - backend migration pending
 */
export const generateDreamImage = async (visualPrompt: string): Promise<string> => {
  throw new Error("Feature temporarily unavailable during backend migration.");
};

/**
 * Generates a video using Veo (veo-3.1-fast-generate-preview).
 * @deprecated - backend migration pending
 */
export const generateDreamVideo = async (visualPrompt: string): Promise<string> => {
  throw new Error("Feature temporarily unavailable during backend migration.");
};