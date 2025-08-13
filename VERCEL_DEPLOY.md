# Vercel Deployment Guide - Hawks Coach Hub

## 🚀 Quick Deployment Steps

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Deploy
```bash
cd /Users/mikko.makipaa/google_drive_landing
vercel --prod
```

**If you get "No Output Directory named 'public' found" error:**
- The vercel.json is configured for static sites
- During setup, if asked for output directory, use: `./`
- If asked for build command, leave empty or use: `echo "Static site"`

### 3. Configure Environment Variables (After Deployment)

In Vercel Dashboard:
1. Go to your project → Settings → Environment Variables
2. Add these variables:

```
GOOGLE_CLIENT_ID = your_google_client_id_here
GOOGLE_API_KEY = your_google_api_key_here
```

### 4. Update Google Cloud Console

Add your Vercel domain to authorized JavaScript origins:
- Go to Google Cloud Console → APIs & Services → Credentials
- Edit your OAuth 2.0 client
- Add: `https://your-app-name.vercel.app`

### 5. Test Deployment

Check these after deployment:
- [ ] Page loads without errors
- [ ] Google sign-in works
- [ ] Files load from Drive
- [ ] Folder chips display correctly
- [ ] Search functionality works
- [ ] Mobile responsive

## 🔧 Troubleshooting

**Common Issues:**
1. **"Invalid client"** → Check authorized JavaScript origins
2. **"Access denied"** → Verify OAuth consent screen is published
3. **CORS errors** → Ensure domain is authorized in Google Cloud

## 📝 Notes

- Vercel automatically serves `index.html` as the default page
- Environment variables are injected at build time
- HTTPS is automatically enabled
- Custom domains can be added later in Vercel dashboard