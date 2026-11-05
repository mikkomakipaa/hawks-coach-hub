# Security Review - Immediate Action Items

**Review Date:** 2025-10-29

> **Note 2026-11-05**: this review predates the planner/editor routes. Known gaps added since: planner identity is header-based with a client-supplied role fallback (not real authentication), and personal data about minors is planned for Milestone 3 and needs a privacy review first. See `../../plans/plan-002-junior-training-programs.md` (F1, F2). Items below have not been re-verified.
> **Overall Security Grade:** B+ (Good)
> **Status:** 2 HIGH priority items requiring immediate attention

---

## 🔴 HIGH Priority (Address This Week)

### 1. Add Content Security Policy Headers ⚡ 15 minutes

**Current State:** Missing CSP and several security headers
**Risk:** Increased XSS vulnerability surface

**Action Required:**
Update `/Users/mikko.makipaa/coach-hub/vercel.json` with comprehensive security headers.

**Implementation:**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://www.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(), microphone=(), camera=()"
        }
      ]
    }
  ]
}
```

**Testing:**

```bash
# After deployment, verify headers
curl -I https://your-domain.vercel.app

# Or use online tool
https://securityheaders.com/?q=your-domain.vercel.app
```

**Expected Result:**

- Security headers present in all responses
- Grade improvement on securityheaders.com
- No application functionality broken

---

### 2. Update Vulnerable Dependencies ⚡ 30 minutes

**Current State:** 9 high-severity vulnerabilities in dev dependencies
**Risk:** Low (dev-only), but should be addressed

**Affected Packages:**

- @playwright/test
- playwright
- tar-fs

**Action Required:**

```bash
# Update Playwright and dependencies
npm update @playwright/test playwright

# Run full audit
npm audit

# Fix automatically fixable issues
npm audit fix

# Check results
npm audit --audit-level=high
```

**Testing:**

```bash
# Verify tests still pass
npm run test:run

# Verify e2e tests work
npm run test:e2e
```

**Expected Result:**

- Reduced vulnerability count (ideally 0 high/critical)
- All tests passing
- No breaking changes in test functionality

---

## 🟡 MEDIUM Priority (Address This Month)

### 3. Implement XSS Protection with DOMPurify ⚡ 2-3 hours

**Current State:** Multiple innerHTML usages without sanitization
**Risk:** XSS if Google Drive content is compromised

**Files Requiring Changes:**

1. `/src/components/static-content-display.ts` (5 instances)
2. `/src/components/file-display.ts` (3 instances)
3. `/src/ui/folder-navigation.ts` (3 instances)
4. `/src/ui/file-list-manager.ts` (4 instances)

**Action Required:**

1. Install DOMPurify:

```bash
npm install --save dompurify
npm install --save-dev @types/dompurify
```

2. Create sanitization utility (`/src/utils/sanitize.ts`):

```typescript
import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'span', 'div', 'p'],
    ALLOWED_ATTR: ['href', 'class', 'title'],
  });
}

/**
 * Use for trusted static content only
 */
export function setSafeInnerHTML(element: HTMLElement, content: string): void {
  element.innerHTML = sanitizeHtml(content);
}
```

3. Replace innerHTML usage:

```typescript
// ❌ BEFORE
element.innerHTML = `<div>${userContent}</div>`;

// ✅ AFTER
import { setSafeInnerHTML } from '@/utils/sanitize';
setSafeInnerHTML(element, `<div>${userContent}</div>`);

// Or for plain text
element.textContent = userContent;
```

**Testing:**

```bash
# Run tests to ensure no regressions
npm run test:run

