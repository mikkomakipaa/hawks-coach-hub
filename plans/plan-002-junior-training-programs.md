# Plan-002: Junior Training Program Planning

**Created**: 2026-11-04
**Status**: Draft v3 - organised in three milestones: **MS1 Coach**, **MS2 Junior head**, **MS3 Athlete and guardian** (section 13; decisions in Part III). Sections 1-16 aligned to the milestones on 2026-11-05. Expert review (architect, UX, security, coach) consolidated in `plan-002-expert-review.md`; outcomes in Part IV. Needs product review.
**Scope decision (2026-11-04)**: Floorball juniors only. Keep the current floorball model; shift content and UX to junior age groups and add season/program planning on top of sessions.
**Tracking**: GitHub Issues, epic label `epic:junior-programs`. This plan is the narrative; the issues are the source of truth for task status.
**Builds on**: [plan-001](./plan-001-training-session-planner.md) (session planner + editor CMS)

---

## 1. Where we are (progress audit, 2026-11-04; updated 2026-11-05)

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
| `npm run lint`      | Pass (was 61 errors; fixed 2026-11-05, commit hook enforces it)                                     |
| `npm run test:e2e`  | **Not verified**: task results say sandbox blocked `vite preview`; needs a run on a real machine/CI |
| `npm audit`         | 7 findings left (minimatch ReDoS via eslint tooling)                                                |

### Risks found

1. ~~Planner/editor work was uncommitted~~ - resolved 2026-11-05: committed in logical commits and pushed.
2. `package.json` `dev` script hardcodes a local service-account path (must not be committed).
3. Airtable is the interim database; the Airtable-to-Postgres (Neon) decision is proposed but not yet recorded as an ADR and affects the new program data model.
4. Product copy, personas and journeys still describe a single senior team (Hawks Helsinki), not junior programs.
5. e2e has not been verified in CI, so regressions can slip in during the pivot (lint is now clean).

---

## 2. Goal

Give junior floorball teams a coaching tool: coaches set targets and record where the team stands, plan training programs and sessions from the Hawks material bank (with LLM assistance later), and, at the end, athletes see the program and log progress. Built in modules, coach needs first.

Target users, in priority order (see `docs/USE_CASES.md`):

- **Coach (MS1)**: junior team head or assistant coach, often a volunteer with limited time. Needs a ready structure and quick capture.
- **Junior head / admin (MS2)**: wants consistent skills language, access and material across teams.
- **Athlete and guardian (MS3)**: athletes see their program and log progress; guardian role to be confirmed.

### Success metrics (MS1 unless noted)

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

## 4. Phases and milestones

Work is sequenced as Phase 0 followed by three milestones. Section 13 has the full table; this is the short form.

### Phase 0 - Baseline and hygiene (P0, blocks everything)

Goal: a clean, committed, CI-green starting point.

- Commit the planner/editor work in logical commits, separate from tooling files (done).
- Remove the hardcoded key path from `package.json`; document `.env` usage.
- Lint to zero errors (done in code), run e2e in CI, resolve remaining `npm audit` findings.
- Update docs and `AGENTS.md` for the GitHub-issues workflow (done).

### MS1 - Coach

One blank team with no players; team-level coaching functions. No personal data about minors.

- **1a Foundation**: real sign-in, roles, team-scoped access, storage ADR (Neon proposed), blank team.
- **1b Coaching core**: team assessment and observations, team goals, junior metadata on drills (age group, skill tags) with catalog filters and editor fields.
- **1c Planning**: program, cycles and weeks; sessions attached to weeks; team-level session record; program print/share.
- **1d Assistant**: LLM planning assistant, last, may slip without blocking the milestone.

### MS2 - Junior head

Taxonomy editor, coach management, material curation, program templates per age group, cross-team views and skill coverage, season rollover.

### MS3 - Athlete and guardian

Roster and all data about named athletes (athlete-level assessment and goals, per-athlete attendance, individual review, data export and erasure), the athlete app, and the guardian view. Gated by the privacy questions N1-N4.

