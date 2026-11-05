# Agents.md

This file provides guidance to Agents when working with code in this repository. `CLAUDE.md` points here.

## Quick Start

**If you see a request to implement something:**

1. Check whether the work is already specified in a GitHub Issue (`gh issue list`, `gh issue view <n>`).
2. If YES: implement that Issue [MODE: EXECUTION].
3. If NO: create a GitHub Issue from the **Agent task** template [MODE: PLANNING].

**Default behavior**: Unless explicitly told otherwise, assume you are in EXECUTION mode and can make changes directly.

**Commit rule**: Create a focused local Git commit immediately after completing and validating each individual change. Keep unrelated changes in separate commits. Tag AI-generated commits (e.g. `feat: add age group filter [AI]`). Do not push unless explicitly requested.

## Project Overview

Hawks Coach Hub started as a read-only Google Drive browser for Hawks Helsinki floorball coaches. It now also ships a structured drill catalog, a session planner and an editor/import CMS. The current direction is **junior floorball training program planning**: coaches of junior teams plan a season or cycle of weekly themes and sessions from a drill library tagged for junior age groups. See [plan-002](./plans/plan-002-junior-training-programs.md).

## Core Concepts

- **Drill**: structured record (not a PDF) with metadata; PDFs are import sources or attachments.
- **Session**: ordered drill blocks with durations and notes; saved, recovered, printed, shared by link.
- **Program** (planned): a season/cycle for an age group made of weeks, each with a theme and sessions.
- **Browse mode**: legacy anonymous, read-only Google Drive browser via a service account. Must stay fast and read-only.
- **Editor/import**: authenticated flows for authoring drills and reviewing imports from legacy files.
- **Storage-agnostic domain contracts** with an Airtable adapter first; Postgres on Neon is the proposed follow-up (decision tracked in an Issue).

## Project Goals

- Help volunteer junior coaches plan good, age-appropriate training quickly.
- Keep planning usable on a phone at the rink (375px, 48px touch targets).
- Keep content trustworthy and consistent across age groups.
- Stay lightweight and fast; avoid frameworks without a documented ADR.

## Technology Stack

**Frontend**

- TypeScript (strict), Vite, vanilla DOM (no UI framework)
- Custom CSS in `styles-minimal.css`; shared UI primitives in `src/components/ui/`

**Backend**

- Vercel serverless functions in `api/` (Node): `drive.js`, `drills/`, `sessions/`, `shared-sessions/`, `editor/`, `planner/`
- Airtable (drills, sessions, import drafts) behind adapters in `api/_lib/`
- Google Drive API v3 through a service account (server-side only)

**Testing**

- Vitest + Testing Library (unit/UI), Playwright (`e2e/`)

## Environments

- Production is a deployed app on Vercel; treat production data as read-only unless explicitly instructed.
- Local dev: `npm run dev` on port 8000. Credentials come from your shell or `.env`, never from `package.json`.
- Never commit service-account JSON, keys, or `.env` values.

```bash
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'   # production, server-side
HAWKS_FOLDER_ID="..."
GOOGLE_SERVICE_ACCOUNT_KEY_FILE="$HOME/.config/hawks-coach-hub/<key>.json"   # local, export in shell
```

Airtable and planner auth variables: `docs/planner-api-implementation-boundaries.md`.

## Task Separation Workflow

Use a three-step workflow: plan an Issue, execute that Issue and test it, then validate and ship.

**Step 1: Issue planning and creation (Tool-agnostic)**

- Read `AGENTS.md`.
- Use `docs/` documents as a reference for planning.
- Explore the codebase and identify all changes needed.
- Create a GitHub Issue using `.github/ISSUE_TEMPLATE/agent-task.md`.
- Each Issue must be independent, reference specific files, and have acceptance criteria.
- Planning does not implement code changes; it creates the Issue specification.
- Ask the user about ambiguities and business rules (age groups, program shape, roles); do not assume them.
- Update `docs/CORE_ARCHITECTURE.md` for architectural changes.
- For new features or logic changes, align testing scope with `docs/TESTING_STRATEGY.md`.
- If a feature needs a plan, save it to `plans/plan-###-short-title.md`.
- Do not close, delete or re-prioritize Issues without the user's confirmation.

