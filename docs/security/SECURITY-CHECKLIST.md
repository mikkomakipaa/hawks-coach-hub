# Security Checklist - Coach Hub

Quick reference security checklist for development and deployment.

## Pre-Commit Checklist

Before committing code, verify:

- [ ] No credentials or API keys in code
- [ ] No service account files in working directory
- [ ] No hardcoded secrets or environment variables
- [ ] No sensitive data in console.log statements
- [ ] Environment variables used for all secrets
- [ ] .gitignore patterns cover new credential types

**Quick Check:**

```bash
# Check for potential credential leaks
git diff --cached | grep -i "api.*key\|secret\|password\|token\|service.*account"

# Verify no sensitive files staged
git status | grep -E "\.key$|\.pem$|\.p12$|service.*account.*\.json"
```

## Pre-Deployment Checklist

Before deploying to production:

### Environment Variables

- [ ] GOOGLE_SERVICE_ACCOUNT_KEY configured in hosting platform
- [ ] HAWKS_FOLDER_ID set correctly
- [ ] NODE_ENV set to "production"
- [ ] No development credentials in production environment

### Security Headers

- [ ] Content-Security-Policy configured
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] Strict-Transport-Security enabled
- [ ] Referrer-Policy configured

### Dependencies

- [ ] Run `npm audit` and review findings
- [ ] Update critical/high vulnerabilities
- [ ] Lock file (package-lock.json) committed
- [ ] No suspicious or unnecessary dependencies

### Code Security

- [ ] All innerHTML uses sanitized or safe
- [ ] No eval() or Function() usage
- [ ] CORS configured appropriately
- [ ] Error messages don't expose sensitive info

## Monthly Security Review

Perform these checks monthly:

### 1. Dependency Updates

```bash
npm audit
npm outdated
npm update
```

### 2. Credential Rotation

- [ ] Check service account age (rotate if > 90 days)
- [ ] Review service account permissions
- [ ] Audit Google Cloud access logs

### 3. Git History Audit

```bash
# Check for any leaked credentials
git log --all --pretty=format: --name-only | grep -E 'service.*account|\.key$|\.pem$'
```

### 4. GitHub Security

- [ ] Review GitHub Security tab
- [ ] Check Dependabot alerts
- [ ] Verify secret scanning enabled
- [ ] Review workflow permissions

## Quarterly Security Tasks

Every 3 months:

### Credential Rotation

- [ ] Create new service account
- [ ] Update production environment variables
- [ ] Revoke old service account
- [ ] Update local development credentials
- [ ] Document rotation in security log

### Security Audit

- [ ] Full dependency security scan
- [ ] Review all API endpoints
- [ ] Check for new security best practices
- [ ] Review OWASP Top 10 compliance
- [ ] Update security documentation

### Access Review

- [ ] Review service account permissions
- [ ] Verify Google Drive sharing settings
- [ ] Audit GitHub repository access
- [ ] Review Vercel project members

## Incident Response Quick Reference

If credentials are exposed:

### 1. IMMEDIATE (Within 5 minutes)

```bash
# 1. Remove exposed file
rm coach-hub-*.json

# 2. Check git history
git log --all --pretty=format: --name-only | grep service

# 3. If committed, clean history
git filter-repo --path FILENAME --invert-paths --force
git push --force origin main
```

### 2. URGENT (Within 15 minutes)

- [ ] Go to Google Cloud Console
- [ ] Disable/delete compromised service account
- [ ] Create new service account with different name
- [ ] Generate new credentials
- [ ] Update production environment variables
- [ ] Update Google Drive sharing to new service account

### 3. FOLLOW-UP (Within 24 hours)

- [ ] Review Google Cloud audit logs
- [ ] Check for unauthorized access
- [ ] Document incident (date, scope, actions)
- [ ] Update incident response procedures
- [ ] Notify relevant stakeholders if needed

## Security Contacts

**Primary Contact:** Mikko Mäkipää
**Security Incidents:** Follow incident response procedures above
**Google Cloud Support:** https://cloud.google.com/support
**GitHub Security:** security@github.com

## Additional Resources

- [CLAUDE.md Security Guidelines](/Users/mikko.makipaa/coach-hub/CLAUDE.md)
- [Security Incident Report Template](SECURITY-INCIDENT-2025-08-24.md)
- [Comprehensive Security Review](SECURITY-REVIEW-REPORT.md)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)

---

**Last Updated:** 2025-10-29
**Next Review:** 2025-11-29