---

## 5. Issue map

Created in GitHub (epic label `epic:junior-programs`). Numbers are the GitHub issue numbers. Priority labels are as created; the milestone column is the placement under this plan. Estimates follow the playbook scale. GitHub milestones are not created yet.

| Issue | Title                                                  | Milestone / stage                                  | Priority label   | Points |
| ----- | ------------------------------------------------------ | -------------------------------------------------- | ---------------- | ------ |
| #3    | Commit planner/editor work in logical commits          | Phase 0 (done)                                     | P0               | 3      |
| #4    | Remove hardcoded service-account path from dev script  | Phase 0                                            | P0               | 1      |
| #5    | Get lint to zero errors                                | Phase 0 (done in code)                             | P0               | 5      |
| #6    | Run Playwright e2e in CI and fix failures              | Phase 0                                            | P0               | 5      |
| #7    | Fix remaining npm audit findings (minimatch)           | Phase 0                                            | P1               | 2      |
| #8    | Update personas and journeys for junior coaches        | MS1 prep (docs)                                    | P1               | 3      |
| #19   | ADR: production storage and auth (Neon Postgres + RLS) | MS1 1a                                             | P1 (proposed P0) | 3      |
| #9    | Add junior metadata to Drill model and API             | MS1 1b                                             | P0               | 5      |
| #10   | Filter drill catalog by age group and skill focus      | MS1 1b                                             | P0               | 3      |
| #11   | Editor form for junior drill metadata                  | MS1 1b                                             | P1               | 3      |
| #12   | Program domain model, API and storage                  | MS1 1c                                             | P0               | 8      |
| #13   | Program list and create-program UI                     | MS1 1c                                             | P0               | 5      |
| #14   | Program week view with themes                          | MS1 1c                                             | P1               | 5      |
| #15   | Attach sessions to program weeks                       | MS1 1c                                             | P1               | 5      |
| #17   | Program print and share view                           | MS1 1c                                             | P1               | 3      |
| #16   | Skill-coverage summary per program                     | MS2                                                | P2               | 3      |
| #18   | Starter drills and program templates for juniors       | Starter drills MS1 1b; templates per age group MS2 | P2               | 5      |

## 6. Open questions (original list; validated and extended in section 8)

1. **Age groups**: which categories and labels does the club use (for example U9, U11, U13...), and do programs target one group or several?
2. **Program shape**: fixed-length blocks (4/8 weeks), full season, or both? Is a week the right unit?
3. **Skill taxonomy**: who defines the skill-focus list, and is it fixed or editable by coordinators?
4. **Roles**: do junior coaches need accounts to create programs, or stay on the existing planner identity model? Are parents/players ever viewers?
5. **Hawks branding**: stay Hawks-branded, or neutral junior-floorball branding?
6. **Existing content**: is the current drill library suitable for juniors, or does it need tagging/curation first? Who does it?

No MS1 stage 1b-1c issue should be implemented until questions 1-3 are answered (business logic is not assumed).

---

## 7. Definition of done for this plan

