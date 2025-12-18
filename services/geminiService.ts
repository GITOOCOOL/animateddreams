import { GoogleGenAI, Type } from "@google/genai";
import { DreamAnalysis, DreamAttachment } from "../types";

/**
 * ARCHITECTURE NOTE FOR MERN STACK:
 * Currently, this prototype calls the Google GenAI SDK directly from the client.
 * To integrate with a MERN stack (Antigravity):
 * 1. Move these function implementations to your Node.js/Express backend controllers.
 * 2. Replace the client-side calls below with `fetch('/api/dreams/analyze', ...)` etc.
 * 3. Store the generated `DreamAnalysis` and media URLs in your MongoDB `Dream` schema.
 */

// Helper to get a fresh client instance. 
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Analyzes the dream text using Gemini 3 Pro to extract meaning and create a visual prompt.
 * Accepts optional attachments (images/PDFs) for context.
 */
export const analyzeDreamText = async (dreamText: string, attachments: DreamAttachment[] = []): Promise<DreamAnalysis> => {
  const ai = getClient();
  
  const systemPrompt = `
    You are an expert dream interpreter and avant-garde visual artist. 
    Analyze the following dream memory and any attached context (images of characters, places, documents).
    
    Provide:
    1. A cryptic but evocative title.
    2. A short, mysterious summary.
    3. A psychological/symbolic interpretation (Jungian/Freudian mix).
    4. A list of key symbols.
    5. A highly descriptive, cinematic, and surreal visual prompt suitable for a high-end video generation AI (like Veo). Focus on lighting, atmosphere, texture, and surrealism.
    
    If images/documents are provided, use them to infer the visual style or specific details of characters/locations in the interpretation and visual prompt.
    
    Dream Memory: "${dreamText}"
  `;

  // Construct the multipart content
  const parts: any[] = [{ text: systemPrompt }];

  // Add attachments
  attachments.forEach(att => {
    parts.push({
      inlineData: {
        mimeType: att.mimeType,
        data: att.base64
      }
    });
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          interpretation: { type: Type.STRING },
          symbolism: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          visualPrompt: { type: Type.STRING, description: "A detailed visual description for video generation software." }
        },
        required: ["title", "summary", "interpretation", "symbolism", "visualPrompt"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No analysis generated");
  
  return JSON.parse(text) as DreamAnalysis;
};

/**
 * Generates a high-quality still image using Gemini 3 Pro Image Preview.
 */
export const generateDreamImage = async (visualPrompt: string): Promise<string> => {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [{ text: visualPrompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: "2K"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated");
};

/**
 * Generates a video using Veo (veo-3.1-fast-generate-preview).
 */
export const generateDreamVideo = async (visualPrompt: string): Promise<string> => {
  const ai = getClient();

  // 1. Start the operation
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: visualPrompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  // 2. Poll until done
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  // 3. Extract URI
  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  
  if (!videoUri) {
    throw new Error("Video generation completed but no URI returned.");
  }

  // 4. Fetch the actual video bytes
  const fetchUrl = `${videoUri}&key=${process.env.API_KEY}`;
  
  const videoResponse = await fetch(fetchUrl);
  if (!videoResponse.ok) {
     throw new Error("Failed to download generated video.");
  }
  
  const blob = await videoResponse.blob();
  return URL.createObjectURL(blob);
};