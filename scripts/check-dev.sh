#!/bin/bash

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -n "${1-}" ]; then
  echo "Usage: scripts/check-dev.sh"
  exit 1
fi

REPORT_DIR="$ROOT_DIR/results/check-dev"
TYPECHECK_LOG="$REPORT_DIR/type-check.log"
LINT_LOG="$REPORT_DIR/lint.log"
BUILD_LOG="$REPORT_DIR/build.log"
SUMMARY_LOG="$REPORT_DIR/summary.log"
mkdir -p "$REPORT_DIR"

typecheck_status=0
lint_status=0
build_status=0

echo "==> Type check"
npm run typecheck 2>&1 | tee "$TYPECHECK_LOG" || typecheck_status=$?

echo "==> Lint"
npm run lint 2>&1 | tee "$LINT_LOG" || lint_status=$?

echo "==> Build"
npm run build 2>&1 | tee "$BUILD_LOG" || build_status=$?

{
  echo "Type check exit: $typecheck_status"
  echo "Lint exit: $lint_status"
  echo "Build exit: $build_status"
  echo
  echo "==> Type check"
  cat "$TYPECHECK_LOG"
  echo
  echo "==> Lint"
  cat "$LINT_LOG"
  echo
  echo "==> Build"
  cat "$BUILD_LOG"
} > "$SUMMARY_LOG"

echo "Reports saved to $REPORT_DIR"
echo "Summary report: $SUMMARY_LOG"

if [ "$typecheck_status" -ne 0 ] || [ "$lint_status" -ne 0 ] || [ "$build_status" -ne 0 ]; then
  exit 1
fi