- Phase 0 issues closed; main is green on typecheck, lint, unit and e2e.
- Each milestone is done when its stages are shipped, their issues are closed with acceptance criteria checked off, and the MS1 pilot (one coach, one team) has used it.
- `docs/` updated for the data model, API, use cases and user journeys at each milestone.
- Rollback: every milestone is additive behind new routes; disabling a module's routes returns the app to the previous state.

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
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------ |
| N1  | **Minors and privacy**: what personal data is stored (names, ratings, notes, injuries?), who is the data controller, is guardian consent needed, how long is data kept, can data be exported or erased on request? Confirm Finnish and GDPR requirements with the club or legal before building any athlete data. | M1 onward | Name, rating, notes                                                |
| N2  | **Visibility rules**: which assessment content is coach-only (weaknesses, private notes), which is shared with the athlete, which with guardians?                                                                                                                                                                 | M2, M7    | All shared with athletes and guardians                             |
| N3  | **Athlete devices and sign-in**: do juniors have accounts (age limits), or sign in through a guardian or a team code?                                                                                                                                                                                             | M0, M7    | 8-50 years range                                                   |
| N4  | **What does an athlete log?** Attendance, session RPE (perceived effort), self-assessment, free notes, personal goal progress, homework drills? Keep it quick: under 30 seconds on a phone.                                                                                                                       | M7        | Yes                                                                |
| N5  | **What is the "LLM training data"?** Own club documents, a licensed dataset, past session plans, an external model to be fine-tuned? Where does it live and who owns it?                                                                                                                                          | M9        | Google Drive now, database in future                               |
| N6  | **LLM provider and data rules**: which model/provider, budget, and the rule that no personal athlete data is sent to it (recommended: only anonymised goals and focus areas).                                                                                                                                     | M9        | Anonymized common data, never single athlete data.                 |
| N7  | **How are LLM outputs trusted?** Recommended: suggestions only, a coach always reviews and edits before anything is saved or shown to athletes. Confirm.                                                                                                                                                          | M9        | Suggestions only                                                   |
| N8  | **Load and safety rules for juniors**: are there club or federation guidelines on training volume per age that the planner should check or warn about?                                                                                                                                                            | M4, M5    | Yes, to be included and part of age group specific plans from Team |
| N9  | **Language**: Finnish-first confirmed? Any Swedish or English need for athletes or guardians?                                                                                                                                                                                                                     | M7        | Finnish first, english needed                                      |
| N10 | **Scale**: how many teams, coaches and athletes for the first rollout (one team pilot vs whole junior section)? Drives hosting, cost and rollout risk.                                                                                                                                                            | M0        | Just one team pilot                                                |

No module that touches athlete data starts before N1-N3 have written answers. Under Part III this means Milestone 3; N5-N7 gate stage 1

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

ADR requirements added by the expert review (2026-11-05):

- **Authorization**: proposed model is app-level authorization in one policy module (routes never query by raw team id), with RLS as defence in depth on team-scoped tables.
- **RLS mechanics**: tenant key `team_id` on every domain table and a membership table `(user_id, team_id, role)` as the only source of policy; a non-owner, non-`BYPASSRLS` application role; `FORCE ROW LEVEL SECURITY`; the user id set with `SET LOCAL` inside a transaction (never a session-level `SET` over a pooled connection); views with `security_invoker`; no `SECURITY DEFINER` shortcuts; cross-tenant negative tests in CI against a Neon branch; an automated "no table without RLS" check.
- **Secrets**: separate pooled runtime URL and direct migration URL; the owner role is used only by migrations.
- **Neon Data API**: not used. All access goes through `api/` routes, so there is one authorization surface.
- **Auth spike exit criteria** (time-boxed): sign-in, invite, session revocation, token verified in a Vercel function, cookie behaviour with the hash-routed SPA, and a Finnish email sender. Named fallback: Better Auth self-hosted on the same database, or Auth.js. The auth user table stays separate from the domain coach profile.
- **Migration**: drills move to Postgres before junior skill tags are added, with an idempotent script keyed on the Airtable record id (`legacy_id`); `slug` and ids stay stable because share links and `GET /api/drills/:idOrSlug` are public; dual-read behind a flag, then cut over with Airtable kept read-only for one release; sessions gain `owner_user_id` and a nullable `team_id` so legacy sessions survive.
- **Environments**: Neon branch per pull request with seeded fixtures only (schema and starter taxonomy), never a copy of production data; one migration tool chosen in the ADR; EU region fixed now; point-in-time-restore window and a restore drill before MS3.

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

Milestone placement (Part III): M0, M1 (blank team), M2 and M3 at team level, M4, M5, M6 tagging and search, and M9 are in **MS1**. M6 curation and admin tools are **MS2**. Roster, athlete-level M2/M3, per-athlete attendance, M7, M8 individual review and guardian features are **MS3**. Priority tags in the module headings below are replaced by the milestone shown in each heading.

