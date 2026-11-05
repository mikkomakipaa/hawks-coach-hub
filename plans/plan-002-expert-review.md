# Plan-002 Expert Review (2026-11-05)

**Scope**: review of `plan-002-junior-training-programs.md`, `docs/USE_CASES.md` and the related `docs/` by four expert roles: Solution Architect, UI/UX specialist, IT security specialist, professional sport coach.
**Method**: four independent read-only reviews, coordinated and consolidated here. Findings were spot-checked against the repo where they made factual claims about code (see "Verified facts").
**Status of outcomes**: items marked **Applied** were written into the documents. Items marked **Proposal** need product-owner approval before they count as decisions. Items marked **Question** are open. No code was changed.

---

## 1. Executive summary

1. The direction holds: coach-first, team-level, no player data in MS1, athletes last. All four reviewers endorse it.
2. **The biggest risk is not direction but the foundation.** Planner identity is built from client-supplied headers, including the role. This must be replaced by real authentication before any coaching data is stored (hard gate for MS1 stage 1a).
3. **The assessment design needs rework before it is built**: a descriptor scale instead of bare 1-5, a capped starter taxonomy with age bands, a psychosocial dimension, fixed review cadence, and anti-labelling rules.
4. **The data model needs four fixes now** so MS3 stays additive: one polymorphic assessment/goal shape, a versioned taxonomy with stable keys, session ownership by team, and a migration path from Airtable.
5. **The documents were missing**: per-screen UX and a coach IA, load/safety stance, LLM do-not list, privacy and security gates per milestone, and about a dozen real-season coach use cases.

## 2. Verified facts (checked in the repo on 2026-11-05)

| Claim                                                              | Result                                                                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | --- | ------- | --- | ----- |
| Role can be supplied by the client when no profile exists          | True: `api/_lib/auth/service.js` (`allowHeaderRoleFallback` default on; role falls back to `x-planner-role`) |
| Session create/update/share routes only require the `viewer` role  | True: `api/_lib/planner/http.js`                                                                             |
| `api/drive.js` sends `Access-Control-Allow-Origin: *`              | True                                                                                                         |
| `vercel.json` sets only X-Frame-Options and Referrer-Policy        | True: no CSP, HSTS or nosniff                                                                                |
| CI security audit never fails                                      | True: `.github/workflows/security.yml` uses `                                                                |     | echo`/` |     | true` |
| No Dependabot config                                               | True                                                                                                         |
| Incident report contains a private key ID                          | True; redacted as part of this review (see section 6)                                                        |
| Design tokens `#9CA3AF`, `#22C55E`, `#EF4444` used for text/states | True; contrast ratios are the UX reviewer's figures and should be re-measured with a tool                    |

## 3. Hard gates (security, from the review)

| Before             | Gate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **MS1 stage 1a**   | (1) Remove header-based identity and role fallback; identity only from a verified session/JWT; forged-header test returns 401. (2) Write routes require coach role plus a team or ownership check; deny-by-default authorization test per route. (3) Security headers: CSP without unsafe-inline scripts, HSTS, nosniff, frame-ancestors, Permissions-Policy, with a CI check. (4) Rate limiting and body-size limits on auth and write routes. (5) Neon ADR with tenant model, non-bypass app role, `FORCE ROW LEVEL SECURITY`, per-request `SET LOCAL` in a transaction, cross-tenant negative tests in CI, "no table without RLS" check. (6) Session handling: HttpOnly/Secure/SameSite cookies, CSRF protection, revocation, short-lived tokens. (7) CI: blocking `npm audit`, Dependabot (root, `api/`, actions), secret scanning/gitleaks. (8) Controller identified (the club), privacy notice and processing record for coach data, processor agreement if the developer is a processor. |
| **MS2**            | Single-use expiring invites bound to team and role (no open registration); append-only audit log for admin, role and auth events; MFA decision for admin; review of free-text fields.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Stage 1d (LLM)** | N5-N7 answered; provider terms (no training on inputs, region); prompt-injection test set in the evaluation suite; server-side guard that blocks names, emails and free-text notes from prompts; cost cap, rate limit, kill-switch; output sanitised and validated against a schema.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **MS3**            | DPIA; processor agreements for sub-processors; written legal opinion on lawful basis, consent age and guardian consent (to be verified with counsel, not assumed); retention schedule; tested export and erasure path including backups and branches; N1-N4 answered in writing; synthetic data only in preview environments; no health or injury free text unless separately approved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

