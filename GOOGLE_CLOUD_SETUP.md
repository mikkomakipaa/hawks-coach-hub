# Google Cloud Console Setup for Hawks Coach Hub

## 🎯 Vercel Production URL
**Your app is deployed at:** `https://hawks-coach-hub.vercel.app`

## ⚙️ Required Google Cloud Console Configuration

### 1. OAuth 2.0 Client ID Configuration

**Location:** [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)

**Find your OAuth 2.0 Client ID:** `1065457583274-6k0r5kfrvrelg1ufr2887814j33ga6va.apps.googleusercontent.com`

**Authorized JavaScript origins:** (Add these exactly)
```
https://hawks-coach-hub.vercel.app
https://localhost:8000
```

**Authorized redirect URIs:** (Should already be set, but verify)
```
https://hawks-coach-hub.vercel.app
https://localhost:8000
```

### 2. API Key Restrictions

**Find your API Key:** `AIzaSyCXVw8YDsjaMoqipgcIDlImN8o-rd7Mezg`

**Application restrictions:**
- Select: "HTTP referrers (web sites)"
- Add: `https://hawks-coach-hub.vercel.app/*`
- Add: `https://localhost:8000/*` (for development)

**API restrictions:**
- Select: "Restrict key"
- Enable: "Google Drive API"

### 3. OAuth Consent Screen

**Status:** Must be "Published" (not "Testing")

**Scopes:** 
- `https://www.googleapis.com/auth/drive.metadata.readonly`

**Test users:** (Only needed if status is "Testing")
- Add your email address

## 🔧 Troubleshooting Steps

### Step 1: Test Debug Page
Visit: `https://hawks-coach-hub.vercel.app/debug-vercel.html`

This will show:
- ✅/❌ Credential loading status
- ✅/❌ Google API loading status  
- Current domain and configuration
- Any JavaScript errors

### Step 2: Check Browser Console
1. Open `https://hawks-coach-hub.vercel.app`
2. Press F12 → Console tab
3. Look for errors related to:
   - "Invalid origin"
   - "Access denied"
   - "Not authorized"
   - API loading failures

### Step 3: Verify Domain Authorization
Common error messages and solutions:

**"Not authorized for this origin"**
- ✅ Add `https://hawks-coach-hub.vercel.app` to OAuth authorized origins

**"API key not valid"**  
- ✅ Add `https://hawks-coach-hub.vercel.app/*` to API key HTTP referrers

**"Access denied"**
- ✅ Publish OAuth consent screen (move from Testing to Production)

## 📋 Expected Working Console Output

```
🚀 Production mode: Using production credentials
✅ Credentials loaded successfully
All Google APIs loaded successfully
Both APIs initialized - checking for existing session
Ready to sign in with Google Drive
```

## 🚨 Common Issues

### Issue: "Origin mismatch"
**Solution:** OAuth client authorized origins must exactly match `https://hawks-coach-hub.vercel.app`

### Issue: "API key restrictions"
**Solution:** API key HTTP referrers must include `https://hawks-coach-hub.vercel.app/*`

### Issue: "Access denied in consent screen"
**Solution:** OAuth consent screen must be published, not in testing mode

### Issue: "APIs not loading"
**Solution:** Check if Google Drive API is enabled in your project

## 🔗 Useful Links

- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Client IDs](https://console.cloud.google.com/apis/credentials)
- [API Keys](https://console.cloud.google.com/apis/credentials)  
- [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
- [Enabled APIs](https://console.cloud.google.com/apis/dashboard)