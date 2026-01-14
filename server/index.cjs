const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Load env vars
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    // Basic dotenv parser since we can't depend on 'dotenv' package being installed yet
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, ...val] = line.split('=');
        if (key && val) {
            process.env[key.trim()] = val.join('=').trim().replace(/^["']|["']$/g, '');
        }
    });
}

const authRoutes = require('./routes/auth.cjs');
const dreamRoutes = require('./routes/dreams.cjs');
const aiRoutes = require('./routes/ai.cjs');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for image attachments

// Storage Static Serve (Matches what's in routes/dreams.js)
const STORAGE_DIR = path.join(__dirname, '..', 'saved_dreams');
app.use('/storage', express.static(STORAGE_DIR));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/db/dreams', dreamRoutes);
app.use('/api/ai', aiRoutes);

const server = app.listen(PORT, () => {
    console.log(`AnimatedDreams Server running on port ${PORT}`);
});