## 4. Findings register

Severity: C critical, H high, M medium, L low. Disposition: **A** applied to docs, **P** proposal, **Q** question, **D** deferred.

### 4.1 Solution architect

| ID      | Sev | Finding                                                                              | Disposition                                                                                                 |
| ------- | --- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| ARCH-1  | H   | Authorization model undecided; roles `viewer/editor/admin` cannot express team scope | **P**: app-level authorization in one policy module plus RLS as backstop; see CORE_ARCHITECTURE Decision 12 |
| ARCH-2  | H   | Neon Managed Better Auth has no exit criteria or fallback                            | **A**: spike exit criteria and fallback in plan section 9a                                                  |
| ARCH-3  | H   | No migration path for existing drills, sessions, share links                         | **A**: Decision 13 and plan section 9a; **P** to move drill migration before #9                             |
| ARCH-4  | H   | Session owner (user vs team) undefined                                               | **A** in DATA_MODEL; **Q** who owns it when a coach leaves                                                  |
| ARCH-5  | H   | Team vs athlete assessment half-modelled                                             | **A**: one `assessment` and `goal` shape with `subject_type`, athlete rows disabled until MS3               |
| ARCH-6  | H   | Taxonomy versioning shape undefined                                                  | **A**: `taxonomy_version`, `skill.stable_key`                                                               |
| ARCH-7  | M   | Week numbering, date anchoring, one vs several programs per season                   | **A** modelled as ordinal + optional date; **Q** program per season (Q2)                                    |
| ARCH-8  | M   | Sequencing: program planning should not depend on assessment/goals; M8 has no stage  | **P**: reorder MS1 (see plan Part IV); rule "planning works without goals" **A**                            |
| ARCH-9  | M   | Frontend sprawl with about 8 new screens in vanilla TS                               | **P**: ADR on a view-module pattern; coach routes lazy-loaded to protect browse bundle                      |
| ARCH-10 | M   | Offline queue is a heavy feature and conflicts with optimistic locking               | **P**: MS1 = draft survives reload and save retries; no background sync; **A** in NFR                       |
| ARCH-11 | M   | No API versioning policy; function-count limits                                      | **A**: additive-only rule in Decision 13; new coach endpoints versioned                                     |
| ARCH-12 | M   | Branch-per-PR needs separate auth config; never copy production data                 | **A**: seeded fixtures only                                                                                 |
| ARCH-13 | M   | LLM corpus, cost cap, eval harness, anonymity undefined                              | **A**: structured drills only, request type with no free text, cap, eval set                                |
| ARCH-14 | M   | Free-text notes can hold names, breaking "no personal data in MS1"                   | **A**: warning and exclusion from LLM; **Q** allow free text at all in MS1?                                 |
| ARCH-15 | M   | Role vocabulary conflicts between docs                                               | **A**: role-mapping table in DATA_MODEL                                                                     |
| ARCH-16 | M   | #4 and #6 should block stage 1a                                                      | **P**                                                                                                       |
| ARCH-17 | L   | Read-audit is too heavy for MS1                                                      | **A**: write-audit in MS1, read-audit MS3                                                                   |
| ARCH-18 | L   | Neon Data API adds a second authorization surface                                    | **A**: not used                                                                                             |
| ARCH-19 | L   | Region, backups, retention open                                                      | **A**: EU region in ADR requirements                                                                        |
| ARCH-20 | L   | Duplicate question lists, #19 priority mismatch                                      | **A**: section 8 canonical; **P** #19 to P0                                                                 |
| ARCH-21 | L   | No observability or pilot exit criteria                                              | **A** in NFR                                                                                                |