```text
MS1 Coach
M0 Foundation: sign-in, roles, team-scoped access, storage
 ├─ M1 Team (blank, no players)
 │   ├─ M2 Team assessment: skills, strengths and weaknesses, team notes
 │   │   └─ M3 Team goals: targets, review dates
 │   │       └─ M4 Program planning: season, cycle, week themes
 │   │           └─ M5 Sessions in the program, team-level session record
 │   └─ (M6 runs in parallel)
 ├─ M6 Material bank: junior-tagged drills, Hawks Drive material linked to skills
 └─ M9 LLM assistant (stage 1d): suggestions from goals + material bank

MS2 Junior head
 taxonomy editor, coach management, M6 curation, templates, cross-team views, rollover

MS3 Athlete and guardian
 M1 roster ─ athlete-level M2 and M3 ─ per-athlete attendance ─ M8 individual review
 M7 Athlete app (view program, log progress) ─ guardian view
```

### M0 - Foundation (MS1, blocks everything)

- **Purpose**: trustworthy identity and a safe place to store personal data.
- **Scope**: real authentication (provider to choose in ADR), roles `admin`/`coach`/`athlete`, team-scoped authorization, Postgres with row-level security, audit log for reads and writes of athlete data, migration path for existing planner profiles.
- **Replaces**: header-based identity (F1).
- **Depends on**: ADR on storage and auth; answers to N1, N3, N10.
- **Done when**: a coach can only read their own teams' data (tested with RLS policies and negative tests); an athlete can only read their own rows; the old header fallback is removed from write routes.

### M1 - Team and roster (blank team in MS1, roster in MS3)

- **Purpose**: who is in which team.
- **Capabilities**: create team (name, age group, season), add and remove athletes, assign coaches, invite athlete or guardian, archive a season.
- **Data**: Team, AgeGroup, Athlete, Membership.
- **MS1 slice**: one coach creates one blank team; no athletes are stored.
- **MS3 slice**: one team, ten athletes, entered manually.

### M2 - Assessment (team level in MS1, athlete profile in MS3)

- **Purpose**: record current level, strengths and weaknesses per athlete and for the team.
- **Capabilities**: rate skills from the taxonomy on the agreed scale, mark strengths and development areas, add dated coach observations, view a profile with history, team overview (heat map of skill averages), coach-only notes.
- **Data**: SkillCategory, Skill, Assessment (athlete, skill, level, date, assessor), Observation (note, date, visibility).
- **Rules**: assessment history is kept, never overwritten; visibility is per field (N2).
- **MS1 slice**: fixed starter taxonomy (about 8-12 skills shown per age band, descriptor scale with "not assessed", one category per screen), quick entry screen for the team. Starter taxonomy and scale are proposals in `plan-002-expert-review.md` section 5; the scale and age bands are open (Q3). Assessment is done 2-3 times per season, tied to review dates; results are shown as strengths and next development areas (at most three each), with change since last time instead of ranking.
- **MS3 slice**: the same entry per athlete.

### M3 - Goals and targets (team goals in MS1, individual goals in MS3)

- **Purpose**: turn assessments into targets.
- **Capabilities**: team season goals; individual development goals linked to skills; measurable target (skill from level X to Y, or a custom measure), deadline, review date, status (active, achieved, dropped), suggested goals from the weakest skills.
- **Data**: Goal (scope team/athlete, skill, target, baseline, due date, status), GoalReview.
- **MS1 slice**: team goals with a target level and a review date.
- **MS3 slice**: individual goals.

### M4 - Program planning (MS1, evolves existing issues #12-#14)

- **Purpose**: plan the season, cycles and weeks around the goals.
- **Capabilities**: program per team and season; cycles/blocks with focus skills taken from team goals; weeks with theme and target focus; copy from a template or previous season; load indicators (sessions per week, minutes).
- **Data**: Program, Cycle, Week (theme, focus skills, goal links).
- **Rules**: age-appropriate volume checks once N8 is answered.

### M5 - Session integration and attendance (MS1; per-athlete attendance in MS3)

