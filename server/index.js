import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import dreamRoutes from './routes/dreams.js';
import aiRoutes from './routes/ai.js';
import engineRoutes from './routes/engines.js';
import workflowRoutes from './routes/workflows.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    // Basic dotenv parser
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, ...val] = line.split('=');
        if (key && val) {
            process.env[key.trim()] = val.join('=').trim().replace(/^["']|["']$/g, '');
        }
    });
}

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for image attachments

// Storage Static Serve
const STORAGE_DIR = path.join(__dirname, '..', 'saved_dreams');
app.use('/storage', express.static(STORAGE_DIR));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/db/dreams', dreamRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/engines', engineRoutes);
app.use('/api/workflows', workflowRoutes);

const server = app.listen(PORT, () => {
    console.log(`AnimatedDreams Server running on port ${PORT}`);
});
