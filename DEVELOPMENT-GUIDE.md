Claude Code — SDLC Playbook

Scope first, code second 1. Use cases (bullet form, not novels)
• Actor → Trigger → Happy path → Alt/edge path → Data touched → Success metric 2. Requirements
• Functional: numbered, testable (“HA creates binary_sensor.drive_sync_ok within 1s”).
• Non-functional: perf targets, a11y level (WCAG 2.2 AA), security (CSP, OWASP), ops (logs, metrics).
• Out of scope: name them explicitly. 3. Architecture sketch
• Draw module boundaries and data flow (one paragraph + ASCII diagram).
• Record trade-offs with a 5-line ADR (see template).

Documentation
• Create and update Solution.md file containing the following chapters: - Use cases - High-level architecture - Implementation overview - UI wireframe - Security and compliace - Performance targets - Deployment and operations - Solution status

Project hygiene
• Use TypeScript with "strict": true.
• ES modules only; prefer destructured imports.
• Enforce ESLint + Prettier; no warnings in CI.
• Small modules, single responsibility; no "god" utils.

State Management
• Define clear AppState interface with all necessary fields.
• Initialize state with proper default values (empty arrays, Maps, Sets).
• Use Maps for caches, Sets for collections, proper typing throughout.
• Clear/reset state appropriately (folderCache.clear(), expandedFolders.clear()).
• Keep state updates atomic and UI updates reactive to state changes.

Testing (be ruthless and fast)
• Unit: Vitest/Jest. Test pure logic first. Aim for critical-path coverage, not 100%.
• Component/UI: Testing Library; assert behavior, not DOM trivia.
• e2e (web): Playwright for one happy path + one “oh no” path.
• Home Assistant: unit-test helpers, services, parsers; simulate HA state with fixtures.
• Prefer single test runs while iterating (npm run test:one "name").
• Always npm run typecheck after a change set.

Security, privacy, a11y
• Security: input validation at boundaries; no secrets in code; .env with schema; set CSP, HSTS, and sane CORS; follow OWASP ASVS L1 at minimum.
• Privacy: data minimization; clear telemetry toggle; no 3rd-party trackers by default.
• A11y: semantic HTML, focus management, ARIA only when needed; keyboard and color-contrast checks; run Lighthouse/aXe.

Security - Critical Security Practices (NEVER IGNORE)
• NEVER commit credentials: Use .gitignore patterns for _service-account_.json, _.key, _.pem, *.p12
• Environment variables ONLY: All secrets via GOOGLE_SERVICE_ACCOUNT_KEY, etc.
• Enable GitHub secret scanning: Settings → Security → Secret scanning
• Immediate breach response: Use git filter-repo to clean history, revoke compromised keys
• Service account principle: Minimal permissions, read-only when possible
• Regular credential rotation: Monthly for high-risk, quarterly minimum
• .gitignore must include:
*service-account*.json, *service*account*.json, *.key, *.pem, _.p12
_-key.json, _\_key.json, coach-hub-_.json
!package\_.json, !tsconfig\*.json (allow project configs)

Security Incident Response (If Credentials Are Exposed) 1. IMMEDIATE: Install git-filter-repo: pip3 install git-filter-repo 2. IMMEDIATE: Clean Git history: git filter-repo --path FILENAME --invert-paths --force 3. IMMEDIATE: Force push clean history: git push --force origin main  
 4. URGENT: Revoke compromised credentials in cloud console (Google/AWS/Azure) 5. URGENT: Create new service account with different name/keys 6. URGENT: Update production environment variables with new credentials 7. URGENT: Update sharing permissions (Google Drive, etc.) to new service account 8. MONITOR: Check cloud audit logs for unauthorized access during exposure window 9. DOCUMENT: Create security incident report with timeline, impact, and prevention measures 10. PREVENT: Review and strengthen .gitignore, enable secret scanning, add pre-commit hooks

