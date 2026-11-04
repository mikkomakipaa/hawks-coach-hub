# Hawks Coach Hub

A mobile-first planning tool for floorball coaches. It started as a fast, read-only browser for Hawks Helsinki's Google Drive training material and now includes a structured drill library, a session planner and an editor. The current direction is **training program planning for junior teams**: plan a season or cycle of weekly themes and sessions from drills tagged for junior age groups.

- Roadmap: [plan-002 – Junior training programs](plans/plan-002-junior-training-programs.md)
- Work tracking: [GitHub Issues](https://github.com/mikkomakipaa/hawks-coach-hub/issues)
- Contributor and agent guide: [AGENTS.md](AGENTS.md)

## Features

| Area                                     | Status      | Notes                                                                                           |
| ---------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| Drive browser                            | Shipped     | Anonymous, read-only access to training material through a service account                      |
| Drill catalog                            | Implemented | Structured drills with search, filters and detail view                                          |
| Session planner                          | Implemented | Build sessions from drills, durations and totals, save and recover drafts, print, share by link |
| Editor / import review                   | Implemented | Author and publish drills, review imports from legacy files                                     |
| Junior metadata (age group, skill focus) | Planned     | Phase 1 of plan-002                                                                             |
| Program planning (season, weeks, themes) | Planned     | Phases 2–3 of plan-002                                                                          |

The UI is Finnish-first and designed for phones and tablets at the rink (375px, 48px touch targets).

## Tech stack

- Frontend: TypeScript (strict), Vite, vanilla DOM, custom CSS
- API: Vercel serverless functions in `api/` (Node)
- Data: Airtable behind storage-agnostic adapters for drills, sessions and imports; Google Drive for legacy files
- Tests: Vitest and Testing Library, Playwright for end-to-end
- Deploy: Vercel

## Getting started

```bash
npm install
cp .env.example .env          # fill in values, never commit .env
npm run dev                   # http://localhost:8000
```

Local development needs server-side credentials for Google Drive and Airtable. Export `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` in your shell or set it in `.env`. Keep key files outside the repository. See [planner API boundaries](docs/planner-api-implementation-boundaries.md) for the Airtable and auth variables.

## Scripts

| Command                     | Purpose                        |
| --------------------------- | ------------------------------ |
| `npm run dev`               | Dev server                     |
| `npm run build`             | Production build               |
| `npm run typecheck`         | TypeScript check               |
| `npm run lint`              | ESLint (zero warnings allowed) |
| `npm run test:run`          | Unit tests once                |
| `npm run test:e2e`          | Playwright end-to-end          |
| `bash scripts/check-dev.sh` | Typecheck, lint and build      |

Commits follow Conventional Commits and are checked by commitlint and a pre-commit lint hook. Use `npm run commit` for a guided prompt.

## Project structure

```text
api/        serverless routes (drive, drills, sessions, shared-sessions, editor, planner) + _lib adapters
src/        app bootstrap, UI views, components, services, state, types
e2e/        Playwright specs
docs/       architecture, data model, UX and quality docs (guides/, security/, archive/)
plans/      feature plans
scripts/    check and test helpers
public/     static assets (logo, manifest, service worker)
```

## Documentation

Start with [docs/README.md](docs/README.md).

| Topic                     | Document                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Architecture              | [CORE_ARCHITECTURE](docs/CORE_ARCHITECTURE.md)                                                                      |
| Data model                | [DATA_MODEL](docs/DATA_MODEL.md)                                                                                    |
| Components and UI library | [COMPONENTS](docs/COMPONENTS.md), [COMPONENT_LIBRARY](docs/COMPONENT_LIBRARY.md)                                    |
| Design system             | [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md)                                                                              |
| Users and journeys        | [PERSONAS](docs/PERSONAS.md), [USER_JOURNEYS](docs/USER_JOURNEYS.md), [WIREFRAMES](docs/WIREFRAMES.md)              |
| Quality                   | [TESTING_STRATEGY](docs/TESTING_STRATEGY.md), [NFR](docs/NFR.md), [METRICS](docs/METRICS.md)                        |
| Backend routes            | [drills](docs/backend-drill-api.md), [sessions](docs/backend-session-api.md), [imports](docs/backend-import-api.md) |
| Security                  | [docs/security/](docs/security/)                                                                                    |
| How-to guides             | [docs/guides/](docs/guides/)                                                                                        |

## Contributing

1. Pick or create a GitHub Issue (use the **Agent task** template for new work).
2. Branch, implement with tests, and run `npm run typecheck`, `npm run lint` and `npm run test:run`.
3. Open a PR with `Closes #<n>` and update the matching docs.

Never commit secrets or service-account files. See [AGENTS.md](AGENTS.md) for the full workflow and rules.
