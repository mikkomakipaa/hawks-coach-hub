# Plan-002: Junior Training Program Planning

**Created**: 2026-11-04
**Status**: Draft - needs product review (see Open Questions)
**Scope decision (2026-11-04)**: Floorball juniors only. Keep the current floorball model; shift content and UX to junior age groups and add season/program planning on top of sessions.
**Tracking**: GitHub Issues, epic label `epic:junior-programs`. This plan is the narrative; the issues are the source of truth for task status.
**Builds on**: [plan-001](./plan-001-training-session-planner.md) (session planner + editor CMS)

---

## 1. Where we are (progress audit, 2026-11-04)

### Delivered (tasks 009-028 all have result files)

| Area                                                                | State               | Evidence                                      |
| ------------------------------------------------------------------- | ------------------- | --------------------------------------------- |
| Drive browser (read-only, no login)                                 | Shipped, production | `api/drive.js`, `src/main-service-account.ts` |
| Structured drill API + Airtable adapter                             | Implemented         | `api/drills/`, `api/_lib/drills/`             |
| Session API + share links                                           | Implemented         | `api/sessions/`, `api/shared-sessions/`       |
| Editor import drafts + permissions                                  | Implemented         | `api/editor/`, `api/_lib/auth/`               |
| Coach catalog, drill detail, session builder, print/share, recovery | Implemented         | `src/ui/`, `src/services/`, `src/state/`      |
| Editor drill form + import review                                   | Implemented         | `src/ui/editor-*.ts`                          |
| Test-version UI shells                                              | Implemented         | tasks 024-028                                 |

### Health

| Check               | Result                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run typecheck` | Pass                                                                                                |
| `npm run test:run`  | 163 / 163 pass (23 files, vitest 5.1.0)                                                             |
| `npm run lint`      | **Fail: 61 errors, 30 warnings** (pre-existing, noted in task 020 result)                           |
| `npm run test:e2e`  | **Not verified**: task results say sandbox blocked `vite preview`; needs a run on a real machine/CI |
| `npm audit`         | 7 findings left (minimatch ReDoS via eslint tooling)                                                |

### Risks found

1. **Almost none of the planner/editor work is committed.** It sits in the git index, mixed with `.claude/`, `.roo/` and `.claude-flow/` tooling files. Last real commits are from the Drive-browser era. This is the top risk.
2. `package.json` `dev` script hardcodes a local service-account path (must not be committed).
3. Airtable is the interim database; the Airtable-to-Supabase decision is still open and affects the new program data model.
4. Product copy, personas and journeys still describe a single senior team (Hawks Helsinki), not junior programs.
5. e2e and lint are not CI-green, so regressions can slip in during a pivot.

---

## 2. Goal

Let junior floorball coaches plan a **training program** (a season or cycle for an age group), not just single sessions, using a drill library tagged for junior development.

Target users (to validate, see Open Questions):

- **Junior team coach** (often a volunteer parent): needs a ready structure, limited time, low tech confidence.
- **Junior coordinator / head of juniors**: wants consistent development themes across age groups.
- **Assistant coach**: runs sessions from a plan someone else made.

### Success metrics

- Time from "new season" to first complete 4-week program under 15 minutes.
- Share of program weeks that have at least one session planned.
- Share of sessions built from the library without opening legacy PDFs.
- Mobile (375px) planning success rate.

---

## 3. Approach

Layer a program model above the existing session model. Do not rewrite what works.

```text
Season/Program (age group, period, goals)
  └── Week / Cycle (theme, focus skills)
        └── Session (existing: drill blocks, durations, notes)
              └── Drill (existing, extended with junior metadata)
