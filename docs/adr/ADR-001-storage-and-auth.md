# ADR-001: Production storage and authentication

| Field   | Value                                                                               |
| ------- | ----------------------------------------------------------------------------------- |
| Status  | **Proposed** (becomes Accepted when the spike exit criteria below pass)             |
| Date    | 2026-11-05                                                                          |
| Issue   | [#19](https://github.com/mikkomakipaa/hawks-coach-hub/issues/19) (P0, MS1 stage 1a) |
| Blocks  | #21 sign-in, #22 team-scoped authorization and RLS, #24 blank team                  |
| Related | CORE_ARCHITECTURE Decisions 11-13, DATA_MODEL, NFR-S07..S18, plan-002 section 9a    |
| Tags    | #security #architecture #data                                                       |

## 1. Context

- Drills, sessions and import drafts live in Airtable behind storage-agnostic adapters. That is fine for content, not for coaching data.
- Planner identity is read from client-supplied headers (`x-planner-user-id`, `x-planner-email`, `x-planner-role`) with `allowHeaderRoleFallback` on by default. Anyone can claim any role.
- MS1 stores team-level coaching data (assessment, goals, programs, session records). MS3 adds data about named minors. The foundation must be right before either.
- Constraints: Vercel serverless functions, vanilla TypeScript SPA with hash routing, one developer, EU data residency (N1), club is data controller and the developer a processor (N19).

## 2. Decision drivers

1. Real authentication; roles only from the database.
2. Team-scoped access that cannot be bypassed by a route bug (defence in depth).
3. EU region, backups, erasure possible (N1, N19).
4. Preview and test environments without production data.
5. Low operational load for one developer; reuse existing knowledge (Better Auth is used in another of the owner's projects).

## 3. Options

| Option                                                 | For                                                                 | Against                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| A. Neon Postgres + Neon Managed Better Auth (proposed) | Auth and data in one database, RLS is plain Postgres, branch per PR | Managed auth is newer; exit path must be proven                          |
| B. Neon Postgres + self-hosted Better Auth (fallback)  | Same data layer, full control of auth                               | We run and patch the auth code                                           |
| C. Neon Postgres + Auth.js (fallback)                  | Widely used                                                         | Weaker fit for team and role model, more glue                            |
| D. Supabase (earlier candidate)                        | Bundled auth, storage, realtime                                     | Storage and realtime not needed in M0-M5; replaced by Neon on 2026-11-04 |
| E. Stay on Airtable                                    | No migration                                                        | No RLS, no real auth, not suitable for data about minors                 |

## 4. Decision (proposed)

Use **Option A**, with B as the named fallback if the spike fails.

### 4.1 Storage

- Postgres on Neon, EU region (exact region fixed in the spike, recorded here).
- Domain tables carry `team_id`. A membership table `(user_id, team_id, role)` is the only source of policy.
- One migration tool, chosen in the spike; the owner role is used only by migrations. Separate pooled runtime URL and direct migration URL.
- Neon Data API is **not** used. All access goes through `api/` routes, so there is one authorization surface.

### 4.2 Authorization (confirms CORE_ARCHITECTURE Decision 12)

- App-level: one policy module `authorize(actor, team, action)`; routes never query by raw team id.
- Database-level backstop: RLS enabled and `FORCE ROW LEVEL SECURITY` on every domain table; application role is non-owner and non-`BYPASSRLS`; the user id is set with `SET LOCAL` inside a transaction (never a session-level `SET` over a pooled connection); views use `security_invoker`; no `SECURITY DEFINER` shortcuts.
- Roles are orthogonal: system role (`admin`, `user`), team role (`head_coach`, `assistant`), content capability (`editor`). Junior head reads across teams only with the junior-head role (N16). Athlete roles arrive in MS3.
- Automated check: no table without RLS; cross-tenant negative tests run in CI against a Neon branch.

### 4.3 Authentication

- Neon Managed Better Auth. The auth user table stays separate from the domain coach profile.
- Identity comes only from a verified session or token. Header identity and the role fallback are deleted (issue #21), not hidden behind a flag.
- Accounts are added by the developer until MS2; MS2 adds single-use expiring invites bound to team and role.

### 4.4 Environments

- Neon branch per pull request with seeded fixtures only (schema and starter taxonomy). Production data is never copied.
- Preview environments need their own auth configuration (trusted origins).

## 5. Spike plan (time-boxed, proves the decision)

Time box: **3 working days**. Output: a short result note appended to this ADR and the status changed to Accepted or to the fallback.

| #   | Check                                                                        | Pass criterion                                               |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | Sign-in and sign-out with email, session persists                            | Works from the hash-routed SPA on Vercel                     |
| 2   | Cookie behaviour across preview and production origins                       | No third-party cookie dependency; documented                 |
| 3   | Token or session verified inside a Vercel function                           | Forged or expired token returns 401                          |
| 4   | Session revocation                                                           | Revoked session is rejected within the agreed window         |
| 5   | Invite flow feasibility (MS2 preview)                                        | Single-use, expiring, bound to team and role, or a clear gap |
| 6   | Finnish transactional email sender                                           | Sign-in email arrives, Finnish copy, EU-suitable             |
| 7   | RLS proof: two teams, two coaches                                            | Coach A cannot read or write team B (automated test)         |
| 8   | `SET LOCAL` per request through the pooled connection from a Vercel function | No identity leakage across requests (concurrency test)       |
| 9   | Branch per PR with seeded fixtures                                           | Created and deleted by CI                                    |
| 10  | Cold-start and query latency from a Vercel function                          | Within NFR budget (record numbers)                           |

**Exit to fallback** (B, then C) if checks 1-4 or 7-8 fail, or if the managed auth cannot be exited cleanly (no export of users and sessions).

## 6. Migration from Airtable

Follows CORE_ARCHITECTURE Decision 13:

1. Drills move to Postgres before junior skill tags are added (#9), via an idempotent script keyed on the Airtable record id (`legacy_id`).
2. `slug` and ids stay stable: share links and `GET /api/drills/:idOrSlug` are public contracts. DTO schema tests guard them.
3. Dual-read behind a flag, cut over, keep Airtable read-only for one release.
4. Sessions gain `owner_user_id` and a nullable `team_id` so legacy sessions survive.

## 7. Backup, retention and erasure

- Point-in-time-restore window chosen and documented in the spike; a restore drill before MS3.
- MS1 holds no named-athlete data. Retention schedule, export and erasure (including backups and branches) are MS3 gates (N1).
- Session ownership belongs to the team (N11), so a leaving coach does not orphan data.

## 8. Rollback

- Until cut-over, Airtable remains the source of truth; the flag switches reads back.
- After cut-over, Airtable stays read-only for one release and the migration script is re-runnable.
- If managed auth is abandoned, switch to B or C: domain tables reference the auth user id only, so users are re-imported rather than the schema changed.

## 9. Consequences

- Positive: real identity, team isolation with a database backstop, safe previews, one place for auth and data.
- Negative: migration work, a new vendor dependency, more setup for tests (a database branch per run).
- Follow-ups: ADR for the frontend view-module pattern (ARCH-9); API versioning for new coach endpoints (`/api/v1/...`).

## 10. Open items

| Item                                                            | Owner         | Needed for   |
| --------------------------------------------------------------- | ------------- | ------------ |
| Exact Neon EU region and plan tier (cost)                       | Product owner | Spike        |
| Migration tool                                                  | Spike         | #22          |
| PITR window and retention (N1)                                  | Product owner | MS3          |
| MFA for admin                                                   | Product owner | MS2          |
| Processor agreement with the club (N19 answered yes, agreement) | Product owner | Before pilot |