### 4.2 UI/UX specialist

| ID    | Sev | Finding                                                                            | Disposition                                                                                                                         |
| ----- | --- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| UX-1  | C   | Bare 1-5 scale, uncapped skills: rating fatigue and meaningless numbers            | **A**: descriptor scale, 8-12 starter skills, one category per screen, "not assessed", "same as last time"; scale itself **Q** (Q3) |
| UX-2  | H   | Deficit framing of weaknesses                                                      | **A**: "strengths" and "next development areas", at most 3 each, show change not rank                                               |
| UX-3  | H   | Session record is not quick capture                                                | **A** in UC-C-11: one-tap "as planned", stepper headcount, per-block toggle                                                         |
| UX-4  | H   | Offline and conflict states undefined                                              | **A**: shared sync-state pattern (see DESIGN_SYSTEM)                                                                                |
| UX-5  | H   | No team-scoped navigation                                                          | **A**: "Joukkue" area with tabs and phone bottom bar, persistent team/season indicator (WIREFRAMES)                                 |
| UX-6  | H   | No first-run guidance for volunteers                                               | **A**: 3-step checklist, demo data option                                                                                           |
| UX-7  | M   | Goal form too free-form                                                            | **A**: sentence template, prefilled review date, goal cap                                                                           |
| UX-8  | M   | Program (UC-C-07) is the most complex and least specified                          | **A**: flagged; **P** write full flow before issues; single-session planning must stay available                                    |
| UX-9  | M   | Drill search filter wall                                                           | **A**: search + 3 chips + "more filters"; Drive material collapsed                                                                  |
| UX-10 | H   | Accessibility gaps: contrast, dark mode, reduced motion, 3 s error toasts, targets | **A**: known-gaps list in DESIGN_SYSTEM; fixes are implementation work                                                              |
| UX-11 | M   | Inconsistent Finnish terms and missing diacritics                                  | **A**: glossary in DESIGN_SYSTEM; **Q** sinä vs te                                                                                  |
| UX-12 | H   | No athlete/guardian persona; anti-persona contradicts MS3                          | **A** in PERSONAS                                                                                                                   |
| UX-13 | M   | Journeys cover one senior head coach                                               | **A**: journey list added; full maps pending                                                                                        |
| UX-14 | M   | No per-screen empty/loading/error states                                           | **A**: required per screen in WIREFRAMES                                                                                            |
| UX-15 | L   | Observations quick-add; share link vs team scoping                                 | **A** noted; share allowlist per SEC-3                                                                                              |

### 4.3 IT security specialist

| ID     | Sev | Finding                                                                     | Disposition                                                   |
| ------ | --- | --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| SEC-1  | C   | Spoofable identity and role                                                 | **A**: hard gate; code fix is stage 1a work                   |
| SEC-2  | H   | Viewer role can write sessions                                              | **A**: gate                                                   |
| SEC-3  | H   | Share links: no expiry, rate limit, no-store; allowlist unspecified         | **A**: gate for the share view                                |
| SEC-4  | H   | Missing security headers                                                    | **A**: gate                                                   |
| SEC-5  | M   | CORS wildcard, logging of key path, hard-coded IDs in `drive.js`            | **A** noted in NFR; code fix pending                          |
| SEC-6  | M   | No rate limiting                                                            | **A**: gate                                                   |
| SEC-7  | M   | Airtable formula injection risk; error details passed to client             | **A** noted; moot after Postgres with parameterised queries   |
| SEC-8  | H   | Neon/RLS design gaps                                                        | **A**: ADR requirements                                       |
| SEC-9  | H   | Session/JWT handling unspecified                                            | **A**: gate                                                   |
| SEC-10 | M   | Invites and onboarding                                                      | **A**: MS2 gate; MS3 guardian link verification               |
| SEC-11 | M   | Audit logging only planned for MS3                                          | **A**: write-audit from MS1                                   |
| SEC-12 | H   | "No personal data" in MS1 not enforced; coaches' own data is personal data  | **A**: gate; free-text rule                                   |
| SEC-13 | H   | MS3 privacy and legal                                                       | **A**: MS3 gate; all legal points to be verified with counsel |
| SEC-14 | H   | LLM injection, leakage, provider terms, output safety, cost                 | **A**: stage 1d gate                                          |
| SEC-15 | M   | Supply chain and CI                                                         | **A**: gate; code/CI fix pending                              |
| SEC-16 | M   | Incident doc contains key ID; history contains tooling files; stale reviews | **A**: key ID redacted; **Q** confirm key rotation date       |
| SEC-17 | M   | Plan/NFR gaps (backup, breach process, security tests, kill-switch)         | **A** in NFR; breach process **Q** with counsel               |

