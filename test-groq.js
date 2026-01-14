
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simple env loader
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val) envVars[key.trim()] = val.join('=').trim().replace(/^["']|["']$/g, '');
});

const apiKey = envVars.VITE_GROQ_API_KEY || envVars.GROQ_API_KEY;
console.log("Testing Key:", apiKey ? `${apiKey.substring(0,6)}...` : 'NONE');

if (!apiKey) {
    console.error("No API Key found in .env");
    process.exit(1);
}

// Test Models Endpoint (Lightweight)
async function test() {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`API Error: ${response.status} ${response.statusText}`);
            console.error(await response.text());
        } else {
            const data = await response.json();
            console.log("Success! API Connection Verified.");
            console.log("Available Models:", data.data.slice(0, 3).map(m => m.id)); // Show first 3
        }
    } catch (e) {
        console.error("Network Error:", e);
    }
}

test();
