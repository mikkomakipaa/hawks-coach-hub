/**
 * Development server with API proxy support
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

// Load API function
const apiPath = resolve(__dirname, 'api/drive.js');
let apiFunction;

try {
  // Dynamic import for CommonJS module
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  apiFunction = require('./api/drive.js');
  console.log('✅ API function loaded');
} catch (error) {
  console.error('❌ Failed to load API function:', error.message);
  process.exit(1);
}

// API endpoint
app.get('/api/drive', async (req, res) => {
  console.log('📡 API request:', req.query);
  try {
    await apiFunction(req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Static file serving for development
app.use(express.static('.'));

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(resolve(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Development server running at http://localhost:${PORT}`);
  console.log('🔧 API endpoints available at /api/drive');
  console.log('📂 Hawks folder ID:', process.env.HAWKS_FOLDER_ID || '1ZF6AHx62MXfkgs7-xbrMxj4r9sdyKzUb');
});