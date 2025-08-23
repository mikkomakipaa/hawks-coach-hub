/**
 * Vite plugin to proxy API requests during development
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function apiProxy() {
  let apiFunction;

  return {
    name: 'api-proxy',
    configureServer(server) {
      // Load the API function
      try {
        const require = createRequire(import.meta.url);
        apiFunction = require('./api/drive.js');
        console.log('✅ Loaded service account API for development');
      } catch (error) {
        console.error('❌ Failed to load API function:', error.message);
        return;
      }

      // Add test endpoint
      server.middlewares.use('/api/test', (req, res) => {
        console.log('🧪 Test endpoint called');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.writeHead(200);
        res.end(JSON.stringify({ message: 'Test successful', files: 2, folders: 1 }));
      });

      // Add API middleware
      server.middlewares.use('/api/drive', async (req, res, next) => {
        console.log('📡 Middleware received request:', req.method, req.url);
        
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
          res.writeHead(200);
          return res.end();
        }
        
        if (req.method !== 'GET') {
          console.log('❌ Method not allowed:', req.method);
          res.writeHead(405);
          return res.end('Method Not Allowed');
        }

        try {
          // Parse query parameters from URL
          const urlParts = req.url.split('?');
          const queryString = urlParts[1] || '';
          const query = new URLSearchParams(queryString);
          
          const mockReq = {
            method: 'GET',
            query: Object.fromEntries(query)
          };

          console.log('📋 Parsed query:', mockReq.query);

          // Use a promise to properly handle async response with timeout
          const apiResponse = new Promise((resolve, reject) => {
            const mockRes = {
              status: (code) => ({
                json: (data) => {
                  console.log('📤 API sending response:', code, `files: ${data.files?.length || 0}, folders: ${data.folders?.length || 0}`);
                  resolve({ statusCode: code, data });
                }
              }),
              setHeader: () => {},
            };

            // Add timeout - increased for large folder loading
            const timeout = setTimeout(() => {
              reject(new Error('API request timeout after 60 seconds'));
            }, 60000);

            apiFunction(mockReq, mockRes)
              .then(() => clearTimeout(timeout))
              .catch(err => {
                clearTimeout(timeout);
                reject(err);
              });
          });

          console.log('⏳ Waiting for API response...');
          const result = await apiResponse;
          
          console.log('✅ Sending response to browser, status:', result.statusCode);
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
          res.writeHead(result.statusCode);
          res.end(JSON.stringify(result.data));

        } catch (error) {
          console.error('❌ Development API error:', error);
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.writeHead(500);
          res.end(JSON.stringify({ 
            error: 'Development API error', 
            message: error.message 
          }));
        }
      });
    }
  };
}