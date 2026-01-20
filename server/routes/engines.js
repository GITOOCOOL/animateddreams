import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRESETS_DIR = path.join(__dirname, '../../engine_presets');

// Ensure presets directory exists
async function ensurePresetsDir() {
  try {
    await fs.access(PRESETS_DIR);
  } catch {
    await fs.mkdir(PRESETS_DIR, { recursive: true });
  }
}

// Get all available presets
router.get('/presets', async (req, res) => {
  try {
    await ensurePresetsDir();
    const files = await fs.readdir(PRESETS_DIR);
    const presets = files
      .filter(f => f.endsWith('_engine_conf.json'))
      .map(f => f.replace('_engine_conf.json', ''));
    res.json(presets);
  } catch (error) {
    console.error('Error loading presets:', error);
    res.status(500).json({ error: 'Failed to load presets' });
  }
});

// Get specific preset
router.get('/presets/:name', async (req, res) => {
  try {
    await ensurePresetsDir();
    const filename = `${req.params.name}_engine_conf.json`;
    const filepath = path.join(PRESETS_DIR, filename);
    const data = await fs.readFile(filepath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error loading preset:', error);
    res.status(404).json({ error: 'Preset not found' });
  }
});

// Save preset
router.post('/presets', async (req, res) => {
  try {
    await ensurePresetsDir();
    const { name, engines } = req.body;
    
    if (!name || !engines) {
      return res.status(400).json({ error: 'Name and engines are required' });
    }

    const filename = `${name}_engine_conf.json`;
    const filepath = path.join(PRESETS_DIR, filename);
    
    const preset = {
      name,
      engines,
      createdAt: new Date().toISOString(),
      version: '1.0.0',
    };

    await fs.writeFile(filepath, JSON.stringify(preset, null, 2));
    res.json({ success: true, filename });
  } catch (error) {
    console.error('Error saving preset:', error);
    res.status(500).json({ error: 'Failed to save preset' });
  }
});

// Delete preset
router.delete('/presets/:name', async (req, res) => {
  try {
    const filename = `${req.params.name}_engine_conf.json`;
    const filepath = path.join(PRESETS_DIR, filename);
    await fs.unlink(filepath);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting preset:', error);
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});

// Check engine connectivity
router.post('/check', async (req, res) => {
  try {
    const { provider, config } = req.body;
    let isAvailable = false;

    if (provider === 'ollama') {
      try {
        const response = await fetch(`${config.host}/api/tags`, {
          signal: AbortSignal.timeout(3000)
        });
        isAvailable = response.ok;
      } catch {
        isAvailable = false;
      }
    } else if (provider.startsWith('comfy')) {
      try {
        const response = await fetch(`${config.host}/system_stats`, {
          signal: AbortSignal.timeout(3000)
        });
        isAvailable = response.ok;
      } catch {
        isAvailable = false;
      }
    }

    res.json({ isAvailable });
  } catch (error) {
    console.error('Error checking engine:', error);
    res.status(500).json({ error: 'Failed to check engine' });
  }
});

export default router;
