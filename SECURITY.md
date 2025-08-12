# Security Guidelines for Hawks Coach Hub

## 🔒 Security Measures Implemented

### 1. API Key Protection
- **Client-side credentials are sanitized** - No production keys in repository
- **Environment variables** - Use `.env` file for local development
- **Google Cloud restrictions** - Implement domain/referrer restrictions

### 2. OAuth Security
- **Read-only permissions** - Uses `drive.metadata.readonly` scope
- **Domain restrictions** - Limit authorized JavaScript origins
- **Consent screen** - Proper OAuth consent configuration

### 3. Content Security
- **No inline scripts** - All JavaScript in external files
- **HTTPS enforcement** - Use HTTPS in production
- **Input sanitization** - Search inputs are properly handled

## 🛡️ Production Security Checklist

### Before Deployment:
- [ ] Replace placeholder credentials with real values
- [ ] Restrict API key to production domain only
- [ ] Configure OAuth consent screen
- [ ] Enable HTTPS for production site
- [ ] Review Google Cloud Console security settings

### Google Cloud Console Setup:
1. **API Key Restrictions**:
   - HTTP referrers: `https://yourdomain.com/*`
   - API restrictions: Google Drive API only

2. **OAuth Client ID**:
   - Authorized JavaScript origins: `https://yourdomain.com`
   - No wildcard origins in production

3. **OAuth Consent Screen**:
   - Published status (not testing)
   - Complete all required fields
   - Add privacy policy if required

## 🚨 Security Monitoring

### Regular Checks:
- Monitor API usage in Google Cloud Console
- Review access logs for unusual activity
- Update credentials if compromised
- Monitor for unauthorized domain usage

### Incident Response:
1. **If API key is compromised**:
   - Regenerate API key immediately
   - Update production deployment
   - Review access logs

2. **If OAuth client is compromised**:
   - Reset client secret
   - Review authorized domains
   - Check consent screen configuration

## 📞 Security Contact
Report security issues to: [security contact email]