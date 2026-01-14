import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Storage Directory
const STORAGE_DIR = path.join(__dirname, '..', '..', 'saved_dreams');
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Helper to download/save image from URL or Base64
async function handleMediaSave(dreamId, mediaItem) {
    console.log(`[Server] Handling Media Save for Dream: ${dreamId}`);
    try {
        const { url, type } = mediaItem;
        const ext = type === 'video' ? '.mp4' : '.png';
        const filename = `${dreamId}${ext}`;
        const localPath = path.join(STORAGE_DIR, filename);

        if (url.startsWith('http')) {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            fs.writeFileSync(localPath, Buffer.from(arrayBuffer));
        } else if (url.startsWith('/api/comfy')) {
            // Fix relative URLs from Proxy using the configured Host
            const comfyHost = process.env.VITE_COMFY_API_HOST || 'http://127.0.0.1:8188';
            const comfyUrl = `${comfyHost}${url.replace('/api/comfy', '')}`;
            const response = await fetch(comfyUrl);
            if (!response.ok) throw new Error(`Failed to fetch from ComfyUI`);
            const arrayBuffer = await response.arrayBuffer();
            fs.writeFileSync(localPath, Buffer.from(arrayBuffer));
        } else if (url.startsWith('data:')) {
            const base64Data = url.split(';base64,').pop();
            fs.writeFileSync(localPath, base64Data, { encoding: 'base64' });
        }

        // Save entry to DB
        return new Promise((resolve, reject) => {
            const stmt = db.prepare("INSERT INTO dream_images (id, dreamId, filePath, type) VALUES (?, ?, ?, ?)");
            const imgId = `${dreamId}_img`;
            const publicUrl = `/storage/${filename}`;

            stmt.run(imgId, dreamId, publicUrl, type, (err) => {
                if (err) reject(err);
                else resolve(publicUrl);
            });
            stmt.finalize();
        });
    } catch (error) {
        console.error(`[Server] handleMediaSave Error:`, error);
        throw error;
    }
}

// GET all dreams (Filtered by User)
router.get('/', authenticateToken, (req, res) => {
    const sql = `
        SELECT d.*, i.filePath, i.type 
        FROM dreams d 
        LEFT JOIN dream_images i ON d.id = i.dreamId
        WHERE d.userId = ?
        ORDER BY d.createdAt DESC
    `;

    db.all(sql, [req.user.id], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });

        const dreams = {};
        rows.forEach(row => {
            if (!dreams[row.id]) {
                dreams[row.id] = {
                    id: row.id,
                    userId: row.userId,
                    rawText: row.rawText,
                    visualPrompt: row.visualPrompt,
                    analysis: JSON.parse(row.analysis || '{}'),
                    createdAt: row.createdAt,
                    media: []
                };
            }
            if (row.filePath) {
                dreams[row.id].media.push({
                    filePath: row.filePath,
                    type: row.type
                });
            }
        });

        res.json(Object.values(dreams));
    });
});

// POST save a dream
router.post('/', authenticateToken, async (req, res) => {
    const { id, rawText, visualPrompt, analysis, media } = req.body;
    const userId = req.user.id;

    const stmt = db.prepare("INSERT OR REPLACE INTO dreams (id, userId, rawText, visualPrompt, analysis, createdAt) VALUES (?, ?, ?, ?, ?, ?)");
    stmt.run(id, userId, rawText, visualPrompt, JSON.stringify(analysis), Date.now(), function (err) {
        if (err) return res.status(400).json({ error: err.message });

        const dreamId = id;
        if (media) {
            handleMediaSave(dreamId, media).then((savedPath) => {
                res.json({ message: "Dream saved successfully", savedPath });
            }).catch(e => {
                res.status(500).json({ error: "Failed to save media file" });
            });
        } else {
            res.json({ message: "Dream saved (no media)" });
        }
    });
    stmt.finalize();
});

export default router;
