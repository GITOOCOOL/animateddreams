import express from 'express';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { GoogleGenAI, SchemaType } = require("@google/genai");
import multer from 'multer';

// Note: fetch and FormData are native in Node 18+ and verified to work
// No imports needed for them.

const router = express.Router();

const getClient = () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key not found in environment.");
    }
    return new GoogleGenAI({ apiKey });
};

// Check Availability
router.get('/availability', async (req, res) => {
    try {
        const ai = getClient();
        // Minimal generation check
        await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: { parts: [{ text: "p" }] },
            config: { maxOutputTokens: 1 }
        });
        res.json({ available: true });
    } catch (error) {
        console.warn("Gemini Check Failed:", error.message);
        res.status(503).json({ available: false, error: error.message });
    }
});

// Analyze Dream (Dual Agent Pipeline)
router.post('/analyze', async (req, res) => {
    try {
        const { dreamText, attachments } = req.body; // attachments: { mimeType, base64 }[]
        const ai = getClient();
        const modelName = 'gemini-2.0-flash-exp';

        // --- PREPARE ATTACHMENTS FOR VISION ---
        const imageParts = [];
        if (attachments && Array.isArray(attachments)) {
            attachments.forEach(att => {
                if (att.base64 && att.mimeType) {
                    const base64Data = att.base64.replace(/^data:.*\/.*;base64,/, '');
                    imageParts.push({
                        inlineData: { mimeType: att.mimeType, data: base64Data }
                    });
                }
            });
        }

        console.log(`[Gemini Dual-Agent] Starting Analysis for: "${dreamText.substring(0, 30)}..."`);

        // --- AGENT 1: THE PSYCHOLOGIST ---
        const psychologistSystemPrompt = `
            You are Dr. Jung, an expert analytical psychologist.
            Analyze the following dream memory for hidden emotions, suppressed desires, and archetypal symbolism.
            
            Return JSON:
            {
                "title": "A short, poetic title",
                "summary": "Concise summary",
                "interpretation": "Deep psychological analysis",
                "symbolism": ["symbol1", "symbol2"],
                "mood": "Emotional atmosphere"
            }
            
            Dream: "${dreamText}"
        `;

        const psychParts = [{ text: psychologistSystemPrompt }, ...imageParts];

        const psychResponse = await ai.models.generateContent({
            model: modelName,
            contents: { parts: psychParts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        title: { type: SchemaType.STRING },
                        summary: { type: SchemaType.STRING },
                        interpretation: { type: SchemaType.STRING },
                        symbolism: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                        mood: { type: SchemaType.STRING }
                    },
                    required: ["title", "summary", "interpretation", "symbolism", "mood"]
                }
            }
        });

        const psychText = psychResponse.text();
        if (!psychText) throw new Error("Agent 1 (Psychologist) failed to generate output.");
        const psychResult = JSON.parse(psychText);
        console.log("[Gemini] Agent 1 Complete:", psychResult.title);


        // --- AGENT 2: THE VISUALIZER ---
        const visualizerSystemPrompt = `
            You are an expert AI Art Director.
            Translate this dream's psychological mood into a precise Stable Diffusion XL (SDXL) prompt.
            
            Context:
            - Dream: "${dreamText}"
            - Mood: "${psychResult.mood}"
            - Symbols: ${psychResult.symbolism.join(", ")}
            - Interpretation: "${psychResult.interpretation}"

            Instructions:
            1. Visually represent the *feeling* described.
            2. Use professional art keywords (8k, octane render, cinematic lighting).
            3. Do NOT include text/interface elements.
            
            Return JSON:
            {
                "visualPrompt": "Your detailed SDXL prompt string"
            }
        `;

        // Pass images again for visual context
        const vizParts = [{ text: visualizerSystemPrompt }, ...imageParts];

        const vizResponse = await ai.models.generateContent({
            model: modelName,
            contents: { parts: vizParts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        visualPrompt: { type: SchemaType.STRING }
                    },
                    required: ["visualPrompt"]
                }
            }
        });

        const vizText = vizResponse.text();
        if (!vizText) throw new Error("Agent 2 (Visualizer) failed to generate output.");
        const vizResult = JSON.parse(vizText);
        console.log("[Gemini] Agent 2 Complete.");

        // --- MERGE ---
        const finalResult = {
            ...psychResult,
            visualPrompt: vizResult.visualPrompt
        };

        res.json(finalResult);

    } catch (error) {
        console.error("Analysis Failed:", error);
        res.status(500).json({ error: error.message });
    }
});

// Configure Multer for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// Transcribe Audio
router.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No audio file provided" });
        }

        // Determine Target URL and Headers
        const whisperUrl = req.headers['x-whisper-host'] || process.env.VITE_WHISPER_API_URL || 'http://localhost:9000/v1/audio/transcriptions';
        // PRIORITY: Server Environment > Client Header
        // This fixes issues where client sends malformed/cached keys
        const apiKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY || req.headers['x-api-key'];
        const model = req.headers['x-whisper-model'] || 'whisper-1';
        
        console.log(`[Whisper] Transcribing via ${whisperUrl}...`);
        if (apiKey) console.log(`[Whisper] API Key received: ${apiKey.substring(0, 8)}...`);
        else console.log(`[Whisper] NO API Key header received!`);
        
        // Use Native FormData and Blob (Node 18+)
        // Note: No imports needed for Blob/FormData in Node > 18
        const formData = new FormData();
        
        // Convert Multer Buffer to Blob
        const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
        formData.append('file', fileBlob, 'audio.webm');
        formData.append('model', model);

        const headers = {};
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        // Note: Native fetch automatically sets Content-Type with boundary for FormData

        const response = await fetch(whisperUrl, {
            method: 'POST',
            body: formData,
            headers: headers
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[Whisper] Upstream Error (${response.status}):`, errText);
            throw new Error(`Upstream Error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        res.json({ text: data.text });

    } catch (error) {
        console.error("Transcription Failed:", error);
        res.status(502).json({ 
            error: "Transcription Service Unavailable", 
            details: error.message
        });
    }
});

export default router;
