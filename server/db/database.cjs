const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'dreams.db');
const db = new sqlite3.Database(dbPath, (err) => {
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
});

module.exports = db;
