
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// -----------------------------------------------------
// Storage Setup (File System)
// -----------------------------------------------------
const STORAGE_DIR = path.join(__dirname, '..', 'saved_dreams');
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Serve saved images statically
app.use('/storage', express.static(STORAGE_DIR));

// Configure Multer for processing base64/files if needed 
// (For this app, we might receive base64 from client and save it manually, 
// OR receive existing file paths if local. Let's assume we save base64/urls)

// -----------------------------------------------------
// Database Setup (SQLite)
// -----------------------------------------------------
const dbPath = path.join(__dirname, '..', 'dreams.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Database opening error: ', err);
    else console.log('Connected to SQLite database.');
});

// Create Tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS dreams (
        id TEXT PRIMARY KEY,
        rawText TEXT,
        visualPrompt TEXT,
        analysis TEXT, -- JSON string
        createdAt INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS dream_images (
        id TEXT PRIMARY KEY,
        dreamId TEXT,
        filePath TEXT,
        type TEXT, -- 'image' or 'video'
        FOREIGN KEY(dreamId) REFERENCES dreams(id)
    )`);
});

// -----------------------------------------------------
// Routes
// -----------------------------------------------------

// GET all dreams
app.get('/api/db/dreams', (req, res) => {
    const sql = `
        SELECT d.*, i.filePath, i.type 
        FROM dreams d 
        LEFT JOIN dream_images i ON d.id = i.dreamId
        ORDER BY d.createdAt DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        // Group images by dream since a dream might have multiple (future proofing)
        // or just format nicely.
        const dreams = {};
        rows.forEach(row => {
            if (!dreams[row.id]) {
                dreams[row.id] = {
                    id: row.id,
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
app.post('/api/db/dreams', async (req, res) => {
    const { id, rawText, visualPrompt, analysis, media } = req.body;
    // media is expected to be { url: string, type: 'image'|'video', isLocal: boolean }

    const stmt = db.prepare("INSERT OR REPLACE INTO dreams (id, rawText, visualPrompt, analysis, createdAt) VALUES (?, ?, ?, ?, ?)");
    stmt.run(id, rawText, visualPrompt, JSON.stringify(analysis), Date.now(), function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        const dreamId = id;

        // Handle Media
        if (media) {
            // If the media is a URL from ComfyUI (http://127.0.0.1...), we should fetch and save it locally
            // so it persists even if Comfy temp files are cleared.
            handleMediaSave(dreamId, media).then((savedPath) => {
                res.json({ message: "Dream saved successfully", savedPath });
            }).catch(e => {
                console.error("Failed to save media", e);
                res.status(500).json({ error: "Failed to save media file" });
            });
        } else {
            res.json({ message: "Dream saved (no media)" });
        }
    });
    stmt.finalize();
});

// Helper to download/save image from URL or Base64
async function handleMediaSave(dreamId, mediaItem) {
    console.log(`[Server] Handling Media Save for Dream: ${dreamId}`);
    try {
        const { url, type } = mediaItem;
        console.log(`[Server] Media URL: ${url}, Type: ${type}`);

        const ext = type === 'video' ? '.mp4' : '.png';
        const filename = `${dreamId}${ext}`;
        const localPath = path.join(STORAGE_DIR, filename);
        console.log(`[Server] Target Path: ${localPath}`);

        if (url.startsWith('http')) {
            console.log(`[Server] Fetching external URL...`);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
            console.log(`[Server] Download complete. Writing to disk...`);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            fs.writeFileSync(localPath, buffer);
            console.log(`[Server] File written successfully.`);
        } else if (url.startsWith('/api/comfy')) {
            // Fix relative URLs from Proxy for backend to download directly from ComfyUI
            const comfyUrl = `http://127.0.0.1:8188${url.replace('/api/comfy', '')}`;
            console.log(`[Server] Downloading from ComfyUI: ${comfyUrl}`);
            const response = await fetch(comfyUrl);
            if (!response.ok) throw new Error(`Failed to fetch from ComfyUI: ${response.statusText}`);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            fs.writeFileSync(localPath, buffer);
            console.log(`[Server] ComfyUI File written successfully.`);
        } else if (url.startsWith('data:')) {
            // Base64
            console.log(`[Server] Saving Base64 data...`);
            const base64Data = url.split(';base64,').pop();
            fs.writeFileSync(localPath, base64Data, { encoding: 'base64' });
            console.log(`[Server] Base64 written successfully.`);
        } else {
            console.warn(`[Server] Unknown URL format: ${url}`);
        }

        // Save entry to DB
        return new Promise((resolve, reject) => {
            const stmt = db.prepare("INSERT INTO dream_images (id, dreamId, filePath, type) VALUES (?, ?, ?, ?)");
            const imgId = `${dreamId}_img`;
            // We store the RELATIVE url for the frontend to serve via /storage/
            const publicUrl = `/storage/${filename}`;

            stmt.run(imgId, dreamId, publicUrl, type, (err) => {
                if (err) {
                    console.error(`[Server] DB Insert Error:`, err);
                    reject(err);
                }
                else {
                    console.log(`[Server] DB Insert Success: ${publicUrl}`);
                    resolve(publicUrl);
                }
            });
            stmt.finalize();
        });
    } catch (error) {
        console.error(`[Server] handleMediaSave Error:`, error);
        throw error;
    }

}

const server = app.listen(PORT, () => {
    console.log(`AnimatedDreams Storage Server running on port ${PORT}`);
});
