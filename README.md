# coach-hub

Documentation lives in `docs/`; work is tracked in GitHub Issues and `plans/` (see [AGENTS.md](AGENTS.md)).

## What This Project Is

Hawks Coach Hub currently ships as a read-only Google Drive browser for Hawks Helsinki coaching staff plus additive planner/editor routes for structured drills, sessions, sharing, and import review.

## Documentation Map

| Document                                                 | Summary                                                                                                                                                                                                                     | Quick Links                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Core Architecture Decisions](docs/CORE_ARCHITECTURE.md) | Hawks Coach Hub currently ships as a read-only Google Drive browser for Hawks Helsinki coaching staff plus additive planner/editor routes for structured drills, sessions, sharing, and import review.                      | [Context](docs/CORE_ARCHITECTURE.md#context)<br>[Decision 1: Vanilla TypeScript (No Frontend Framework)](docs/CORE_ARCHITECTURE.md#decision-1-vanilla-typescript-no-frontend-framework)<br>[Decision 2: Vercel Serverless Function as API Proxy](docs/CORE_ARCHITECTURE.md#decision-2-vercel-serverless-function-as-api-proxy)                                                                                                     |
| [Component Reference](docs/COMPONENTS.md)                | Hawks Coach Hub uses **vanilla TypeScript** — no React or other component framework. "Components" are TypeScript classes or module singletons that manage sections of the DOM directly.                                     | [Architecture Note](docs/COMPONENTS.md#architecture-note)<br>[Services](docs/COMPONENTS.md#services)<br>[Planned Planner/CMS Extension](docs/COMPONENTS.md#planned-plannercms-extension)                                                                                                                                                                                                                                           |
| [Data Model](docs/DATA_MODEL.md)                         | Current shipped application:                                                                                                                                                                                                | [Overview](docs/DATA_MODEL.md#overview)<br>[Planner/CMS Route Boundary](docs/DATA_MODEL.md#plannercms-route-boundary)<br>[Core Data Types](docs/DATA_MODEL.md#core-data-types)                                                                                                                                                                                                                                                     |
| [Design System](docs/DESIGN_SYSTEM.md)                   | Every design decision is evaluated against load time and interaction speed. No heavy animations, no layout-shift-causing elements, no large decorative images.                                                              | [Design Principles](docs/DESIGN_SYSTEM.md#design-principles)<br>[Color Palette](docs/DESIGN_SYSTEM.md#color-palette)<br>[Typography](docs/DESIGN_SYSTEM.md#typography)                                                                                                                                                                                                                                                             |
| [Metrics & Performance Targets](docs/METRICS.md)         | The `PerformanceMonitor` utility (`src/utils/performance-monitor.ts`) logs timings in development for browse-mode work:                                                                                                     | [Performance Metrics](docs/METRICS.md#performance-metrics)<br>[Performance Monitoring in App](docs/METRICS.md#performance-monitoring-in-app)<br>[Future Observability (Not Yet Implemented)](docs/METRICS.md#future-observability-not-yet-implemented)                                                                                                                                                                             |
| [Non-Functional Requirements (NFR)](docs/NFR.md)         | These NFRs now distinguish between:                                                                                                                                                                                         | [Performance](docs/NFR.md#performance)<br>[Security](docs/NFR.md#security)<br>[Reliability](docs/NFR.md#reliability)                                                                                                                                                                                                                                                                                                               |
| [User Personas](docs/PERSONAS.md)                        | Age: 42 / Role: Head coach of Hawks Helsinki floorball team                                                                                                                                                                 | [Primary Persona: "Head Coach Harri"](docs/PERSONAS.md#primary-persona-head-coach-harri)<br>[Secondary Persona: "Assistant Coach Anu"](docs/PERSONAS.md#secondary-persona-assistant-coach-anu)<br>[Tertiary Persona: "Club Admin Mika"](docs/PERSONAS.md#tertiary-persona-club-admin-mika)                                                                                                                                         |
| [Testing Strategy](docs/TESTING_STRATEGY.md)             | Focus on **critical path coverage** over 100% coverage. The app is a file browser — correctness of search, file rendering, and API integration matters most.                                                                | [Philosophy](docs/TESTING_STRATEGY.md#philosophy)<br>[Unit Tests (Vitest)](docs/TESTING_STRATEGY.md#unit-tests-vitest)<br>[Integration Tests](docs/TESTING_STRATEGY.md#integration-tests)                                                                                                                                                                                                                                          |
| [User Journey Maps](docs/USER_JOURNEYS.md)               | Hawks Coach Hub now has two documented experience surfaces:                                                                                                                                                                 | [Journey Model](docs/USER_JOURNEYS.md#journey-model)<br>[Journey 1: Coach Finds a Drill Before Practice (Current Primary Flow)](docs/USER_JOURNEYS.md#journey-1-coach-finds-a-drill-before-practice-current-primary-flow)<br>[Journey 2: Coach Builds a Session From Structured Drills (Planned Primary Planner Flow)](docs/USER_JOURNEYS.md#journey-2-coach-builds-a-session-from-structured-drills-planned-primary-planner-flow) |
| [Wireframes & Screen Layouts](docs/WIREFRAMES.md)        | Notes:                                                                                                                                                                                                                      | [Screen Index](docs/WIREFRAMES.md#screen-index)<br>[1. Browse Mode (Desktop)](docs/WIREFRAMES.md#1-browse-mode-desktop)<br>[2. Browse Mode (Mobile)](docs/WIREFRAMES.md#2-browse-mode-mobile)                                                                                                                                                                                                                                      |
| [Component Library](docs/COMPONENT_LIBRARY.md)           | Browse mode, planner, and editor surfaces all share the same visual language (Hawks orange, system font, 12px/16px border-radius, 48px touch targets) but historically re-implemented buttons, badges, empty states, and... | [Why this library exists](docs/COMPONENT_LIBRARY.md#why-this-library-exists)<br>[Design token reference](docs/COMPONENT_LIBRARY.md#design-token-reference)<br>[Components](docs/COMPONENT_LIBRARY.md#components)                                                                                                                                                                                                                   |
| [Design Improvement Log](docs/DESIGN_IMPROVEMENTS.md)    | No summary paragraph found in document intro.                                                                                                                                                                               | [Active Improvements](docs/DESIGN_IMPROVEMENTS.md#active-improvements)<br>[Proposed Improvements (Backlog)](docs/DESIGN_IMPROVEMENTS.md#proposed-improvements-backlog)<br>[Design Decisions Log](docs/DESIGN_IMPROVEMENTS.md#design-decisions-log)                                                                                                                                                                                 |

## Architecture At A Glance

- **Core architecture:** Hawks Coach Hub currently ships as a read-only Google Drive browser for Hawks Helsinki coaching staff plus additive planner/editor routes for structured drills, sessions, sharing, and import review.
- **Non-functional requirements:** These NFRs now distinguish between:
- **Metrics and targets:** The `PerformanceMonitor` utility (`src/utils/performance-monitor.ts`) logs timings in development for browse-mode work:

## Development Quick Start

- `npm install`
- `npm run dev`
- `bash scripts/check-dev.sh`

Additional scripts from `package.json`:

- `npm run dev`
- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `npm run test:run`
- `npm run test:e2e`

## Testing and Quality

Focus on **critical path coverage** over 100% coverage. The app is a file browser — correctness of search, file rendering, and API integration matters most.

## Product and UX Principles

- **Personas:** Age: 42 / Role: Head coach of Hawks Helsinki floorball team
- **User journeys:** Hawks Coach Hub now has two documented experience surfaces:

## Source Documents

- [Core Architecture Decisions](docs/CORE_ARCHITECTURE.md)
- [Component Reference](docs/COMPONENTS.md)
- [Data Model](docs/DATA_MODEL.md)
- [Design System](docs/DESIGN_SYSTEM.md)
- [Metrics & Performance Targets](docs/METRICS.md)
- [Non-Functional Requirements (NFR)](docs/NFR.md)
- [User Personas](docs/PERSONAS.md)
- [Testing Strategy](docs/TESTING_STRATEGY.md)
- [User Journey Maps](docs/USER_JOURNEYS.md)
- [Wireframes & Screen Layouts](docs/WIREFRAMES.md)
- [Component Library](docs/COMPONENT_LIBRARY.md)
- [Design Improvement Log](docs/DESIGN_IMPROVEMENTS.md)
