import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const verboseSqlite = sqlite3.verbose();

const dbPath = path.join(__dirname, '..', '..', 'dreams.db');
const db = new verboseSqlite.Database(dbPath, (err) => {
    if (err) console.error('Database opening error: ', err);
    else console.log('Connected to SQLite database.');
});

// Initialize Database Tables
db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        createdAt INTEGER
    )`);

    // Dreams Table
    db.run(`CREATE TABLE IF NOT EXISTS dreams (
        id TEXT PRIMARY KEY,
        userId TEXT,
        rawText TEXT,
        visualPrompt TEXT,
        analysis TEXT, -- JSON string
        createdAt INTEGER,
        FOREIGN KEY(userId) REFERENCES users(id)
    )`);

    // Migration for existing DB
    db.run("ALTER TABLE dreams ADD COLUMN userId TEXT", (err) => { /* Ignore duplicate col error */ });

    // Dream Images Table
    db.run(`CREATE TABLE IF NOT EXISTS dream_images (
        id TEXT PRIMARY KEY,
        dreamId TEXT,
        filePath TEXT,
        type TEXT, -- 'image' or 'video'
        FOREIGN KEY(dreamId) REFERENCES dreams(id)
    )`);

    // Workflows Table (User-saved ComfyUI workflows)
    db.run(`CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        userId TEXT,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL, -- 'image' or 'video'
        workflow_json TEXT NOT NULL, -- Complete ComfyUI workflow JSON
        thumbnail TEXT, -- Optional preview image
        is_default BOOLEAN DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY(userId) REFERENCES users(id)
    )`);

    // Create indexes for workflows table
    db.run(`CREATE INDEX IF NOT EXISTS idx_workflows_userId ON workflows(userId)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_workflows_type ON workflows(type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at DESC)`);
});

export default db;