```

Principles:

- Additive: browse mode, planner, editor keep working at every step.
- Finnish-first UI copy.
- Storage-agnostic domain contracts (`docs/DATA_MODEL.md`), Airtable adapter first.
- Each phase ships something usable and is tracked by issues with testable acceptance criteria.

---

## 4. Phases

### Phase 0 - Baseline and hygiene (P0, blocks everything)

Goal: a clean, committed, CI-green starting point.

- Commit the planner/editor work in logical commits, separate from tooling files.
- Remove the hardcoded key path from `package.json`; document `.env` usage.
- Get lint to zero errors and run e2e in CI.
- Resolve remaining `npm audit` findings.
- Update docs and AGENTS.md for the GitHub-issues workflow (done with this plan).

### Phase 1 - Junior content model (P0)

Goal: drills are discoverable by junior age group and learning goal.

- Extend `Drill` with: age group range, skill focus tags, group size, equipment, space needed, intensity, coaching tips for beginners.
- Age-group configuration (labels and ranges are an Open Question).
- Catalog filters for age group and skill focus.
- Editor form fields for the new metadata.

### Phase 2 - Program planning (P0/P1)

Goal: create and edit a program with weekly themes.

- Domain model, API and storage for programs and weeks.
- Program list and program detail views (mobile first).
- Create program from template (for example "8-week autumn block").

### Phase 3 - Session-program integration (P1)

Goal: sessions live inside the program.

- Attach sessions to program weeks; create a session pre-filled from the week's theme.
- Coverage view: which skill focuses are covered per week.
- Program print/share view for parents and assistants.

### Phase 4 - Onboarding and content (P1/P2)

- Starter drill set and program templates for juniors.
- Simple coach onboarding and help.
- ADR: Airtable vs Supabase for production storage (RLS required if Supabase).

---

## 5. Issue map

Created in GitHub (see issue tracker, epic `epic:junior-programs`). Estimates follow the playbook scale; anything above 8 is split.

| #   | Title                                                 | Phase | Priority | Points |
| --- | ----------------------------------------------------- | ----- | -------- | ------ |
| 1   | Commit planner/editor work in logical commits         | 0     | P0       | 3      |
| 2   | Remove hardcoded service-account path from dev script | 0     | P0       | 1      |
| 3   | Get lint to zero errors                               | 0     | P0       | 5      |
| 4   | Run Playwright e2e in CI and fix failures             | 0     | P0       | 5      |
| 5   | Fix remaining npm audit findings (minimatch)          | 0     | P1       | 2      |
| 6   | Update personas and journeys for junior coaches       | 1     | P1       | 3      |
| 7   | Add junior metadata to Drill model and API            | 1     | P0       | 5      |
| 8   | Filter drill catalog by age group and skill focus     | 1     | P0       | 3      |
| 9   | Editor form for junior drill metadata                 | 1     | P1       | 3      |
| 10  | Program domain model, API and storage                 | 2     | P0       | 8      |
| 11  | Program list and create-program UI                    | 2     | P0       | 5      |
| 12  | Program week view with themes                         | 2     | P1       | 5      |
| 13  | Attach sessions to program weeks                      | 3     | P1       | 5      |
| 14  | Skill-coverage summary per program                    | 3     | P2       | 3      |
| 15  | Program print and share view                          | 3     | P1       | 3      |
| 16  | Starter drills and program templates                  | 4     | P2       | 5      |
| 17  | ADR: production storage (Airtable vs Supabase)        | 4     | P1       | 2      |

Old `todo/` tasks 009-028 are complete and archived, not migrated (no open work found). Open follow-ups from their results became issues 3 and 4.

---

## 6. Open questions (need product owner answers before the matching issue starts)

1. **Age groups**: which categories and labels does the club use (for example U9, U11, U13...), and do programs target one group or several?
2. **Program shape**: fixed-length blocks (4/8 weeks), full season, or both? Is a week the right unit?
3. **Skill taxonomy**: who defines the skill-focus list, and is it fixed or editable by coordinators?
4. **Roles**: do junior coaches need accounts to create programs, or stay on the existing planner identity model? Are parents/players ever viewers?
5. **Hawks branding**: stay Hawks-branded, or neutral junior-floorball branding?
6. **Existing content**: is the current drill library suitable for juniors, or does it need tagging/curation first? Who does it?

No issue in Phase 2+ should be implemented until questions 1-3 are answered (business logic is not assumed).

---

## 7. Definition of done for this plan

- Phase 0 issues closed; main is green on typecheck, lint, unit and e2e.
- Phase 1-3 issues closed with acceptance criteria checked off.
- `docs/` updated for the data model, API and user journeys.
- Rollback: each phase is additive behind new routes; disabling the program routes returns the app to the plan-001 behavior.
