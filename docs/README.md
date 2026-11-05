# Docs Guide

Start here. These documents describe the current product and where it is heading.

## Product direction

- [USE_CASES.md](USE_CASES.md) - use cases per user group, ranked by milestone (draft for review).
- `../plans/plan-002-junior-training-programs.md` - roadmap: junior training programs for coaches, junior heads, athletes and guardians. Milestones: MS1 Coach, MS2 Junior head, MS3 Athlete and guardian.
- `../plans/plan-002-expert-review.md` - expert review (architect, UX, security, coach): findings register, hard gates per milestone, proposed starter taxonomy, open questions N11-N20.
- Work is tracked in GitHub Issues; `../AGENTS.md` describes the workflow.

## Canonical references (shipped behavior)

- [CORE_ARCHITECTURE.md](CORE_ARCHITECTURE.md) - architecture decisions and constraints.
- [DATA_MODEL.md](DATA_MODEL.md) - current data contracts and planned entities.
- [COMPONENTS.md](COMPONENTS.md), [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md) - module responsibilities and shared UI.
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [DESIGN_IMPROVEMENTS.md](DESIGN_IMPROVEMENTS.md), [WIREFRAMES.md](WIREFRAMES.md) - visual and layout rules.
- [PERSONAS.md](PERSONAS.md), [USER_JOURNEYS.md](USER_JOURNEYS.md) - users and flows.
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md), [NFR.md](NFR.md), [METRICS.md](METRICS.md) - quality targets.
- [planner-api-implementation-boundaries.md](planner-api-implementation-boundaries.md) - planner/editor API seam and the Airtable adapter boundary.
- [backend-drill-api.md](backend-drill-api.md), [backend-session-api.md](backend-session-api.md), [backend-import-api.md](backend-import-api.md) - backend route behavior.
- [frontend-planner-services-state.md](frontend-planner-services-state.md), [editor-native-drill-workflow.md](editor-native-drill-workflow.md), [editor-import-review-workflow.md](editor-import-review-workflow.md) - frontend and editor workflows.

## Layout

- `docs/*.md` - authoritative architecture, data model, UX, quality and API docs.
- `docs/guides/` - how-to guides (user guide, search, testing, mobile, performance). Written earlier; check against the code before relying on details.
- `docs/security/` - checklist, action items, review and incident reports.
- `docs/archive/` - historical material (completed tasks 009-028, old feature notes). Not guidance.
- Plans live in `/plans`.

## Keeping docs current

If a change alters architecture, a data contract, a route or a user flow, update the matching page in the same change and bump its `Last Updated` date.
