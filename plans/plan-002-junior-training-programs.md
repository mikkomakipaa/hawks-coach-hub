# Plan-002: Junior Training Program Planning

**Created**: 2026-11-04
**Status**: Draft v2 - scope extended on 2026-11-04 (coach development tool + athlete app, see Part II from section 8). Needs product review.
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

1. **Almost none of the planner/editor work is committed.** It sits in the git index, mixed with agent-tooling files. Last real commits are from the Drive-browser era. This is the top risk.
2. `package.json` `dev` script hardcodes a local service-account path (must not be committed).
3. Airtable is the interim database; the Airtable-to-Postgres (Neon) decision is proposed but not yet recorded as an ADR and affects the new program data model.
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
- ADR: production storage and auth. Proposed: Postgres on Neon with Managed Better Auth; RLS required on every table.

---

## 5. Issue map

> Numbers in the first column are plan-local. GitHub issues are offset by +2 (plan 1 = #3 ... plan 17 = #19). See section 14 for how Part II changes this map.

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
| 17  | ADR: production storage (Neon Postgres + auth)        | 4     | P1       | 2      |

Old `todo/` tasks 009-028 are complete and archived, not migrated (no open work found). Open follow-ups from their results became issues 3 and 4.

---

## 6. Open questions (original list; validated and extended in section 8)

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

---

# Part II - Coaching tool and athlete app (added 2026-11-04)

## 8. Validation of open questions

New input from the product owner: the tool must be usable by **coaches and athletes**. Coaches set targets, record each athlete's current strengths and weaknesses, development goals and other coaching status. Training is planned from these together with the **Hawks material bank** and available **LLM training data**. Athletes see training programs and **log their progress**. Features are built as modules, starting from coaching needs.

This changes several earlier assumptions. Each original question is re-checked below.

| #   | Question         | Status                                         | What changed / what is still needed                                                                                                                                                                                                                                                                                                              |
| --- | ---------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Age groups       | **Still open, more important**                 | Now needed twice: to tag drills and to scope teams and athlete cohorts. Need the club's actual categories and whether an athlete can belong to more than one team (for example a U13 player also training with U15).                                                                                                                             |
| 2   | Program shape    | **Partly informed**                            | Goals with review dates imply a planning loop: season goals, then cycles (blocks), then weeks, then sessions. Week stays the working unit. Block length (4/6/8 weeks) and whether a season is one program or several remain open.                                                                                                                |
| 3   | Skill taxonomy   | **Still open, now critical**                   | It becomes the shared vocabulary for assessments, goals, drill tags, athlete logs and LLM suggestions. Need: who owns it, whether it differs per age group (for example "basic stickhandling" vs "game reading"), and the rating scale (1-5, levels, or descriptors). Recommend a fixed starter set that coordinators can edit.                  |
| 4   | Roles            | **Answered in part, changes the architecture** | Athletes are users: they sign in, see their program and log progress. Roles become `admin` (club), `coach` (team-scoped), `athlete` (own data only). Open: are **guardians** involved for minors (view, consent, accounts), and can an athlete see the coach's assessment of them? The current identity model is not sufficient, see finding F1. |
| 5   | Hawks branding   | **Likely settled, confirm**                    | "Hawks material bank" implies the tool stays Hawks-specific. Treat as Hawks-branded unless told otherwise.                                                                                                                                                                                                                                       |
| 6   | Existing content | **Partly answered**                            | The material bank is the content source (Drive files + structured drills). Still open: how much is junior-suitable, who tags it, and what "LLM training data" actually is (see new questions N5-N7).                                                                                                                                             |

### New open questions

| #   | Question                                                                                                                                                                                                                                                                                                          | Blocks    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| N1  | **Minors and privacy**: what personal data is stored (names, ratings, notes, injuries?), who is the data controller, is guardian consent needed, how long is data kept, can data be exported or erased on request? Confirm Finnish and GDPR requirements with the club or legal before building any athlete data. | M1 onward |
| N2  | **Visibility rules**: which assessment content is coach-only (weaknesses, private notes), which is shared with the athlete, which with guardians?                                                                                                                                                                 | M2, M7    |
| N3  | **Athlete devices and sign-in**: do juniors have accounts (age limits), or sign in through a guardian or a team code?                                                                                                                                                                                             | M0, M7    |
| N4  | **What does an athlete log?** Attendance, session RPE (perceived effort), self-assessment, free notes, personal goal progress, homework drills? Keep it quick: under 30 seconds on a phone.                                                                                                                       | M7        |
| N5  | **What is the "LLM training data"?** Own club documents, a licensed dataset, past session plans, an external model to be fine-tuned? Where does it live and who owns it?                                                                                                                                          | M9        |
| N6  | **LLM provider and data rules**: which model/provider, budget, and the rule that no personal athlete data is sent to it (recommended: only anonymised goals and focus areas).                                                                                                                                     | M9        |
| N7  | **How are LLM outputs trusted?** Recommended: suggestions only, a coach always reviews and edits before anything is saved or shown to athletes. Confirm.                                                                                                                                                          | M9        |
| N8  | **Load and safety rules for juniors**: are there club or federation guidelines on training volume per age that the planner should check or warn about?                                                                                                                                                            | M4, M5    |
| N9  | **Language**: Finnish-first confirmed? Any Swedish or English need for athletes or guardians?                                                                                                                                                                                                                     | M7        |
| N10 | **Scale**: how many teams, coaches and athletes for the first rollout (one team pilot vs whole junior section)? Drives hosting, cost and rollout risk.                                                                                                                                                            | M0        |

No module that touches athlete data starts before N1-N3 have written answers.

## 9. Findings that change the plan

**F1 - Current auth is not real authentication.** `api/_lib/auth/service.js` identifies a planner user from request headers (`x-planner-user-id`, `x-planner-email`, `x-planner-role`) and, by default, falls back to the role the client sends (`allowHeaderRoleFallback`). That is acceptable for a closed editor test, but unusable once athletes and personal data exist. A real identity layer is a prerequisite (module M0).

**F2 - Airtable is the wrong home for personal data about minors.** It has no row-level security. Per-athlete and per-team access control, auditing and erasure need a proper database. Recommendation: move the new modules to **Postgres on Neon with row-level security** (Neon replaces Supabase, the candidate named in plan-001; see section 9a) and keep Airtable only for the existing drill content until it is migrated. This promotes the storage ADR (#19) from P1 to **P0**, and it must come first.

**F3 - The existing planner and drill catalog are reusable.** Sessions, drill blocks, print and share, and the editor stay as the core of the planning module. New modules attach to them rather than replace them.

**F4 - The skill taxonomy is the backbone.** Assessments, goals, drills, logs and LLM suggestions all reference it. Decide and version it early.

### 9a. Storage and auth choice: Neon

Neon is serverless Postgres, so row-level security works exactly as in any Postgres. Reasons it fits this project:

- **Serverless functions**: the API runs on Vercel functions; Neon's serverless driver and pooled connections suit short-lived functions.
- **Auth in the same database**: Neon's Managed Better Auth keeps users, sessions and auth config in the Neon database, and its JWTs work with RLS. Better Auth is also already used in another of the owner's projects.
- **Branching**: a database branch per preview deployment or test run, so migrations and RLS policies can be tried on a copy of the data.
- **Neon Data API** (optional) can expose tables through REST but requires RLS on every table; the existing `api/` routes can instead query Neon directly.

What Neon does not bundle compared with Supabase: file storage and realtime are not needed in M0-M5. Attachments stay in Google Drive or a blob store; revisit if photo or video uploads are wanted.

Open for the ADR: use the Managed Better Auth or another provider; per-request RLS (database role and JWT claims set per request) versus app-level checks backed by RLS; EU region for data residency (N1); and backup and retention policy.

## 10. Product vision and users

A coaching workspace where a junior coach can see where each athlete and the team are, set goals, plan training that targets them, and see whether it worked, while athletes see what is expected of them and record how it went.

| User                             | Needs                                                                                                                      | Main surface                          |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **Coach** (primary)              | Know each athlete's level and gaps, set team and individual targets, plan sessions from the material bank, review progress | Coach workspace (tablet/laptop/phone) |
| **Head of juniors / admin**      | Consistent skill language and programs across teams, access control, content curation                                      | Admin and content views               |
| **Athlete**                      | See upcoming sessions and their own goals, log attendance and effort, see own progress                                     | Athlete app (phone)                   |
| **Guardian** (to confirm, N1/N3) | See schedule, maybe progress summary, give consent                                                                         | Read-only view, later                 |

Design principles:

- **Coach-first and modular**: each module is useful alone and ships separately.
- **Quick capture**: an assessment or a log entry takes seconds, works on a phone, tolerates poor connectivity at the rink.
- **Privacy by design**: collect only what improves training; deny by default; athletes see only their own data.
- **Coach in the loop**: nothing generated by an LLM reaches an athlete without coach approval.
- **Positive framing for juniors**: athlete-facing wording stresses development and next steps, not ranking or deficits.

## 11. Module architecture

Modules are independent vertical slices (data, API routes, UI, docs, tests) behind their own routes, with explicit dependencies. A module can be disabled by removing its route registration, which gives the rollback path.

```text
M0 Foundation: identity, roles, teams, storage
 ├─ M1 Roster: teams, age groups, athletes, coach membership
 │   ├─ M2 Assessment: skills, strengths and weaknesses, coach notes
 │   │   └─ M3 Goals: team and individual targets, review dates
 │   │       └─ M4 Program planning: season, cycle, week themes
 │   │           └─ M5 Session integration: sessions inside the program, attendance
 │   │               ├─ M7 Athlete app: view program, log progress
 │   │               └─ M8 Progress and review: dashboards, goal reviews
 │   └─ (M6 runs in parallel)
 ├─ M6 Material bank: junior-tagged drills, Hawks Drive material linked to skills
 └─ M9 LLM assistant: suggestions from goals + material bank (needs M3, M6; optional for M4/M5)
```

### M0 - Foundation (P0, blocks everything)

- **Purpose**: trustworthy identity and a safe place to store personal data.
- **Scope**: real authentication (provider to choose in ADR), roles `admin`/`coach`/`athlete`, team-scoped authorization, Postgres with row-level security, audit log for reads and writes of athlete data, migration path for existing planner profiles.
- **Replaces**: header-based identity (F1).
- **Depends on**: ADR on storage and auth; answers to N1, N3, N10.
- **Done when**: a coach can only read their own teams' data (tested with RLS policies and negative tests); an athlete can only read their own rows; the old header fallback is removed from write routes.

### M1 - Roster (P0)

- **Purpose**: who is in which team.
- **Capabilities**: create team (name, age group, season), add and remove athletes, assign coaches, invite athlete or guardian, archive a season.
- **Data**: Team, AgeGroup, Athlete, Membership.
- **MVP slice**: one coach, one team, ten athletes, entered manually.

### M2 - Assessment and athlete profile (P0, the first real coaching feature)

- **Purpose**: record current level, strengths and weaknesses per athlete and for the team.
- **Capabilities**: rate skills from the taxonomy on the agreed scale, mark strengths and development areas, add dated coach observations, view a profile with history, team overview (heat map of skill averages), coach-only notes.
- **Data**: SkillCategory, Skill, Assessment (athlete, skill, level, date, assessor), Observation (note, date, visibility).
- **Rules**: assessment history is kept, never overwritten; visibility is per field (N2).
- **MVP slice**: fixed starter taxonomy, 1-5 scale, quick entry screen per athlete.

### M3 - Goals and targets (P0)

- **Purpose**: turn assessments into targets.
- **Capabilities**: team season goals; individual development goals linked to skills; measurable target (skill from level X to Y, or a custom measure), deadline, review date, status (active, achieved, dropped), suggested goals from the weakest skills.
- **Data**: Goal (scope team/athlete, skill, target, baseline, due date, status), GoalReview.
- **MVP slice**: individual goals with a target level and a review date.

### M4 - Program planning (P0/P1, evolves existing issues #12-#14)

- **Purpose**: plan the season, cycles and weeks around the goals.
- **Capabilities**: program per team and season; cycles/blocks with focus skills taken from team goals; weeks with theme and target focus; copy from a template or previous season; load indicators (sessions per week, minutes).
- **Data**: Program, Cycle, Week (theme, focus skills, goal links).
- **Rules**: age-appropriate volume checks once N8 is answered.

### M5 - Session integration and attendance (P1)

- **Purpose**: sessions live in the program and track what actually happened.
- **Capabilities**: create a session from a week (prefilled with focus), existing session builder and drill blocks, plan vs actual (what was run, changes), attendance per session, session notes.
- **Data**: extends Session (week link, status planned/done), Attendance.
- **Reuses**: the planner from plan-001.

### M6 - Material bank and junior drill library (P0, parallel track)

- **Purpose**: make Hawks material findable by skill and age group.
- **Capabilities**: junior metadata on drills (age range, skill tags from the taxonomy, group size, equipment, space, intensity, coaching points), skill and age filters in the catalog, link Drive material to drills and skills, import review flow for tagging legacy files, coverage report (skills with no drills).
- **Data**: extends Drill (existing issues #9-#11 and #18 live here), DriveMaterialLink.
- **Note**: this is also the grounding source for M9.

### M7 - Athlete app (P1, first athlete-facing module)

- **Purpose**: athletes see what is expected and log how it went.
- **Capabilities**: my next sessions and this week's focus, my goals and progress (visibility per N2), quick log after a session (attended, effort rating, short note, goal progress), optional homework items from the coach, installable on the phone, works offline and syncs later.
- **Data**: AthleteLog (session, athlete, attended, RPE, note), GoalProgressEntry.
- **Rules**: athletes only write their own logs; wording follows the positive-framing principle.
- **MVP slice**: view the week and log attendance plus effort in two taps.

### M8 - Progress and review (P1/P2)

- **Purpose**: close the loop: did the training move the numbers?
- **Capabilities**: goal progress per athlete and team, reassessment prompts at review dates, attendance and effort trends, session load per week, review notes feeding the next cycle, print or share summary for athlete or guardian review conversations.
- **Data**: derived views over Assessment, Goal, AthleteLog, Attendance; GoalReview.

### M9 - LLM planning assistant (P2, behind a feature flag)

- **Purpose**: help coaches plan faster from goals and the material bank.
- **Capabilities**: suggest a week or session outline for given focus skills and age group; propose drills from the material bank for a gap; draft a cycle plan from team goals; explain why a drill fits.
- **Design (retrieval first)**:
  - Ground answers in the material bank by retrieval (search over drills and linked Drive documents); fine-tuning only if N5 shows a real need.
  - Inputs are anonymised: age group, skill focus, level bands, constraints. **No athlete names or notes are sent to the model.**
  - Outputs are drafts: a coach edits and approves before they become sessions or program entries; every output records its sources.
  - Server-side calls only, with rate limits, cost cap, logging of prompts and outputs without personal data, and an evaluation set of example requests with expected qualities.
  - Provider is a pluggable adapter; default to the current Claude models when the provider is chosen (N6).
- **Depends on**: M3, M6 and the skill taxonomy; optional for M4-M5.

### Cross-cutting concerns (apply to every module)

| Concern                  | Rule                                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Authorization            | Deny by default; team-scoped coach access; athlete own-data only; tested with negative cases                                 |
| Privacy                  | Data minimisation, retention and erasure per N1; no personal data in logs or LLM prompts                                     |
| Audit                    | Log who read or changed athlete assessments and goals                                                                        |
| Versioning               | Optimistic locking (`version` field, 409 on conflict) on all editable records                                                |
| Offline and speed        | Quick-capture screens usable on a weak connection; draft recovery as in the session planner                                  |
| i18n                     | Finnish-first; copy in one place for later languages (N9)                                                                    |
| Accessibility and mobile | 375px, 48px targets, keyboard and screen reader support, dark mode                                                           |
| Testing                  | Unit tests for domain logic and authorization, API tests for validation and errors, one happy and one failure e2e per module |
| Docs                     | Each module updates `docs/DATA_MODEL.md`, a module doc under `docs/`, and `docs/USER_JOURNEYS.md`                            |

## 12. Domain model sketch (to be finalised in M0-M3 design issues)

| Entity                 | Key fields                                                      | Belongs to |
| ---------------------- | --------------------------------------------------------------- | ---------- |
| Team                   | name, age group, season, club                                   | M1         |
| Athlete                | name or alias, birth year, status                               | M1         |
| Membership             | person, team, role (coach/athlete), period                      | M1         |
| Skill / SkillCategory  | name, description, level descriptors, taxonomy version          | M2         |
| Assessment             | athlete, skill, level, date, assessor, note                     | M2         |
| Observation            | athlete, text, date, visibility                                 | M2         |
| Goal                   | scope (team/athlete), skill, baseline, target, due date, status | M3         |
| GoalReview             | goal, date, result, note                                        | M3, M8     |
| Program / Cycle / Week | team, season, theme, focus skills, goal links                   | M4         |
| Session (extended)     | week, drill blocks, planned/actual, notes                       | M5         |
| Attendance             | session, athlete, status                                        | M5         |
| Drill (extended)       | skill tags, age range, junior metadata                          | M6         |
| AthleteLog             | session, athlete, attended, effort, note                        | M7         |

Birth year or age band is stored instead of full birth date unless N1 says otherwise.

## 13. Phasing (replaces the Phase 1-4 order for new work)

Phase 0 (baseline) is unchanged and still comes first.

| Phase          | Modules                     | Outcome                                                                        | Gate                                             |
| -------------- | --------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------ |
| A - Foundation | M0, M1                      | Real sign-in, teams, roster, safe storage                                      | ADR accepted; N1, N3, N10 answered               |
| B - Coach core | M2, M3, M6 (tagging starts) | Coach records strengths and weaknesses and sets goals; drills carry skill tags | Taxonomy and scale agreed (Q3); N2 answered      |
| C - Planning   | M4, M5                      | Program and sessions linked to goals; attendance                               | Q2 answered; N8 if load checks wanted            |
| D - Athlete    | M7                          | Athletes see their program and log progress                                    | Visibility rules (N2) and guardian decision (N1) |
| E - Review     | M8                          | Goal reviews and progress dashboards                                           | Enough logged data from phases B-D               |
| F - Assistant  | M9                          | LLM suggestions with coach approval                                            | N5-N7 answered; M6 content tagged                |

Pilot first: one team, from Phase A through C, before athletes are invited.

## 14. Impact on the existing issue map

Issues #3-#19 were created before this extension and have **not been changed**. Proposed handling, to be confirmed:

| Existing issue                                                   | Proposal                                                        |
| ---------------------------------------------------------------- | --------------------------------------------------------------- |
| #3-#7 (Phase 0 hygiene, #5 lint is done in code)                 | Keep                                                            |
| #8 personas and journeys                                         | Keep, expand to athletes and guardians (this plan's section 10) |
| #9 drill junior metadata, #10 catalog filters, #11 editor fields | Keep, move under M6; use the agreed taxonomy                    |
| #12 program model/API, #13 program list UI, #14 week view        | Keep, move under M4; depend on M1-M3                            |
| #15 attach sessions to weeks, #17 print/share program            | Keep, move under M5/M8                                          |
| #16 skill coverage summary                                       | Move under M6 (material coverage)                               |
| #18 starter drills and templates                                 | Keep, under M6                                                  |
| #19 ADR storage                                                  | **Raise to P0**, widen to storage plus authentication (F1, F2)  |

New issues needed (not created yet): M0 auth and RLS foundation, M1 roster, M2 assessment, M3 goals, M5 attendance, M7 athlete app, M8 review, M9 assistant, and a design issue for the skill taxonomy. These should be drafted after the open questions in section 8 are answered, so acceptance criteria are not invented.

## 15. Risks

| Risk                                                        | Impact | Mitigation                                                            |
| ----------------------------------------------------------- | ------ | --------------------------------------------------------------------- |
| Personal data of minors handled without a clear legal basis | High   | Answer N1 first; data minimisation; RLS and audit from day one        |
| Header-based auth reused for athletes                       | High   | M0 before any athlete data; remove header role fallback               |
| Scope too large for a volunteer-run club                    | High   | Strict module gates; pilot with one team; each module shippable alone |
| Coaches find assessment too slow                            | Medium | Quick-entry screens, defaults, test with a real coach in Phase B      |
| Taxonomy disputes delay everything                          | Medium | Ship a fixed starter set, versioned, editable later                   |
| LLM output of poor quality or unsafe for juniors            | Medium | Retrieval from approved material, coach approval, evaluation set      |
| Airtable-to-Postgres migration cost                         | Medium | New modules start on Postgres; migrate drills in M6                   |
| Athlete labels harm motivation                              | Medium | Positive framing, visibility rules (N2), coach-only notes             |

## 16. Next steps

1. Product owner answers or deprioritises the questions in sections 6 and 8 (blocking ones first: N1, N2, N3, Q3, N10).
2. Decide the issue-map changes in section 14; then create the new issues.
3. Write the storage and authentication ADR (#19, now P0) and spike a Neon (Managed Better Auth + RLS) proof for team-scoped reads.
4. Draft the skill taxonomy and rating scale with a coach (input to M2 and M6).
5. Prototype the M2 quick-entry screen with a real coach before building the rest of the module.
