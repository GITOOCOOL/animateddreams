import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'dreams.db');

console.log(`Checking Database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Failed to connect to database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to SQLite database.');
});

db.serialize(() => {
    // Check if workflows table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='workflows'", (err, row) => {
        if (err) {
            console.error('❌ Error checking tables:', err.message);
            return;
        }
        if (row) {
            console.log("✅ Table 'workflows' exists.");
            
            // Check count
            db.get("SELECT COUNT(*) as count FROM workflows", (err, row) => {
                if (err) console.error("❌ Error counting workflows:", err.message);
                else console.log(`ℹ️ Current workflow count: ${row.count}`);
            });
        } else {
            console.error("❌ Table 'workflows' DOES NOT EXIST! Server restart required.");
        }
    });
});
