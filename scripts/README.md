# Scripts

This directory contains automation scripts for development and testing workflows.

---

## Available Scripts

### Testing & Validation

#### `test.sh`

**Purpose**: Run comprehensive test suite (typecheck + lint + unit tests)

**Usage**:

```bash
# Run all tests (typecheck + lint + unit)
bash scripts/test.sh

# With coverage reporting
bash scripts/test.sh --coverage

# Include E2E tests (future)
bash scripts/test.sh --e2e

# Generate test report
bash scripts/test.sh --report [path]
```

**What it runs**:

1. **TypeScript type check** (`npm run typecheck`)
2. **ESLint** (`npm run lint`)
3. **Unit tests** (`npm test` or `npm run test:coverage`)
4. **E2E tests** (optional, `npm run test:e2e` - future)

**Exit codes**:

- `0`: All tests passed
- `1`: One or more tests failed

**Report output**:

- Default: `test-results/test-report.md`
- Custom: `bash scripts/test.sh --report custom-path.md`

---

#### `check-dev.sh`

**Purpose**: Run all development checks with detailed logging

**Usage**:

```bash
bash scripts/check-dev.sh
```

**What it checks**:

1. **TypeScript** (`npm run typecheck`)
2. **ESLint** (`npm run lint`)
3. **Build** (`npm run build`)

**Output**:

- Logs saved to `results/check-dev/`
- Individual logs: `type-check.log`, `lint.log`, `build.log`
- Summary: `results/check-dev/summary.log`

**When to use**:

- Before committing code
- Before creating PRs
- After major refactoring
- CI/CD validation

---

## Workflow Examples

### Before Committing Code

```bash
# Quick validation
npm run typecheck && npm run lint

# Full validation with build
bash scripts/check-dev.sh
```

### Before Creating PR

```bash
# Run all tests with coverage
bash scripts/test.sh --coverage

# Check reports
cat results/check-dev/summary.log
cat test-results/test-report.md
```

### Task-Based Development

Work is tracked in GitHub Issues (see `AGENTS.md`); the old `todo/` task runners were removed.

---

## Directory Structure

```
scripts/
├── README.md                # This file
├── test.sh                  # Test suite runner
├── check-dev.sh             # Development checks
├── ts-node-loader.mjs       # TypeScript loader
└── verify-backfill.sql      # SQL verification script
```

---

## NPM Script Integration

The scripts in this directory complement `package.json` scripts:

**Direct NPM scripts** (run individually):

```bash
npm run typecheck        # TypeScript validation
npm run lint             # ESLint
npm run build            # Production build
npm test                 # Vitest unit tests
npm run test:coverage    # With coverage report
```

**Automation scripts** (run workflows):

```bash
bash scripts/test.sh              # All tests in sequence
bash scripts/check-dev.sh         # All checks with logging
```

---

## Future Enhancements

### Planned Scripts

1. **`setup.sh`**: First-time project setup
   - Install dependencies
   - Set up environment variables
   - Initialize database (Supabase migrations)
   - Verify API keys

2. **`deploy.sh`**: Deployment automation
   - Pre-deployment checks (typecheck + build)
   - Database migrations
   - Deploy to Vercel
   - Post-deployment smoke tests

3. **`e2e.sh`**: E2E testing (Playwright)
   - Start dev server
   - Run Playwright tests
   - Generate test reports
   - Capture screenshots/videos

4. **`load-test.sh`**: Performance testing (k6)
   - Run load tests against API routes
   - Measure question generation time
   - Check database query performance
   - Generate performance report

---

## Troubleshooting

### "npm run typecheck failed"

**Solution**:

```bash
# Run typecheck to see errors
npm run typecheck

# Fix type errors in your code
# Re-run validation
bash scripts/check-dev.sh
```

### "Permission denied" when running scripts

**Solution**:

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Re-run script
bash scripts/test.sh
```

---

## Best Practices

### When to Use Each Script

| Scenario                       | Recommended Script                                             |
| ------------------------------ | -------------------------------------------------------------- |
| Quick validation before commit | `npm run typecheck && npm run lint`                            |
| Full pre-commit check          | `bash scripts/check-dev.sh`                                    |
| Running tests                  | `bash scripts/test.sh`                                         |
| Running tests with coverage    | `bash scripts/test.sh --coverage`                              |
| Before PR                      | `bash scripts/test.sh --coverage && bash scripts/check-dev.sh` |

### Test Report

```bash
# Regenerate test report
bash scripts/test.sh --report
```

---

## Contributing

When adding new scripts:

1. **Follow naming convention**: `kebab-case.sh`
2. **Add shebang**: `#!/bin/bash`
3. **Set exit on error**: `set -euo pipefail`
4. **Make executable**: `chmod +x scripts/new-script.sh`
5. **Document in README**: Add to this file
6. **Test thoroughly**: Run in clean environment
7. **Handle errors gracefully**: Provide clear error messages

---

**See Also**:

- `../README.md` - Project overview
- `../CONTRIBUTING.md` - Contribution guidelines
- `../docs/TESTING_GUIDE.md` - Testing documentation
