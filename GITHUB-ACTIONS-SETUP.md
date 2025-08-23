# GitHub Actions Setup Guide

## Required Repository Settings

### 1. Enable GitHub Actions to Create Pull Requests

**⚠️ CRITICAL**: This setting must be enabled for the release workflow to work.

1. Go to your repository on GitHub
2. Click **Settings** → **Actions** → **General**  
3. Scroll down to **Workflow permissions**
4. Enable: **"Allow GitHub Actions to create and approve pull requests"**
5. Click **Save**

### 2. Branch Protection (Optional but Recommended)

1. Go to **Settings** → **Branches**
2. Add rule for `main` branch:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators

### 3. Environment Setup (Production Deployment)

1. Go to **Settings** → **Environments**
2. Create environment: `production`
3. Add environment protection rules:
   - Required reviewers (optional)
   - Deployment branches: `main` only
4. Add environment secrets if needed

## Release-Please Workflow

The release workflow will:
1. **Analyze commits** since last release
2. **Create release PR** with version bump and changelog
3. **Auto-merge** when PR is approved (if branch protection allows)
4. **Create GitHub release** with tags
5. **Deploy to GitHub Pages** on release

## Troubleshooting Common Issues

### "GitHub Actions is not permitted to create or approve pull requests"
- **Solution**: Enable the setting in Step 1 above

### "Release Please failed to create PR"
- **Cause**: No conventional commits since last release
- **Solution**: Make commits with prefixes: `feat:`, `fix:`, `docs:`, etc.

### "Deploy to GitHub Pages failed"
- **Cause**: GitHub Pages not enabled or wrong source
- **Solution**: Go to Settings → Pages → Source: GitHub Actions

### "Codecov upload failed" 
- **Solution**: Already handled gracefully in CI workflow

### "Lighthouse CI failed"
- **Solution**: Already handled gracefully with dynamic config

## Manual Release (If Automated Fails)

```bash
# Create release manually
npm version patch  # or minor/major
git push --follow-tags

# Or use release-please CLI
npx release-please release-pr --token=$GITHUB_TOKEN
```

## Workflow Files Status

- ✅ `ci.yml` - Robust with graceful failures
- ✅ `security.yml` - Weekly scans with proper permissions  
- ✅ `release.yml` - Enhanced permissions, ready for release-please

## Next Steps

1. Enable the repository setting above
2. Make a commit with conventional format: `feat: add new feature`
3. Push to main branch
4. Check Actions tab for release PR creation
5. Review and merge the release PR
6. Verify deployment to GitHub Pages