**Step 2: Issue execution (Tool-agnostic)**

- Work one Issue at a time on its own branch; no combined mega-changes.
- Use `docs/` documents as reference and update them when behavior changes.
- If new work is found, describe it as a follow-up on the open Issue and create a separate Issue during planning rather than expanding scope.
- Run the tests and checks listed in the Issue acceptance criteria, then commit.
- A scripted Issue runner (as used in other repos) is not set up here; execute Issues directly.

**Step 3: Review and verify (Tool-agnostic)**

- Open a PR with `Closes #<n>`; tick the acceptance criteria in the PR description.
- User checks the PR and per-Issue commits, does end-user testing, and pushes.
- Run `bash scripts/check-dev.sh` (typecheck + lint + build).
- Review for bugs, regressions, missing tests, and risky assumptions.

**Workflow records**

- GitHub Issues → task definitions and execution status
- Git commits → atomic implementation history
- `plans/` → feature plans (narrative, phases, issue map, open questions)
- `docs/archive/tasks-009-028/` → legacy `todo/` tasks and `results/` (history only; do not add new files there)

## Execution Modes

### MODE: PLANNING (Tool-Agnostic)

When you see `[MODE: PLANNING]` or are asked to plan or create work:

- DO: Read `AGENTS.md` and the relevant `docs/` pages
- DO: Explore the codebase and create a GitHub Issue using the **Agent task** template
- DON'T: Implement any code changes
- DON'T: Create local task files (`todo/` is retired)

### MODE: EXECUTION (Tool-Agnostic)

When you see `[MODE: EXECUTION]` or are asked to implement an Issue:

- DO: Implement file changes directly without asking
- DO: Follow Issue instructions and acceptance criteria exactly
- DO: Only stop for architectural or business-logic clarifications
- DON'T: Ask permission for normal file modifications
- DON'T: Create a new Issue mid-execution (note it as a follow-up on the open Issue)

## Commands and Scripts

```bash
npm run dev            # Vite dev server (localhost:8000)
npm run typecheck      # TypeScript validation (required before commits)
npm run lint           # ESLint
npm run build          # Production build
npm run test:run       # Vitest once (single: npx vitest run -t "name")
npm run test:coverage  # Coverage run
npm run test:e2e       # Playwright end-to-end

bash scripts/check-dev.sh   # Typecheck + lint + build with logs
bash scripts/test.sh        # Aggregated test workflow
```

Known state (2026-11-04): typecheck and 163 unit tests pass; `npm run lint` has pre-existing errors; e2e is not yet verified in CI. Do not claim "all green" without running the command.

## Project Structure

```text
api/
├── drive.js                 # Drive proxy (read-only)
├── drills/ sessions/ shared-sessions/ editor/ planner/
└── _lib/                    # auth, drills, adapters (Airtable)
src/
├── main-service-account.ts  # App bootstrap and routing
├── components/ (ui/)        # Rendering primitives and shared UI library
├── services/                # Drive, catalog, planner, auth, print
├── state/                   # Shared, catalog, draft and planner state
├── types/                   # drills, sessions, planner, imports
├── ui/                      # Route views (catalog, planner, editor, shells)
└── utils/ config/ actions/
e2e/                         # Playwright specs
docs/                        # Authoritative documentation (formerly DWF/)
docs/archive/                # Historical, non-authoritative
plans/                       # Feature plans
scripts/                     # Check and test scripts
```

## Documentation

The top-level documents in `docs/` (formerly the `DWF/` folder) are the authoritative documentation source.

| Need                                   | Read                                                                                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture decisions                 | `docs/CORE_ARCHITECTURE.md`                                                                                                               |
| Data contracts (Drill, Session, ...)   | `docs/DATA_MODEL.md`                                                                                                                      |
| Component responsibilities, UI library | `docs/COMPONENTS.md`, `docs/COMPONENT_LIBRARY.md`                                                                                         |
| Visual rules                           | `docs/DESIGN_SYSTEM.md`, `docs/DESIGN_IMPROVEMENTS.md`                                                                                    |
| Users and flows                        | `docs/PERSONAS.md`, `docs/USER_JOURNEYS.md`, `docs/WIREFRAMES.md`                                                                         |
| Quality                                | `docs/TESTING_STRATEGY.md`, `docs/NFR.md`, `docs/METRICS.md`                                                                              |
| Backend routes                         | `docs/backend-drill-api.md`, `docs/backend-session-api.md`, `docs/backend-import-api.md`, `docs/planner-api-implementation-boundaries.md` |
| Frontend planner/editor                | `docs/frontend-planner-services-state.md`, `docs/editor-native-drill-workflow.md`, `docs/editor-import-review-workflow.md`                |
| Security                               | `docs/security/` (checklist, action items, review report, incident reports)                                                               |

