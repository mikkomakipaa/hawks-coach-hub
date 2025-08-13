# Hawks Coach Hub - Deployment Guide

## 🚀 Pre-Deployment Checklist

### ✅ Required Steps:
- [ ] **Credentials configured** - Add real CLIENT_ID and API_KEY
- [ ] **Google Cloud setup** - OAuth consent screen published
- [ ] **Domain restrictions** - API key restricted to production domain
- [ ] **HTTPS enabled** - SSL certificate configured
- [ ] **Error monitoring** - Check console for JavaScript errors

## 📋 Deployment Options

### Option 1: GitHub Pages (Recommended)
```bash
# 1. Push to GitHub repository
git add .
git commit -m "Production ready Hawks Coach Hub"
git push origin main

# 2. Enable GitHub Pages
# Go to Settings > Pages > Select 'main' branch
```

**Live URL**: `https://mikkomakipaa.github.io/hawks-coach-hub`

### Option 2: Netlify
```bash
# 1. Build command: Not required (static site)
# 2. Publish directory: /
# 3. Drag and drop project folder to Netlify
```

### Option 3: Vercel
```bash
npm install -g vercel
vercel --prod
```

## 🔧 Environment Configuration

### Local Development:
1. **Copy environment template**:
   ```bash
   cp .env.example .env
   ```

2. **Edit .env file** with your credentials:
   ```bash
   GOOGLE_CLIENT_ID=your-development-client-id
   GOOGLE_API_KEY=your-development-api-key
   ```

3. **Update env-loader.js** for local development:
   ```javascript
   // Uncomment and set in env-loader.js:
   window.GOOGLE_CLIENT_ID = 'your-local-client-id';
   window.GOOGLE_API_KEY = 'your-local-api-key';
   ```

### Production Environment Variables:
Choose one of these methods for production:

#### Option A: Global Variables (Recommended)
Add these to your hosting platform's environment settings:
```bash
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_API_KEY=your-production-api-key
```

#### Option B: Build-time Variables
For platforms like Netlify/Vercel, add environment variables that get injected at build time.

#### Option C: Direct Replacement
Replace the fallback values in script.js with your production credentials.

### Google Cloud Console Production Settings:
1. **Authorized JavaScript Origins**:
   - `https://mikkomakipaa.github.io`
   - Remove localhost origins

2. **API Key Restrictions**:
   - HTTP referrers: `https://mikkomakipaa.github.io/hawks-coach-hub/*`
   - APIs: Google Drive API only

## 🔍 Post-Deployment Testing

### Functional Tests:
- [ ] **Page loads** without errors
- [ ] **Google Sign-In** works correctly
- [ ] **File listing** displays from Google Drive
- [ ] **Search functionality** filters results
- [ ] **Auto-refresh** works every 15 minutes
- [ ] **Mobile responsive** design works
- [ ] **All links** open correctly

### Performance Tests:
- [ ] **Load time** < 3 seconds
- [ ] **Lighthouse score** > 90
- [ ] **Mobile performance** acceptable
- [ ] **Network requests** optimized

### Security Tests:
- [ ] **HTTPS enforced** (no mixed content)
- [ ] **API keys** not exposed in source
- [ ] **Console errors** resolved
- [ ] **OAuth flow** secure and working

## 📊 Monitoring Setup

### Analytics (Optional):
```html
<!-- Add to <head> if needed -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
```

### Error Monitoring:
- Monitor browser console for JavaScript errors
- Set up Google Cloud Console alerts for API usage
- Review access logs regularly

## 🆘 Troubleshooting

### Common Issues:
1. **"Invalid client" error**:
   - Check CLIENT_ID is correct
   - Verify authorized JavaScript origins

2. **"Access denied" error**:
   - Publish OAuth consent screen
   - Add test users if in testing mode

3. **Files not loading**:
   - Verify API key restrictions
   - Check Google Drive API is enabled
   - Confirm scope permissions

4. **CORS errors**:
   - Add production domain to authorized origins
   - Ensure HTTPS is enabled

## 📞 Support
For deployment issues, check:
1. Google Cloud Console error logs
2. Browser developer tools
3. GitHub Pages build status
4. Repository issues: https://github.com/mikkomakipaa/hawks-coach-hub/issues