### 4.4 Professional sport coach

| ID       | Sev | Finding                                              | Disposition                                                                                                                              |
| -------- | --- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| COACH-1  | H   | Goals are outcome-like; no process goals; no limits  | **A**: process and development goal types, 2-4 team goals, 1-2 focus skills per cycle; **Q** win/rank goals for juniors                  |
| COACH-2  | H   | Numeric scale invites labelling                      | **P**: descriptor scale and starter taxonomy (below); validate with the club                                                             |
| COACH-3  | H   | No psychosocial or game-understanding dimension      | **P**: add categories                                                                                                                    |
| COACH-4  | H   | Assessment cadence undefined                         | **P**: 2-3 team assessments per season tied to review dates                                                                              |
| COACH-5  | H   | Labelling, relative-age and maturation bias          | **A**: rules for MS3 (no rankings, no sorted lists, own-previous comparison, birth quarter shown to coach); **Q** club policy on ranking |
| COACH-6  | H   | Session blocks lack goal, intensity, group, space    | **P**: optional fields; warn, never block                                                                                                |
| COACH-7  | H   | Session record too thin                              | **A** in UC-C-11                                                                                                                         |
| COACH-8  | H   | No load/safety stance                                | **A**: show volume and warn against a club-defined limit; never compute individual loads or give injury advice; **Q** N8                 |
| COACH-9  | M   | Drill metadata minimum                               | **A** in DATA_MODEL planned entities (primary skill, space, game-like flag, coaching points, progression)                                |
| COACH-10 | H   | Missing real-season use cases                        | **A**: UC-C-17 to UC-C-27 added                                                                                                          |
| COACH-11 | M   | Default visibility for athletes and guardians        | **P** for N2                                                                                                                             |
| COACH-12 | M   | Athlete logging: avoid RPE for children, no streaks  | **P** for N4                                                                                                                             |
| COACH-13 | H   | LLM helpful vs unsafe                                | **A**: do-not list in plan M9                                                                                                            |
| COACH-14 | M   | Program structure: cycle types, rest cycle, holidays | **A** in M4 notes                                                                                                                        |
| COACH-15 | M   | Assistant roles, multi-team coaches                  | **A** in role mapping; **Q** who may see other teams                                                                                     |

## 5. Proposed starter taxonomy and scale (suggestion, to validate with the club and federation youth guidance)

This is the coach reviewer's suggestion, not a decision. It answers Q3 only after the product owner and a coach accept it.

**Descriptor scale** (stored 1-5, shown as words; "not observed" allowed; team level reads as "most of the team is at level X", never an average):

| Level | Label                 | Meaning                                 |
| ----- | --------------------- | --------------------------------------- |
| 1     | Aloittaa              | Learning it; needs support              |
| 2     | Kehittyy              | Sometimes works in drills               |
| 3     | Toimii harjoituksessa | Works in drills, not yet under pressure |
| 4     | Toimii pelissä        | Works in games                          |
| 5     | Vahvuus               | Used flexibly, helps others             |