Legacy note: `docs/archive/` is reference only. If it conflicts with top-level `docs/`, the top-level docs win. If your change alters architecture, a data contract, a route or a user flow, update the matching page in the same change.

## Architecture Patterns

### API Route Rules

- Keep credentials server-side; browse mode stays read-only.
- Validate request bodies; return consistent errors `{ error: string, details?: unknown }`.
- Authenticate mutating planner/editor routes through `api/_lib/auth/`.
- Use optimistic locking (`version` field, 409 on conflict) for concurrent updates.
- Do not change existing API contracts incompatibly; extend them additively.

### Data Access

- Domain contracts are storage-agnostic (`docs/DATA_MODEL.md`); storage lives in adapters under `api/_lib/`.
- New fields must be backward compatible with existing records.
- If storage moves to Postgres (Neon): RLS on every table, never edit existing migrations, add new ones.

### Frontend

- Explicit state transitions and predictable imperative DOM updates; avoid DOM churn on mobile.
- Optimistic UI where documented, with rollback and refresh on 409/error.
- Preserve the sub-5-second uncached mobile load target for browse mode.

## UI and Design Patterns

- Mobile-first (375px, 48px touch targets), keyboard-accessible, visible focus states.
- Respect system dark mode and `prefers-reduced-motion`.
- Finnish-first UI copy; keep labels and messages in Finnish unless a task says otherwise.
- Reuse components from `src/components/ui/`; follow `docs/DESIGN_SYSTEM.md`.
- Minimal, content-focused layouts; always give a clear current location and a way back.

## Data Privacy and Security

- Browse access stays anonymous and read-only; writes only through authenticated API routes.
- Treat all Google and Airtable credentials as highly sensitive; rotate immediately if exposed and document it.
- Keep `.gitignore` coverage for `*service-account*.json`, `*.key`, `*.pem`, `coach-hub-*.json`.
- Junior programs may involve minors: collect only what a planning feature needs; never log PII or secrets.
- Never hardcode local credential paths in `package.json` or source.

## Pull Requests and Issues

- Put `Closes #<n>` in the PR description for every Issue the PR completes, one per line, so GitHub closes them on merge. Do not close Issues by hand afterwards.
- For an epic, list finished stories with `Closes #<n>` and refer to the epic with `Part of #<epic>`.
- Mention the PR in an Issue only for work that is not complete (`Part of #<n>`).
- Labels: type (`user-story`, `bug`, `enhancement`, `documentation`, `chore`, `follow-up`), priority (`P0` blocks, `P1` important, `P2` nice to have), `epic:<name>`, `phase:<n>-<name>`.
- Story points: 1 (<1h), 2, 3, 5, 8 (1-2 days); 13 means split it.

## Testing

- Follow `docs/TESTING_STRATEGY.md`; prioritize critical-path coverage over 100%.
- Unit tests for pure logic and services; Testing Library for behavior, not DOM trivia.
- API/adapter tests for validation, auth, conflicts and error handling.
- Playwright: one happy path and one failure path per new flow.
- Do not edit a test just to turn it green; change it only when it asserts intentionally changed behavior, and say why.
- Run `npm run typecheck` after every change set.

## Project Rules

Never:

1. Add routes that store or read coaching data using the header-based planner identity (`x-planner-*`); real authentication comes first (see `plans/plan-002-expert-review.md`).
2. Change API contracts incompatibly or assume business rules (age groups, program shape, roles); ask or record an open question in the plan.
3. Commit secrets or copy `.env` values into the repo.
4. Remove `AIDEV-` comments.
5. Edit existing migration files (if migrations are added).

## Skills

If a request names or clearly matches an available skill, use it alongside this guidance and read only what is needed.