Performance & UX
• Budget: first render <2s on mid-tier mobile, JS <200KB gz.
• Lazy-load non-critical routes; memoize heavy calcs.
• For HA UIs: instant feedback on actions, optimistic updates where safe.

UI/UX Navigation Patterns
• Test navigation concepts with users before full implementation.
• Consider information architecture: breadcrumbs vs chips vs sidebar vs tabs.
• Keep backup/revert capability when experimenting with navigation UX.
• For hierarchical data: - Horizontal chips: good for 2-3 levels, shows available options - Breadcrumbs: good for deep hierarchies, shows current path

- Sidebar tree: good for complex structures, persistent navigation
  • Mobile-first responsive navigation (collapsible, scrollable, touch-friendly).
  • Always provide "back to root" and clear current location indicators.

Observability
• Centralized error handling; user-safe messages, dev-useful logs.
• Structured logs (JSON), log levels; add minimal metrics (latency, error rate).

Git & reviews
• Conventional Commits (feat:, fix:…).
• Small PRs with: purpose, scope, design notes, test evidence, screenshots/gifs.
• Definition of Done checklist (below). No green CI → no merge.

CI/CD & GitHub Actions - Robust Pipeline Design
• Keep Actions up-to-date: regularly audit for deprecation warnings.
• Pin major versions (@v4) but allow patch updates for security.
• Common updates needed: - actions/checkout@v4, actions/setup-node@v4 - actions/upload-artifact@v4, actions/download-artifact@v4 - github/codeql-action/\*@v3 (security scanning) - codecov/codecov-action@v4 (with CODECOV_TOKEN) - release-please-action@v4, actions-gh-pages@v4
• Set proper permissions in workflows (contents: write, pull-requests: write).
• Enable "Allow GitHub Actions to create and approve pull requests" in repo settings.
• Test workflow changes with small commits before major releases.

TypeScript Strict Mode in CI/CD - Critical Success Factor
• ALWAYS fix TypeScript compilation errors BEFORE committing.
• Run `npm run typecheck` locally after any interface/type changes.
• TypeScript strict mode failures WILL break CI - no exceptions.
• Common strict mode gotchas: - Window interface declarations need proper global scope - Error handling: use `error instanceof Error ? error.message : 'Unknown error'` - Null safety: check for undefined before property access - HTMLElement casting: use `instanceof HTMLElement` checks
• Pre-commit hooks should catch these, but don't rely on them.
• When blocked: use `git commit --no-verify` only as last resort, fix immediately after.

CI/CD Resilience Patterns (Prevent Common Failures)
• Graceful failure handling: Use || echo "Step failed, continuing..." for non-critical steps
• Required vs optional steps: Only fail CI on critical issues (build, typecheck, security)
• Codecov: Set fail_ci_if_error: false to prevent coverage upload failures breaking CI
• Lighthouse: Generate missing configs dynamically, allow failures for optional quality checks
• npm audit: Use || echo for advisory-level issues, fail only on high/critical vulnerabilities  
 • Permissions: Always set explicit permissions at workflow level
• Cache strategy: Use actions/cache for node_modules, but don't fail if cache miss
• Matrix testing: Test Node 18.x and 20.x, but allow 18.x failures if not critical
• Environment protection: Use GitHub environments for production deployments with approval
• Secrets management: Prefer environment secrets over repository secrets for production

Vercel Deployment - Hard-Won Lessons
• NEVER mix deprecated 'routes' with modern config ('headers', 'rewrites').
• Use simplified config: let Vercel auto-detect functions in api/ folder.
• Runtime specification format: avoid @vercel/node@X - use auto-detection.
• Test vercel.json locally: `vercel dev` catches config issues early.
• Environment variables: Use Vercel dashboard, not CLI for complex JSON.
• Service account keys: Add as single env var, test with simple API call first.
• Configuration anti-patterns: - ❌ "version": 2, "builds": [...] (deprecated) - ❌ "functions": {"runtime": "@vercel/node@3"} (invalid format) - ❌ "routes" + "headers" together (conflicting) - ✅ Minimal config: buildCommand, outputDirectory, headers only
• Debug failed deployments: check Function Logs in Vercel dashboard.

