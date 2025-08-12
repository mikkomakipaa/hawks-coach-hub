# Hawks Coach Hub - Google Drive Web Interface

A professional web application for Hawks Helsinki coaches to easily access training resources, drill instructions, and tactical materials from Google Drive. Features auto-refresh, search functionality, and categorized file organization.

## Features

- Google OAuth2 authentication
- Real-time search functionality  
- Automatic file categorization (Floorball Drills, Tactics & Strategy, Training Plans)
- Auto-refresh every 15 minutes
- Responsive mobile-friendly design
- Professional Hawks Helsinki branding
- Optimized for coaching workflow

## Setup Instructions

### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Drive API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

### 2. Create Credentials

#### OAuth 2.0 Client ID
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Add authorized JavaScript origins:
   - `http://localhost:8000` (for local testing)
   - Your production domain (e.g., `https://mikkomakipaa.github.io/hawks-coach-hub`)
5. Copy the Client ID

#### API Key
1. Click "Create Credentials" > "API Key"
2. Restrict the key to Google Drive API
3. Copy the API Key

### 3. Configure the Application

1. Open `script.js`
2. Replace the placeholder values:
   ```javascript
   const CLIENT_ID = 'your-actual-client-id.apps.googleusercontent.com';
   const API_KEY = 'your-actual-api-key';
   ```

### 4. Local Testing

1. Start a local web server (required for Google OAuth):
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx http-server -p 8000
   
   # Using PHP
   php -S localhost:8000
   ```

2. Open `http://localhost:8000` in your browser

### 5. Deployment Options (Free)

#### GitHub Pages
1. Create a GitHub repository
2. Upload your files
3. Go to Settings > Pages
4. Select source branch
5. Your site will be available at `https://mikkomakipaa.github.io/hawks-coach-hub`

#### Netlify
1. Drag and drop your project folder to [Netlify](https://netlify.com)
2. Your site will be automatically deployed

#### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project directory
3. Follow the deployment prompts

## File Structure

```
hawks-coach-hub/
├── index.html          # Main HTML file
├── styles.css          # Hawks Helsinki themed stylesheet  
├── script.js           # Google Drive API integration
├── hawks.png          # Hawks Helsinki logo
└── README.md          # Documentation
```

## Usage

1. **Sign In**: Click "Sign In" and authorize Google Drive access
2. **Browse Resources**: Training materials are automatically loaded and categorized
3. **Search**: Use the search bar to quickly find specific drills or tactics
4. **Categories**: Files are organized into:
   - Floorball Drills
   - Tactics & Strategy  
   - Training Plans
   - Video Resources
   - Diagrams & Images
5. **Auto-Refresh**: Content updates automatically every 15 minutes
6. **Manual Refresh**: Click refresh button for immediate updates

## Google Drive API Limits

- **Free Tier**: 1,000 requests per 100 seconds per user
- **Daily Limit**: 1,000,000,000 requests per day (shared across all users)
- These limits are more than sufficient for Hawks coaching staff usage

## Security Notes

- Only requests read-only access to Google Drive
- No data is stored on the server
- OAuth tokens are handled client-side
- Files are accessed directly through Google Drive links

## Troubleshooting

### "Access blocked" Error
- Ensure your domain is added to authorized JavaScript origins
- Check that the Google Drive API is enabled
- Verify your OAuth consent screen is configured

### "Invalid API Key" Error
- Make sure the API key is correctly copied
- Verify the API key is enabled for Google Drive API
- Check that referrer restrictions match your domain

### Files Not Loading
- Verify you have access to the Google Drive files
- Check browser console for JavaScript errors
- Ensure proper internet connection

## Customization

### Adding More Categories
Edit the `groupFilesByCategory()` function in `script.js`:

```javascript
const categories = {
    'Your Category': [],
    // Add more categories here
};
```

### Changing Auto-Refresh Interval
Modify the interval in `setupAutoRefresh()`:

```javascript
setInterval(() => {
    // Change 15 to desired minutes
}, 15 * 60 * 1000);
```

### Styling
Customize the appearance by editing `styles.css`. The design uses CSS Grid and Flexbox for responsive layout.

## Support

For issues and questions:
- Check the browser console for error messages
- Verify Google Cloud Console configuration
- Ensure proper OAuth2 setup

## About Hawks Helsinki

Hawks Helsinki is a floorball club focused on providing quality sports experiences for the whole family. This Coach Hub application supports our coaching staff with easy access to training resources and tactical materials.

## License

MIT License - Customized for Hawks Helsinki coaching operations.