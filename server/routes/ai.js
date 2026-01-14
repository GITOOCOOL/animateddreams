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

// Analyze Dream
router.post('/analyze', async (req, res) => {
    try {
        const { dreamText, attachments } = req.body; // attachments: { mimeType, base64 }[]
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

        const parts = [{ text: systemPrompt }];

        if (attachments && Array.isArray(attachments)) {
            attachments.forEach(att => {
                if (att.base64 && att.mimeType) {
                    // Extract base64 data if it has prefix
                    const base64Data = att.base64.replace(/^data:.*\/.*;base64,/, '');
                    parts.push({
                        inlineData: {
                            mimeType: att.mimeType,
                            data: base64Data
                        }
                    });
                }
            });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        title: { type: SchemaType.STRING },
                        summary: { type: SchemaType.STRING },
                        interpretation: { type: SchemaType.STRING },
                        symbolism: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING }
                        },
                        visualPrompt: { type: SchemaType.STRING, description: "A detailed visual description for video generation software." }
                    },
                    required: ["title", "summary", "interpretation", "symbolism", "visualPrompt"]
                }
            }
        });

        const text = response.text();
        if (!text) throw new Error("No analysis generated");

        res.json(JSON.parse(text));

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