# Manual testing
# 1. Load application
# 2. Verify all file displays work correctly
# 3. Check folder navigation renders properly
# 4. Test search functionality
```

**Expected Result:**

- All dynamic content sanitized
- XSS attack surface eliminated
- No visual or functional changes to UI

---

## 🟢 LOW Priority (Address in Next Sprint)

### 4. Enable GitHub Secret Scanning ⚡ 5 minutes

**Action Required:**

1. Go to: https://github.com/mikkomakipaa/hawks-coach-hub/settings/security_analysis
2. Enable "Secret scanning"
3. Enable "Push protection"

**Expected Result:**

- Automated credential leak detection
- Prevention of accidental secret commits

---

### 5. Restrict CORS Origin ⚡ 5 minutes

**Current State:** CORS allows all origins (`*`)
**Recommendation:** Restrict to production domain

**Action Required:**
Update `/api/drive.js`:

```javascript
// Current
res.setHeader('Access-Control-Allow-Origin', '*');

// Recommended
const allowedOrigins = [
  'https://your-domain.vercel.app',
  'http://localhost:5173', // Vite dev server
  'http://localhost:8000', // Alternative dev port
];

const origin = req.headers.origin;
if (allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
}
```

**Note:** Only implement if app domain is fixed. Current setup is acceptable for public read-only API.

---

### 6. Implement Pre-commit Hooks ⚡ 30 minutes

**Action Required:**

1. Install git-secrets:

```bash
# macOS
brew install git-secrets

# Linux
git clone https://github.com/awslabs/git-secrets.git
cd git-secrets
sudo make install
```

2. Configure in repository:

```bash
git secrets --install
git secrets --register-aws
git secrets --add 'service.*account'
git secrets --add '(private_key|private_key_id)'
git secrets --add 'BEGIN.*PRIVATE.*KEY'
```

3. Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run git-secrets
git secrets --pre_commit_hook -- "$@"

# Run existing hooks
npm run lint-staged
```

**Testing:**

```bash
# Test credential detection
echo "private_key_id=test123" > test-secret.txt
git add test-secret.txt
git commit -m "test" # Should fail
rm test-secret.txt
```

---

## 📅 Quarterly Maintenance Tasks

### Credential Rotation (Every 90 Days)

**Next Due:** Calculate based on last service account creation date

**Procedure:**

1. Create new service account in Google Cloud Console
2. Generate and download new credentials
3. Update production environment variable (GOOGLE_SERVICE_ACCOUNT_KEY)
4. Share Google Drive folder with new service account
5. Verify application works with new credentials
6. Delete old service account
7. Document rotation in security log

**Tracking:**
Create calendar reminder 85 days from last rotation.

---

## 📊 Success Metrics

Track security improvements:

| Metric           | Current  | Target   | Status         |
| ---------------- | -------- | -------- | -------------- |
| Security Headers | 2/6      | 6/6      | ⚠️ In Progress |
| High CVEs        | 9        | 0        | ⚠️ In Progress |
| XSS Protection   | Partial  | Complete | ⚠️ Planned     |
| Secret Scanning  | ❌       | ✅       | 📋 Planned     |
| Pre-commit Hooks | ❌       | ✅       | 📋 Planned     |
| CORS Restriction | Wildcard | Specific | 📋 Optional    |

---

## 📝 Progress Tracking

### Week 1 (Current Week)

- [ ] Add CSP headers to vercel.json
- [ ] Update npm dependencies
- [ ] Deploy and verify headers

### Week 2-3

- [ ] Install and configure DOMPurify
- [ ] Update all innerHTML usage
- [ ] Test XSS protection

### Week 4

- [ ] Enable GitHub secret scanning
- [ ] Implement pre-commit hooks
- [ ] Update security documentation

### Next Quarter

- [ ] Schedule credential rotation
- [ ] Review and update security checklist
- [ ] Conduct full security audit

---

## 🎯 Expected Outcomes

After completing all HIGH and MEDIUM priority items:

✅ **Security Grade Improvement:** B+ → A-
✅ **Zero High/Critical Vulnerabilities**
✅ **Comprehensive XSS Protection**
✅ **Production-grade Security Headers**
✅ **Automated Security Checks**

**Estimated Total Time:** 4-5 hours spread over 2-3 weeks

---

**Document Owner:** Mikko Mäkipää
**Last Updated:** 2025-10-29
**Review Frequency:** Monthly until all items completed
