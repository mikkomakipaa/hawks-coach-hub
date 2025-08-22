// Environment Variable Loader for Development and Production
// This file handles credentials for both local development and production deployment

(function() {
    // Development environment - localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Load credentials for local development:
        window.GOOGLE_CLIENT_ID = '1065457583274-6k0r5kfrvrelg1ufr2887814j33ga6va.apps.googleusercontent.com';
        window.GOOGLE_API_KEY = 'AIzaSyCXVw8YDsjaMoqipgcIDlImN8o-rd7Mezg';
        
        console.log('🔧 Development mode: Using local credentials');
    } 
    // Production environment - set production credentials here
    else {
        // IMPORTANT: Replace these with your production credentials
        // For security, use different credentials for production vs development
        window.GOOGLE_CLIENT_ID = '1065457583274-6k0r5kfrvrelg1ufr2887814j33ga6va.apps.googleusercontent.com';
        window.GOOGLE_API_KEY = 'AIzaSyCXVw8YDsjaMoqipgcIDlImN8o-rd7Mezg';
        
        console.log('🚀 Production mode: Using production credentials');
    }
})();