- **Purpose**: sessions live in the program and track what actually happened.
- **Capabilities**: create a session from a week (prefilled with focus), existing session builder and drill blocks, plan vs actual (what was run, changes), attendance per session, session notes.
- **Data**: extends Session (week link, status planned/done), Attendance.
- **Reuses**: the planner from plan-001.

### M6 - Material bank and junior drill library (MS1 tagging and search, MS2 curation)

- **Purpose**: make Hawks material findable by skill and age group.
- **Capabilities**: junior metadata on drills (age range, skill tags from the taxonomy, group size, equipment, space, intensity, coaching points), skill and age filters in the catalog, link Drive material to drills and skills, import review flow for tagging legacy files, coverage report (skills with no drills).
- **Data**: extends Drill (existing issues #9-#11 and #18 live here), DriveMaterialLink.
- **Note**: this is also the grounding source for M9.

### M7 - Athlete app (MS3, last priority)

- **Purpose**: athletes see what is expected and log how it went.
- **Capabilities**: my next sessions and this week's focus, my goals and progress (visibility per N2), quick log after a session (attended, effort rating, short note, goal progress), optional homework items from the coach, installable on the phone, works offline and syncs later.
- **Data**: AthleteLog (session, athlete, attended, RPE, note), GoalProgressEntry.
- **Rules**: athletes only write their own logs; wording follows the positive-framing principle.
- **MS3 slice**: view the week and log attendance plus effort in two taps.

### M8 - Progress and review (team goals in MS1, athlete review in MS3)

- **Purpose**: close the loop: did the training move the numbers?
- **Capabilities**: goal progress per athlete and team, reassessment prompts at review dates, attendance and effort trends, session load per week, review notes feeding the next cycle, print or share summary for athlete or guardian review conversations.
- **Data**: derived views over Assessment, Goal, AthleteLog, Attendance; GoalReview.

### M9 - LLM planning assistant (MS1 stage 1d, behind a feature flag)

- **Purpose**: help coaches plan faster from goals and the material bank.
- **Capabilities**: suggest a week or session outline for given focus skills and age group; propose drills from the material bank for a gap; draft a cycle plan from team goals; explain why a drill fits.
- **Design (retrieval first)**:
  - Ground answers in the material bank by retrieval (search over drills and linked Drive documents); fine-tuning only if N5 shows a real need.
  - Inputs are anonymised: age group, skill focus, level bands, constraints. **No athlete names or notes are sent to the model.**
  - Outputs are drafts: a coach edits and approves before they become sessions or program entries; every output records its sources.
  - Server-side calls only, with rate limits, cost cap, logging of prompts and outputs without personal data, and an evaluation set of example requests with expected qualities.
  - Provider is a pluggable adapter; default to the current Claude models when the provider is chosen (N6).
- **Depends on**: M3, M6 and the skill taxonomy; optional for M4-M5.

**LLM do-not list (from the coach and security reviews).** The assistant may draft a week or session from focus skills and age band, suggest alternatives given equipment, space and group size, produce a progression or regression of an existing drill, summarise team session notes into a cycle review, and draft parent messages for the coach to edit. It must not: set or recommend individual training loads, give injury, rehabilitation, nutrition or body advice, prescribe conditioning for young age bands, advise on selection or ranking, assess a child, or invent drills that are not in the bank. Every suggestion cites its source drill ids and is labelled "from the bank" or "generated"; the age-band filter is mandatory in retrieval; retrieved content is treated as untrusted data; output is validated against a schema and sanitised; the evaluation set includes bad requests (for example a 90-minute fitness session for under-9s) and prompt-injection cases.

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

Changes from the expert review (2026-11-05):

- **One shape for team and athlete level.** `assessment(subject_type, subject_id, skill_stable_key, taxonomy_version, level, assessed_on, assessor_id)` and `goal(scope/subject_type, subject_id, ...)`. A database constraint or feature gate rejects `athlete` rows until MS3, so MS3 is additive.
- **Versioned taxonomy.** `taxonomy_version(id, published_at)` and `skill(id, stable_key, version_id, ...)`; assessments, goals and drill tags reference the stable key plus the version in force; the rating scale and descriptors live per version. The MS1 seed ships as v1, one set per age band.
- **Session ownership.** `Session.owner_user_id`, `team_id` (nullable), `week_id` (nullable), `planned_for` date. Who owns a session when the coach leaves is open (N11).
- **Program structure.** Week is `(program_id, ordinal, starts_on nullable)`; cycles are an optional grouping with types (pre-season, season, tournament block, break, off-season); a cycle with no sessions is valid. Whether a season is one program or several is open (Q2).
- **Audit**: write-audit (`audit_event`) from MS1 for team, program, role and auth changes; read-audit only from MS3.

## 13. Milestones and stages

Phase 0 (baseline) comes first. Then three milestones, in this order:

| Milestone                      | Focus                                                                | Stages                                                                                                                                                                                                                                                                                                                                                                           | Outcome                                                                                                                                    | Gate                                                                                                                                                          |
| ------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MS1 - Coach**                | Coach settings and team-level coaching functions. No player data.    | 1a Foundation: M0 sign-in, roles, team-scoped access, storage; M1 blank team. 1b Coaching core: M2 team assessment and observations, M3 team goals, M6 junior tags and drill search. 1c Planning: M4 program, cycles, weeks; M5 sessions from the week and a team-level session record. 1d Assistant: M9 LLM planning assistant (last, can slip without blocking the milestone). | One coach and one team can assess the team, set goals, plan a program and sessions, and find drills by skill and age. Pilot with one team. | 1a: storage and auth ADR accepted, N10 answered. 1b: Q1 age groups, Q3 starter taxonomy and scale. 1c: Q2 program shape; N8 if load checks wanted. 1d: N5-N7. |
| **MS2 - Junior head**          | Club-level coordination                                              | Taxonomy editor, coach management, material curation (M6 admin side), program templates per age group, cross-team views and coverage, season rollover                                                                                                                                                                                                                            | Consistent skills language, access and content across teams                                                                                | MS1 in real use                                                                                                                                               |
| **MS3 - Athlete and guardian** | All data about named athletes, and the athlete and guardian surfaces | 3a Athlete data: M1 roster, athlete-level M2 and M3, per-athlete attendance, M8 individual review, data export and erasure. 3b Athlete app: M7 view the program and log progress. 3c Guardian: schedule view, consent and data access                                                                                                                                            | Individual development tracked; athletes see their program and log progress                                                                | N1 privacy, N2 visibility, N3 sign-in, N4 logging, guardian decision                                                                                          |

The pilot is MS1 with one coach and one team. Athlete data is not introduced before MS3.

## 14. Issue map by milestone

Issues #3-#19 predate the milestones and have **not been changed** in GitHub. Placement is in section 5. Proposed handling, to be confirmed:

| Existing issue                                                   | Proposal                                                                            |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| #3-#7 (Phase 0 hygiene; #5 lint is done in code)                 | Keep                                                                                |
| #8 personas and journeys                                         | Keep, expand to the three milestones' user groups (section 10, `docs/USE_CASES.md`) |
| #9 drill junior metadata, #10 catalog filters, #11 editor fields | Keep, MS1 1b (M6); use the agreed taxonomy                                          |
| #12 program model/API, #13 program list UI, #14 week view        | Keep, MS1 1c (M4); depend on the blank team and team goals                          |
| #15 attach sessions to weeks, #17 print/share program            | Keep, MS1 1c (M5)                                                                   |
| #16 skill coverage summary                                       | Move to MS2 (cross-team coverage)                                                   |
| #18 starter drills and templates                                 | Split: starter drills MS1 1b, templates per age group MS2                           |
| #19 ADR storage                                                  | **Raise to P0**, MS1 1a, widened to storage plus authentication (F1, F2)            |

New issues needed (not created yet), by milestone:

- **MS1**: M0 authentication and team-scoped access with RLS, M1 blank team, skill taxonomy design (starter set, scale), M2 team assessment, M3 team goals, M5 team-level session record, M9 assistant (1d).
- **MS2**: taxonomy editor, coach management, material curation, cross-team view, season rollover.
- **MS3**: M1 roster, athlete-level assessment and goals, per-athlete attendance, M7 athlete app, M8 individual review, guardian view, data export and erasure.

Draft the MS1 issues after the use cases in `docs/USE_CASES.md` are accepted, so acceptance criteria are not invented. Do not create MS3 issues yet.

## 15. Risks

| Risk                                                        | Impact   | Mitigation                                                                                       |
| ----------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| Personal data of minors handled without a clear legal basis | High     | Answer N1 first; data minimisation; RLS and audit from day one                                   |
| Header-based auth reused for coaching or athlete data       | High     | M0 in stage 1a before any new data; remove header role fallback                                  |
| Scope too large for a volunteer-run club                    | High     | Strict module gates; pilot with one team; each module shippable alone                            |
| Coaches find assessment too slow                            | Medium   | Quick-entry screens, defaults, test with a real coach in stage 1b                                |
| Taxonomy disputes delay everything                          | Medium   | Ship a fixed starter set, versioned, editable later                                              |
| LLM output of poor quality or unsafe for juniors            | Medium   | Retrieval from approved material, coach approval, evaluation set                                 |
| Airtable-to-Postgres migration cost                         | Medium   | New modules start on Postgres; migrate drills in M6                                              |
| Athlete labels harm motivation                              | Medium   | Positive framing, visibility rules (N2), coach-only notes                                        |
| Spoofable planner identity reaches coaching data            | Critical | Hard gate before stage 1a; forged-header test; see expert review section 3                       |
| Free-text notes hold names or health information in MS1     | High     | Field warning, exclusion from LLM prompts, N12 decision                                          |
| MS1 scope too large for one volunteer club                  | High     | Program planning does not require goals; offline limited to draft-and-retry; read-audit deferred |
| Relative-age and labelling bias in athlete ratings (MS3)    | High     | No rankings or sorted lists; compare to own previous rating; birth quarter shown to coach        |
| LLM suggests unsuitable load or invents drills              | High     | Do-not list, mandatory age filter, citations, evaluation set                                     |

## 16. Next steps

1. Product owner reviews `docs/USE_CASES.md` and answers the questions blocking MS1 first: Q1 (age groups), Q3 (starter taxonomy and scale), N10 (scale of the first rollout); then Q2 and, for stage 1d, N5-N7. MS3 questions (N1-N4, guardian) can wait.
2. Decide the issue-map changes in section 14, create the three GitHub milestones, then draft the MS1 issues.
3. Write the storage and authentication ADR (#19, proposed P0) and spike a Neon (Managed Better Auth + RLS) proof for team-scoped reads.
4. Draft the starter skill taxonomy and rating scale with a coach (input to M2 and M6).
5. Prototype the M2 team assessment quick-entry screen with a real coach before building the rest of MS1.
6. Product owner decides the review proposals in Part IV and answers the new questions N11-N20 (`plan-002-expert-review.md` section 7).
7. Add the pre-1a hard-gate work (identity, headers, rate limiting, CI checks) as issues once the plan is accepted.

---

# Part III - Product owner decisions (2026-11-05)

These come from the review of `docs/USE_CASES.md` and remain the record of the decisions. Sections 1-16 were aligned to them on 2026-11-05; if anything still conflicts, **this part wins**.

## 17. Decisions

| #   | Decision                                                                                                                         | Effect                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| D1  | MS1 creates **one blank team with no players**. Coaching functions are built and tried before any player data exists.            | M1 starts as "team only". Roster and athletes move out of the MVP.                        |
| D2  | **Coaching functions first**, at team level: team assessment, team observations, team goals, program and sessions, drill search. | M2 and M3 are built at team level first; the athlete level comes after.                   |
| D3  | **Junior head / admin is Milestone 2**, after the coaching core.                                                                 | Taxonomy editing, coach management, templates and cross-team views move to a later phase. |
| D4  | **Athlete and guardian is Milestone 3**, the last priority.                                                                      | M7 and guardian features come last.                                                       |

## 18. What this changes

- **No personal data about minors in MS1.** N1 (privacy), N2 (visibility) and N3 (athlete sign-in) do not block MS1. They block only the athlete-data phases. Coaches are still real users, so authentication and team-scoped access (M0) stay in the MVP; the storage ADR (#19) is still needed, but the pressure is lower and the pilot can start on the proof of concept.
- **Taxonomy without an admin UI.** The assessment still needs skills and a rating scale (Q3). For MS1 a fixed starter taxonomy is seeded by the developer; coach or admin editing comes later **[confirm]**.
- **Coach accounts without an admin UI.** For MS1, coaches are added by the developer **[confirm]**.
- **Material tagging by the existing editor role.** The editor flows already exist; the admin role is not needed for M6 in the MVP.
- **Program planning (M4) moves into MS1** because it is coaching functionality that needs no player data **[confirm]**.
- **Attendance**: MS1 records that a session happened and a head count (no names). Per-athlete attendance comes with the roster.

## 19. Milestones

The milestone table is in **section 13**, which now holds the canonical version. Summary: MS1 Coach, MS2 Junior head, MS3 Athlete and guardian. The pilot is MS1 with one coach and one team.

## 20. Impact on the other sections

- **Section 8 (open questions)**: N1-N4 and the guardian decision gate MS3, not the pilot. Q1 and Q3 gate stage 1b, Q2 gates stage 1c, N5-N7 gate stage 1d.
- **Section 11 (modules)**: M1 and M2/M3 each have two stages (team level, then athlete level). M7 is the last module and belongs to MS3.
- **Section 14 (issue map)**: existing issues stay as drafted. Issues for athlete-level work (roster, individual assessment, athlete app) should not be created yet; M0 and team-level M1-M3 should be drafted first once the use cases are accepted.
- **Section 15 (risks)**: the privacy risk is deferred rather than removed; the scope risk falls because the pilot is coach-only.

---

# Part IV - Expert review outcomes (2026-11-05)

Four independent reviews (solution architect, UI/UX specialist, IT security specialist, professional sport coach) were consolidated in [plan-002-expert-review.md](./plan-002-expert-review.md). That document holds the findings register, the hard gates per milestone, the proposed starter taxonomy and the new open questions. Summary of what changed in this plan:

- **Hard gates** per milestone are now part of the plan (review section 3). The first: no new coaching data on header-based identity; real authentication, team-scoped authorization, security headers, rate limiting and blocking CI checks before MS1 stage 1a.
- **Data model** (section 12): polymorphic assessment and goal, versioned taxonomy, session ownership, flexible program structure.
- **ADR** (section 9a): authorization model, RLS mechanics, migration path, environments.
- **Assessment design** (M2): descriptor scale, capped skills per age band, psychosocial category, cadence, positive framing.
- **LLM** (M9): do-not list and guardrails.
- **Use cases**: UC-C-17 to UC-C-27 added for real-season needs (matches, tournaments, tryouts, injuries and absences, parent communication, team values, multi-team coaches, drop-out, cancelled sessions, handover, end-of-season review).

**Proposals awaiting the product owner** (not decisions):

1. **Re-sequence MS1** so value arrives earlier and dependencies are honest: 1a Foundation plus drill migration; 1b material bank tags and search; 1c program and session planning (works without goals); 1d team assessment and team goals; 1e LLM assistant. The current order in section 13 stays in force until this is accepted.
2. Raise #19 (storage and auth ADR) to P0 and make #4 and #6 blockers for stage 1a.
3. Adopt the descriptor scale and starter taxonomy as the basis for Q3, subject to club validation.
4. MS1 offline scope: drafts survive reload and saves retry; no background sync.
5. Keep free-text notes out of the LLM and warn against names in MS1.
