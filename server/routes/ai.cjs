const express = require('express');
const { GoogleGenAI, SchemaType } = require("@google/genai");
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

const multer = require('multer');
const FormData = require('form-data');
const fetch = require('node-fetch'); // Ensure node-fetch is available, or use native fetch in Node 18+

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
        const apiKey = req.headers['x-api-key'];
        const model = req.headers['x-whisper-model'] || 'whisper-1';
        
        console.log(`[Whisper] Transcribing via ${whisperUrl}...`);

        // Create FormData for the external API
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: 'audio.webm',
            contentType: req.file.mimetype,
        });
        formData.append('model', model); 

        const headers = {};
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch(whisperUrl, {
            method: 'POST',
            body: formData,
            headers: headers
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Whisper API Error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        res.json({ text: data.text });

    } catch (error) {
        console.error("Transcription Failed:", error);
        // Fallback for demo purposes if no server is running? 
        // No, better to error out so user knows to run the server.
        res.status(502).json({ 
            error: "Transcription Service Unavailable", 
            details: error.message,
            hint: "Ensure a Whisper-compatible server is running at VITE_WHISPER_API_URL"
        });
    }
});

module.exports = router;