API Development - Service Account Pattern
• Store service account JSON as environment variable (not file path).
• Implement graceful credential loading: try env var first, then file paths.
• Cache API responses aggressively (5min TTL minimum for Google Drive).
• Use batch API calls: process multiple folders in parallel.
• Add comprehensive logging with emoji prefixes for easy debugging.
• Handle API timeouts: 45-60 seconds for large folder operations.
• Development vs Production: different cache strategies, same API logic.

Home Assistant specifics
• Prefer Config Flow over YAML for integrations; validate early.
• Use DataUpdateCoordinator for polling.
• Entities: name + device class + unit consistently; add unique_id.
• Services: schema validation; idempotent where possible.
• Blueprints: include inputs schema, sane defaults, examples.
• Avoid blocking I/O in event handlers; keep automations deterministic.

HA test targets
• Parsing/evaluating templates/jinja helpers
• Automation conditions and edge times (DST, midnight, timezones)
• Service payload builders and error paths

⸻

"Definition of Done" (paste into every PR)
• Use cases + requirements updated
• ADR added/updated (if a trade-off happened)
• Types are strict clean (npm run typecheck)
• Lint/format clean
• Unit tests for new logic; e2e for one happy + one failure path
• a11y and Lighthouse pass (≥90)
• Security checks: CSP present, env schema validated, no secrets, .gitignore comprehensive
• GitHub Actions run without deprecation warnings, resilient to common failures
• Credential security: No service accounts, API keys, or secrets in Git history
• Docs updated (README snippet + configuration + examples)
• Rollback strategy noted (how to disable or revert)

Extra quality moves Claude should apply by default
• Propose contract-first APIs (types/interfaces) before wiring.
• Add example configs and a minimal demo script.
• Provide migration notes when modifying data shapes.
• Suggest feature flags for risky changes.
• Include seed fixtures for tests and local dev.

GIT essentials:  
 Release & versioning
• Semantic versioning + automated releases:
• Web apps: semantic-release or release-please → tags, GitHub Releases, changelog.
• HA integrations/blueprints: bump version in manifest/blueprint and tag.
• Tag every prod deploy (v1.4.0), link to changelog.

    Changelog
    •	Auto-generate from commits; keep human notes for breaking changes.
    •	Keep CHANGELOG.md in repo root.

Documentation That Actually Helps During Deployment
• Create project-specific guides (not just generic): HAWKS-DEVELOPMENT-GUIDE.md.
• Update .env.example with comprehensive comments and security warnings.
• Document API cost analysis early - helps with scaling decisions.
• Performance documentation should include TypeScript build benefits.
• CI/CD setup guides must include repository permission requirements.
• Troubleshooting sections with actual error messages you encountered.
• Example commit messages that pass conventional commit linting.
• Emergency procedures: credential rotation, rollback steps.

    Repo hygiene
    •	.gitignore: include .env*, build outputs, HA secrets; commit only .env.example.
    •	.gitattributes:
    •	Normalize line endings: * text=auto
    •	Mark lock/compiled files as linguist-generated.
    •	Git LFS for any binaries (images, design assets); don’t LFS node_modules.

    Diagnostics & rollback
    •	Tag feature flags in commits/PRs so you can revert quickly.
    •	Keep a Rollback section in PR description: “revert #123 + disable flag X”.

    PR template:
    ## What
    - <summary>

    ## Why
    - <reason / user impact>

    ## How to test
    - Commands / HA steps

    ## Screens
    - before/after

    ## Checklist
    - [ ] typecheck
    - [ ] tests updated
    - [ ] docs/changelog
    - [ ] migration/rollback notes
