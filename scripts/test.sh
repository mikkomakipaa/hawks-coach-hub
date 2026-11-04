#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "========================================="
echo "Running Test Suite"
echo "========================================="

# Parse arguments
RUN_E2E=false
RUN_COVERAGE=false
RUN_REPORT=false
REPORT_PATH="test-results/test-report.md"

while [ $# -gt 0 ]; do
  case "$1" in
    --e2e)
      RUN_E2E=true
      shift
      ;;
    --coverage)
      RUN_COVERAGE=true
      shift
      ;;
    --report)
      RUN_REPORT=true
      if [ $# -gt 1 ] && [[ ! "$2" =~ ^-- ]]; then
        REPORT_PATH="$2"
        shift
      fi
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: scripts/test.sh [--e2e] [--coverage] [--report [path]]"
      exit 1
      ;;
  esac
done

if [ "$RUN_REPORT" = true ]; then
  REPORT_DIR="$(dirname "$REPORT_PATH")"
  mkdir -p "$REPORT_DIR"
  cat <<'EOF' > "$REPORT_PATH"
# Test Suite Report (Koekertaaja)

This report documents the testing types and phases used in this repo so agents can plan work and validation consistently.

## Phases (order of execution)
1) Type Check
   - Command: npm run typecheck
   - Purpose: TypeScript compilation and type safety.

2) Lint
   - Command: npm run lint
   - Purpose: Static analysis, code style, and unused imports.

3) Unit / Integration
   - Default: npm test
   - With coverage: npm run test:coverage
   - Purpose: Verify business logic and component behavior.

4) E2E (future)
   - Command: npm run test:e2e (not yet implemented)
   - Purpose: Validate user flows in the browser (Playwright).

## Additional checks (not run by this script)
- Build: npm run build
- Accessibility: axe-core integration (future)

## When to use each phase (task planning guide)
- Small UI copy/layout changes: typecheck + lint.
- Business logic / API changes: typecheck + lint + unit tests.
- Answer matching / stratified sampling: unit tests with high coverage (>80%).
- AI question generation: integration tests for API routes.
- Critical path changes: typecheck + lint + unit + E2E (future).

## Testing Priorities (See docs/TESTING_STRATEGY.md)
P0 (Critical): Answer matching, stratified sampling, code generation
P1 (Important): API routes, question components
P2 (Future): E2E tests, accessibility smoke tests

## Notes
- This script runs typecheck, lint, and unit tests.
- Use --coverage for coverage reporting.
- Use --e2e for E2E tests (future).
- Use --report [path] to regenerate this report.
EOF
  echo "==> Wrote test report to $REPORT_PATH"
fi

# Run typecheck
echo ""
echo "==> Running TypeScript type check"
npm run typecheck

# Run lint
echo ""
echo "==> Running lint"
npm run lint

# Run unit tests
echo ""
echo "==> Running unit tests"
if [ "$RUN_COVERAGE" = true ]; then
  npm run test:coverage
else
  npm test
fi

# Run E2E tests if requested
if [ "$RUN_E2E" = true ]; then
  echo ""
  echo "==> Running E2E tests"
  if command -v playwright &> /dev/null; then
    npm run test:e2e
  else
    echo "⚠️  E2E tests not yet implemented (Playwright not installed)"
    echo "    See docs/TESTING_STRATEGY.md for future E2E setup"
  fi
fi

echo ""
echo "✅ All tests passed!"
