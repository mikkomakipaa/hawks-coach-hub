/**
 * Local test for the service account API
 */

import { readFileSync } from 'fs';

// Load the API function
const apiFunction = eval(readFileSync('./api/drive.js', 'utf8').replace('module.exports =', ''));

// Mock request/response objects
const mockReq = {
  method: 'GET',
  query: { type: 'both' }
};

const mockRes = {
  status: (code) => ({
    json: (data) => {
      console.log(`\n📊 API Response (${code}):`);
      console.log('Files:', data.files?.length || 0);
      console.log('Folders:', data.folders?.length || 0);
      if (data.files?.length > 0) {
        console.log('Sample files:', data.files.slice(0, 3).map(f => f.name));
      }
      if (data.folders?.length > 0) {
        console.log('Sample folders:', data.folders.slice(0, 3).map(f => f.name));
      }
      if (data.error) {
        console.error('Error:', data.error);
        console.error('Message:', data.message);
      }
    },
    end: () => console.log('Response ended')
  }),
  setHeader: () => {}
};

// Test the API
console.log('🧪 Testing Service Account API locally...');
console.log('📋 Using folder ID:', process.env.HAWKS_FOLDER_ID || '1ZF6AHx62MXfkgs7-xbrMxj4r9sdyKzUb');

try {
  await apiFunction(mockReq, mockRes);
} catch (error) {
  console.error('❌ API test failed:', error.message);
}