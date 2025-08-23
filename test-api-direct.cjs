/**
 * Direct test of service account API (CommonJS)
 */

// Set environment variables
process.env.HAWKS_FOLDER_ID = '1ZF6AHx62MXfkgs7-xbrMxj4r9sdyKzUb';

const apiFunction = require('./api/drive.js');

// Mock request/response
const mockReq = {
  method: 'GET',
  query: { type: 'both' }
};

const mockRes = {
  status: (code) => ({
    json: (data) => {
      console.log('\n📊 API Response:', code);
      console.log('✅ Files found:', data.files?.length || 0);
      console.log('✅ Folders found:', data.folders?.length || 0);
      
      if (data.files?.length > 0) {
        console.log('📄 Sample files:');
        data.files.slice(0, 3).forEach(f => console.log(`   - ${f.name}`));
      }
      
      if (data.folders?.length > 0) {
        console.log('📁 Sample folders:');
        data.folders.slice(0, 3).forEach(f => console.log(`   - ${f.name}`));
      }
      
      if (data.error) {
        console.error('❌ Error:', data.error);
        console.error('💬 Message:', data.message);
      }
    },
    end: () => {}
  }),
  setHeader: () => {}
};

console.log('🧪 Testing Service Account API function...');
console.log('📂 Hawks folder:', process.env.HAWKS_FOLDER_ID);

apiFunction(mockReq, mockRes)
  .then(() => console.log('\n✅ API test completed'))
  .catch(error => console.error('\n❌ API test failed:', error.message));