**Categories** (about 8-12 skills shown at once per age band, one category per screen):

| Category                   | Example skills                                                   | Age bands                                          |
| -------------------------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| Motoriikka ja liikkuminen  | running, change of direction, balance, coordination              | all                                                |
| Pallonkäsittely            | stickhandling, shooting, passing, receiving                      | all                                                |
| Pelinluku                  | finding space, support play, defending position, transitions     | introduce 11-12, deepen 13+                        |
| Taktiikka                  | basic roles, 1v1, 2v1 / 3v2, systems                             | 13+                                                |
| Fyysiset ominaisuudet      | general fitness, strength through play, speed                    | introduce 13+; none as drilled fitness under 11    |
| Psykososiaalinen ja asenne | effort, teamwork, taking turns, listening, resilience, fair play | all; observed behaviours, never personality labels |

Suggested age bands: 6-8, 9-10, 11-12, 13-14, 15-16. One taxonomy version per band.

## 6. Documents changed by this review

| Document                                        | Change                                                                                                           |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `plans/plan-002-junior-training-programs.md`    | Part IV (review outcomes), section 9a ADR requirements, section 12 data model, M2/M4/M9 notes, risks, next steps |
| `docs/USE_CASES.md`                             | UC-C-17 to UC-C-27, goal types, scale wording, session record, free-text rule, review questions                  |
| `docs/CORE_ARCHITECTURE.md`                     | Decisions 12 (authorization model) and 13 (migration and API rules), both proposed                               |
| `docs/DATA_MODEL.md`                            | Polymorphic assessment/goal, taxonomy versioning, session ownership, role mapping                                |
| `docs/NFR.md`                                   | Security gates, accessibility, observability, privacy, LLM guardrails, pilot exit criteria                       |
| `docs/DESIGN_SYSTEM.md`                         | Known accessibility gaps, sync-state pattern, Finnish glossary                                                   |
| `docs/PERSONAS.md`                              | Volunteer junior coach, athlete and guardian drafts, anti-persona corrected                                      |
| `docs/WIREFRAMES.md`                            | Joukkue navigation and MS1 screen list                                                                           |
| `docs/security/SECURITY-INCIDENT-2025-08-24.md` | Key ID redacted                                                                                                  |
| `AGENTS.md`                                     | Rule: no new coaching data routes on header identity                                                             |

## 7. New open questions

| #   | Question                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| N11 | Who owns a session when its coach leaves: coach or team?                                                                          | Team                                               |
| N12 | Are free-text notes allowed in MS1, or only tags?                                                                                 | Free text                                          |
| N13 | Are win/rank goals discouraged or forbidden for juniors?                                                                          | No hard limit                                      |
| N14 | Is ranking players within a team prohibited by club policy?                                                                       | Skill groups allowed 1-3 gorups                    |
| N15 | Club or federation load limits per age band; mandatory rest weeks?                                                                | No mandatory rest but low / high intensity periods |
| N16 | Who may see another team's data (for example the junior head)?                                                                    | Junior head only                                   |
| N17 | Sinä or te in Finnish copy?                                                                                                       | Sinä                                               |
| N18 | When was the service-account key last rotated, and is the old key revoked?                                                        | Not rotated yet                                    |
| N19 | Is the club the data controller and is the developer a processor (agreement needed)?                                              | Yes                                                |
| N20 | Which MS1 flows must work offline? Reviewer suggestion: session record and the current week's plan; assessment as save-and-retry. | These sound solid                                  |

## 8. Actions pending outside the documents

These need code or settings work and are tracked as issues once the product owner approves the plan:

- Remove header identity and role fallback; add forged-header and cross-team tests.
- Security headers in `vercel.json`; CORS restriction and logging cleanup in `api/drive.js`; rate limiting.
- CI: blocking audit, Dependabot, secret scanning, pinned actions, supported Node versions.
- Contrast and dark-mode fixes in the design tokens; persistent error messages.
- Confirm service-account key rotation (N18).
