# Service Account Setup Guide

This guide shows how to set up Google Drive API with Service Account for the Hawks Coach Hub.

## Benefits of Service Account Approach

✅ **No user authentication required** - visitors can access content immediately  
✅ **Much simpler API calls** - no shared drive complexity  
✅ **Consistent access** - no token expiration issues  
✅ **Better performance** - server-side caching possible  
✅ **More reliable** - no authentication flow dependencies  

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Note your project ID

### 2. Enable Google Drive API

1. In Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Drive API"
3. Click "Enable"

### 3. Create Service Account

1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Fill in details:
   - **Name**: `hawks-drive-service`
   - **Description**: `Service account for Hawks Coach Hub Drive access`
4. Click "Create and Continue"
5. Skip permissions (not needed)
6. Click "Done"

### 4. Generate Service Account Key

1. In Service Accounts list, click on your new service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" format
5. Click "Create" - this downloads the JSON key file
6. **Keep this file secure!**

### 5. Share Drive Folder with Service Account

1. Open your Google Drive folder: `https://drive.google.com/drive/folders/1ZF6AHx62MXfkgs7-xbrMxj4r9sdyKzUb`
2. Right-click → "Share"
3. Add the service account email (from the JSON file, looks like: `hawks-drive-service@project-id.iam.gserviceaccount.com`)
4. Set permission to "Viewer"
5. Click "Send"

### 6. Deploy to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. In project root: `vercel`
3. Add environment variables in Vercel dashboard:
   - `GOOGLE_SERVICE_ACCOUNT_KEY`: Paste the entire JSON key file content
   - `HAWKS_FOLDER_ID`: `1ZF6AHx62MXfkgs7-xbrMxj4r9sdyKzUb`

### 7. Update HTML to Use Service Account Version

Replace the script in `dist/index.html`:

```html
<!-- Remove this line -->
<script type="module" crossorigin src="/assets/main-[hash].js"></script>

<!-- Add this line -->
<script type="module" crossorigin src="/assets/main-service-account-[hash].js"></script>
```

### 8. Test the Setup

1. Deploy: `vercel --prod`
2. Visit your site - should load immediately without authentication
3. Check browser console for service account logs
4. Verify files and folders load from your Drive folder

## API Endpoints

After setup, these endpoints will be available:

- `GET /api/drive?type=both` - Get all files and folders
- `GET /api/drive?type=files` - Get only files  
- `GET /api/drive?type=folders` - Get only folders

## Troubleshooting

### "Service account credentials not found"
- Check that `GOOGLE_SERVICE_ACCOUNT_KEY` environment variable is set
- Verify the JSON is valid (not truncated)

### "Access denied" or 403 errors
- Verify service account email has access to the Drive folder
- Check that Google Drive API is enabled in your project

### "No files found"
- Verify `HAWKS_FOLDER_ID` environment variable is correct
- Check that folder has content and service account has access

## File Organization Tips

For better performance with service account:

1. **Keep reasonable folder depth** (max 3-4 levels)
2. **Use descriptive filenames** since API calls are cached
3. **Organize by category in folders**:
   ```
   Hawks-Materials/
   ├── Drills/
   │   ├── Skating/
   │   ├── Passing/
   │   └── Shooting/
   ├── Tactics/
   └── Fitness/
   ```

## Security Notes

- Service account has **read-only** access
- JSON key should be stored securely as environment variable
- Never commit service account keys to git
- Use different service accounts for dev/prod if needed