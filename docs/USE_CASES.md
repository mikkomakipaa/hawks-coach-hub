# Use Cases

**Status**: Draft for product review (2026-11-04)
**Source**: [plan-002](../plans/plan-002-junior-training-programs.md), sections 8-11 (modules M0-M9, open questions Q1-Q6 and N1-N10)
**Purpose**: Describe what each user group needs to do with the tool, before features and issues are defined.

## Review decisions (2026-11-05)

Product owner comments on the first draft. They change scope and ranks.

1. **Milestone 1 - Coach (settings and coaching functions).** One blank team with no players. Coaching functions work at team level: team assessment, notes, goals, program and sessions, drill search, and later the LLM planning assistant.
2. **Milestone 2 - Junior head.** Taxonomy editing, coach management, material curation, templates, cross-team views. Built once the coaching core is working.
3. **Milestone 3 - Athlete and guardian.** Last priority. This is also where all data about named athletes arrives, including the coach-side functions that need it (roster, individual assessment and goals, per-athlete attendance).

Effect: Milestone 1 is coach-only and holds no personal data about minors, so N1-N3 do not block it; they block Milestone 3.

Until Milestone 2, a fixed starter skill taxonomy is seeded by the developer, coaches are added by the developer, and the existing editor role tags material **[confirm]**.

Nothing else here is decided. Items marked **[confirm]** depend on an unanswered question and are assumptions to be accepted, changed or dropped in review.

---

## 1. User groups

| Code  | Group                  | Description                                                                                              | Device                                        | Confidence                      |
| ----- | ---------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------- |
| **C** | Coach                  | Head or assistant coach of a junior team; plans training, assesses the team (later athletes), sets goals | Phone at the rink, tablet/laptop for planning | Identified, **first priority**  |
| **A** | Junior head / admin    | Coordinates juniors across teams: skills language, access, material bank, templates                      | Laptop                                        | Identified, **second priority** |
| **P** | Athlete                | Junior player; sees the program and logs progress                                                        | Phone                                         | Identified, **last priority**   |
| **G** | Guardian               | Parent/carer of an athlete                                                                               | Phone                                         | **[confirm]** N1, N3            |
| **S** | System / LLM assistant | Suggests plans from goals and the material bank; never acts alone                                        | n/a                                           | Modeled as a feature of C       |

Assistant coach is a coach with team access; whether they can assess athletes or only plan and take attendance is open **[confirm]**.

## 2. Reading guide

- **ID**: `UC-<group>-<n>`.
- **Module**: where the use case lives (M0-M9 in plan-002).
- **Rank**: the milestone it ships in: `MS1` Coach, `MS2` Junior head, `MS3` Athlete and guardian. MS1 is the pilot with one team.
- **Blocked by**: open question that must be answered before design.
- Main flows are happy paths; failure and edge paths are listed with them for the MS1 cases.

## 3. Use case overview

### 3.1 Coach

| ID       | Goal                                                                                   | Module | Rank                             | Blocked by |
| -------- | -------------------------------------------------------------------------------------- | ------ | -------------------------------- | ---------- |
| UC-C-01  | Create my team (blank, no players)                                                     | M1     | MS1                              | Q1         |
| UC-C-01b | Add athletes to the roster                                                             | M1     | MS3                              | Q1, N1, N3 |
| UC-C-16  | Assess my team's skills as a whole                                                     | M2     | MS1                              | Q3         |
| UC-C-02  | Assess an athlete's skills                                                             | M2     | MS3                              | Q3, N1     |
| UC-C-03  | See my team's strengths and weaknesses                                                 | M2     | MS1                              | Q3         |
| UC-C-04  | Record a dated observation (team in MS1, athlete in MS3)                               | M2     | MS1 (team) / MS3 (athlete)       | N2         |
| UC-C-05  | Set team goals for the season                                                          | M3     | MS1                              | Q2         |
| UC-C-06  | Set an individual development goal                                                     | M3     | MS3                              | Q3, N1, N2 |
| UC-C-07  | Plan the season in cycles and weeks                                                    | M4     | MS1                              | Q2, N8     |
| UC-C-08  | Plan a session from the week's focus                                                   | M5     | MS1                              | none       |
| UC-C-09  | Find drills by skill and age group                                                     | M6     | MS1                              | Q1, Q3     |
| UC-C-10  | Get a suggestion for a session or week                                                 | M9     | MS1 (last stage)                 | N5, N6, N7 |
| UC-C-11  | Record what actually happened in a session (team level; per-athlete attendance in MS3) | M5     | MS1 (team) / MS3 (per athlete)   | N1         |
| UC-C-12  | Review goals and reassess at a review date                                             | M8     | MS1 (team goals) / MS3 (athlete) | none       |
| UC-C-13  | Print or share the plan                                                                | M5     | MS1                              | none       |
| UC-C-14  | Work as assistant coach on a shared team                                               | M0/M1  | MS1                              | N2         |
| UC-C-15  | Handle roster changes during the season                                                | M1     | MS3                              | N1         |
| UC-C-17  | Prepare for a match and reflect afterwards (process focus)                             | M5     | MS1 **[confirm]**                | none       |
| UC-C-18  | Plan a tournament or cup weekend                                                       | M5     | MS1 **[confirm]**                | none       |
| UC-C-19  | Run tryouts and team selection / group changes                                         | M1     | MS3                              | N1, N14    |
| UC-C-20  | Log team-level incidents and absences (no diagnoses)                                   | M5     | MS1 (team) / MS3 (athlete)       | N1         |
| UC-C-21  | Communicate schedule and plan to parents                                               | M5     | MS1 **[confirm]**                | N1         |
| UC-C-22  | Set team values and a behaviour focus                                                  | M3     | MS1                              | none       |
| UC-C-23  | Switch between teams I coach and see weekly load across them                           | M1     | MS1                              | N16        |
| UC-C-24  | Notice low attendance or drop-out risk                                                 | M8     | MS3                              | N1         |
| UC-C-25  | Cancel or move a session and notify assistants                                         | M5     | MS1                              | none       |
| UC-C-26  | Hand a team over to a new coach                                                        | M1     | MS2                              | N11        |
| UC-C-27  | Review the season and plan the next                                                    | M8     | MS1 **[confirm]**                | none       |

### 3.2 Junior head / admin

| ID      | Goal                                                                                  | Module | Rank                     | Blocked by |
| ------- | ------------------------------------------------------------------------------------- | ------ | ------------------------ | ---------- |
| UC-A-01 | Maintain the skill taxonomy and rating scale (until then a fixed starter set is used) | M2     | MS2                      | Q3         |
| UC-A-02 | Manage coaches and their team access (until then coaches are added by the developer)  | M0     | MS2                      | N10        |
| UC-A-03 | Curate the material bank (tag drills, link Drive files)                               | M6     | MS2 (editor role in MS1) | Q6         |
| UC-A-04 | Provide program templates per age group                                               | M4     | MS2                      | Q1, Q2     |
| UC-A-05 | See consistency and coverage across teams                                             | M8     | MS2                      | none       |
| UC-A-06 | Handle data export and erasure requests                                               | M0     | MS3                      | N1         |
| UC-A-07 | Roll over to a new season                                                             | M1     | MS2                      | Q2         |

### 3.3 Athlete

| ID      | Goal                                         | Module | Rank | Blocked by |
| ------- | -------------------------------------------- | ------ | ---- | ---------- |
| UC-P-01 | Join my team and sign in                     | M0/M7  | MS3  | N1, N3     |
| UC-P-02 | See my next sessions and the week's focus    | M7     | MS3  | none       |
| UC-P-03 | See my goals and progress                    | M7     | MS3  | N2         |
| UC-P-04 | Log a session (attended, effort, short note) | M7     | MS3  | N4         |
| UC-P-05 | Reflect on my own skills (self-assessment)   | M7     | MS3  | N2, N4     |
| UC-P-06 | Do extra practice assigned by my coach       | M7     | MS3  | N4         |

### 3.4 Guardian **[confirm]**

| ID      | Goal                                         | Module | Rank | Blocked by |
| ------- | -------------------------------------------- | ------ | ---- | ---------- |
| UC-G-01 | See schedule and what my child is working on | M7     | MS3  | N1, N3     |
| UC-G-02 | Give or withdraw consent and see stored data | M0     | MS3  | N1         |

---

## 4. Detailed use cases

Detailed flows cover the MS1 set and the athlete-level versions that follow directly. Milestone ranks in the tables above take precedence over any older rank wording in a flow.

### UC-C-01 Create my team (blank, no players)

- **Actor**: Coach (new to the tool)
- **Trigger**: Start of season or first use.
- **Preconditions**: Coach has an account (added by the developer until MS2, see UC-A-02).
- **Main flow**
  1. Coach creates their team: name, age group, season. No players are added.
  2. System opens the team workspace with the coaching functions: team assessment (UC-C-16), team goals (UC-C-05), program and sessions (UC-C-07, UC-C-08), drill search (UC-C-09).
- **Alternatives and failures**
  - Coach already has a team: system opens it and offers to create another.
  - Save fails: draft is kept locally and retry is offered.
- **Result**: One blank team that all MS1 coaching functions attach to.
- **Notes**: No personal data about players is stored in MS1. Adding athletes is UC-C-01b (MS3): name or alias and birth year, one by one or pasted, athlete in several teams per Q1, invites per N3.

### UC-C-16 Assess my team's skills as a whole

- **Actor**: Coach
- **Trigger**: After the first training weeks, before setting goals, or at a review date.
- **Preconditions**: Team exists; starter skill taxonomy and rating scale are available.
- **Main flow**
  1. Coach opens Team assessment; skills are listed by category with the previous team rating.
  2. Coach rates the team on each skill, may skip skills, and marks a few strengths and development areas.
  3. System saves a dated team assessment and updates the overview (UC-C-03).
- **Alternatives**: Offline ratings are queued; concurrent edits show a conflict.
- **Result**: A dated team-level assessment; history is kept. Under 2 minutes on a phone **[confirm]**.
- **Note**: UC-C-02 below is the same flow per athlete and arrives in MS3.

### UC-C-02 Assess an athlete's skills (MS3)

- **Actor**: Coach
- **Trigger**: After the first training weeks, before setting goals, or at a review date.
- **Preconditions**: Athlete is on the roster (UC-C-01b); the skill taxonomy and rating scale exist.
- **Main flow**
  1. Coach opens an athlete and chooses Assess.
  2. System lists skills grouped by category with the previous rating, if any.
  3. Coach sets a rating per skill (scale per Q3) and may skip skills.
  4. Coach marks up to a few skills as strengths and a few as development areas.
  5. System saves a dated assessment and shows the updated profile.
- **Alternatives and failures**
  - Coach wants to assess many athletes in a row: "next athlete" keeps the same skill set.
  - Offline: ratings are queued and synced later.
  - Concurrent edit by another coach: conflict is shown and the later save asks to review.
- **Result**: A dated assessment; history is kept and never overwritten.
- **Success measure**: One athlete assessed in under 2 minutes on a phone **[confirm]**.

### UC-C-03 See my team's strengths and weaknesses

- **Actor**: Coach
- **Trigger**: Before planning a cycle or session.
- **Main flow**
  1. Coach opens the team overview.
  2. System shows skills by team average and spread, highlighting the weakest and strongest.
  3. Coach filters by skill category, or drills into an athlete.
- **Alternatives**: Few or no assessments yet: system explains how many are needed and links to UC-C-02.
- **Result**: Evidence for choosing a focus (feeds UC-C-05, UC-C-07, UC-C-08).

### UC-C-04 Record a dated observation

- **Actor**: Coach
- **Trigger**: Something worth noting during or after a session.
- **Main flow**: Coach opens an athlete, writes a short note, tags a skill (optional), chooses who can see it (coach only by default), saves.
- **Edge**: Notes about health or behavior **[confirm]** N1 whether these are allowed at all.
- **Result**: Observation on the athlete timeline.

### UC-C-05 Set team goals for the season

- **Actor**: Coach (with head coach approval **[confirm]**)
- **Trigger**: Season start or after reviewing the team overview.
- **Main flow**
  1. Coach creates a team goal: focus skill, target (for example average level from X to Y, or a custom measure), due date, review date.
  2. System shows suggested goals from the weakest skills (UC-C-03).
  3. Coach confirms; system saves the goal as active.
- **Failure**: Missing review date: system asks, since reviews drive UC-C-12.
- **Result**: Team goals that cycles and weeks can link to (UC-C-07).

### UC-C-06 Set an individual development goal

- **Actor**: Coach (optionally together with the athlete **[confirm]**)
- **Trigger**: After an assessment.
- **Main flow**
  1. Coach picks an athlete and a skill, system shows the baseline from the latest assessment.
  2. Coach sets a target, due date, review date and a short wording the athlete will see.
  3. System saves it; whether the athlete sees it immediately depends on N2.
- **Edge**: Athlete already has several active goals: system warns above a limit **[confirm]**.
- **Result**: A measurable goal with baseline, target and review date.

### UC-C-08 Plan a session from the week's focus

- **Actor**: Coach
- **Trigger**: Preparing the next training.
- **Preconditions**: Existing session planner (shipped). Program and week exist if M4 is in place, otherwise the coach plans freely.
- **Main flow**
  1. Coach opens the week (or starts a new session) and sees its focus skills and linked goals.
  2. Coach searches the drill library (UC-C-09), adds drills as blocks, sets durations.
  3. System shows running totals and a coverage note: which focus skills the session touches.
  4. Coach saves; the session can be printed or shared (UC-C-13).
- **Failure and edge**
  - Save fails: draft recovery as in the current planner.
  - No drills match the focus: system suggests related skills and shows the coverage gap (UC-A-03).
  - Session too long vs the planned time: totals warn.
- **Result**: A saved session attached to a week.

### UC-C-09 Find drills by skill and age group

- **Actor**: Coach
- **Trigger**: Need an exercise for a skill and age.
- **Main flow**: Coach filters by skill and age group (and group size, equipment), opens a drill, reads coaching points, adds it to a session or favourites it.
- **Edge**: No match: system suggests broadening filters; legacy Drive files are shown separately as unstructured material.
- **Result**: A drill chosen from the Hawks material bank.

### UC-C-11 Record what actually happened in a session

- **Actor**: Coach or assistant coach
- **Trigger**: During or right after a session, on a phone.
- **Main flow**
  1. Coach opens today's session.
  2. Coach marks the session done, notes how many attended (a count, no names, in MS1), adds a quick note and marks which planned drills were skipped or changed.
  3. System saves plan vs actual.
  4. MS3: with a roster (UC-C-01b) the coach taps present/absent per athlete (and late/injured **[confirm]**).
- **Edge**: Poor connectivity: saves locally and syncs.
- **Result**: Plan vs actual (and later attendance per athlete), feeding review.

### UC-A-01 Maintain the skill taxonomy and rating scale

- **Actor**: Junior head / admin (MS2; MS1 uses a fixed starter taxonomy seeded by the developer **[confirm]**)
- **Trigger**: Setup, or a season review.
- **Main flow**: Admin edits categories and skills, writes level descriptors per rating, optionally restricts skills to age groups, publishes a new taxonomy version.
- **Rules**: Old assessments keep pointing to the version they were made with.
- **Result**: Shared vocabulary for assessments, goals, drill tags and LLM output.

### UC-A-02 Manage coaches and their team access

- **Actor**: Admin
- **Main flow**: Admin invites a coach, assigns teams and a role (coach or assistant), can remove access.
- **Rule**: A coach sees only their teams' data; removal takes effect immediately.
- **Result**: Team-scoped access.

### UC-A-03 Curate the material bank

- **Actor**: Admin (or an editor coach)
- **Main flow**: Admin opens the import queue or an untagged drill, adds age range, skill tags and coaching points, links related Drive files, publishes. A coverage report shows skills with few or no drills.
- **Result**: Findable, junior-tagged material.

### UC-A-06 Handle data export and erasure requests

- **Actor**: Admin
- **Trigger**: A guardian or athlete asks what is stored or asks for deletion.
- **Main flow**: Admin finds the athlete, exports their data or deletes/anonymizes it; system records the action in the audit log.
- **Blocked by**: N1 defines what must be supported and retention periods.

---

## 5. Short-form use cases (later work)

| ID      | Summary                                                                                                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UC-C-07 | Coach creates a program for the team, divides it into cycles with focus skills from team goals, adds weeks with a theme and target number of sessions; can copy a template or last season.                         |
| UC-C-10 | Coach asks for a session or week outline for chosen focus skills and age group; system proposes drills from the material bank with sources; coach edits and approves. Names and notes are never sent to the model. |
| UC-C-12 | At a review date the system prompts the coach to reassess; coach compares baseline, target and current level, marks the goal achieved/continued/dropped and adds a note that informs the next cycle.               |
| UC-C-13 | Coach prints or shares a link to the week or program with assistants or the team (read-only).                                                                                                                      |
| UC-C-14 | Assistant coach opens the same team, sees the plan, takes attendance; edit rights on assessments depend on the role decision.                                                                                      |
| UC-C-15 | Coach adds, moves or archives an athlete mid-season; history stays with the athlete.                                                                                                                               |
| UC-A-04 | Admin publishes a program template per age group that coaches can copy.                                                                                                                                            |
| UC-A-05 | Admin sees which skills each team is working on and where material or coverage is thin.                                                                                                                            |
| UC-A-07 | Admin archives a season and rolls teams over; athletes keep history.                                                                                                                                               |
| UC-P-01 | Athlete joins via team code or invite, signs in; sign-in method depends on age (N3).                                                                                                                               |
| UC-P-02 | Athlete opens the app and sees upcoming sessions, this week's focus and anything to bring.                                                                                                                         |
| UC-P-03 | Athlete sees their goals with a simple progress view, framed positively; what is visible follows N2.                                                                                                               |
| UC-P-04 | After a session the athlete confirms attendance, rates effort (for example 1-5) and optionally adds a short note: done in two taps for the minimum.                                                                |
| UC-P-05 | Athlete rates their own skills before a review; coach sees both views side by side.                                                                                                                                |
| UC-P-06 | Coach assigns extra practice items; athlete marks them done.                                                                                                                                                       |
| UC-G-01 | Guardian sees the schedule and the current focus, not assessments **[confirm]**.                                                                                                                                   |
| UC-G-02 | Guardian gives consent for a minor, sees stored data about their child, can request deletion.                                                                                                                      |

---

### Added by the expert review (2026-11-05)

| ID      | Summary                                                                                                                                                                      |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UC-C-17 | Coach records the focus and plan for a match, and afterwards a short process-focused reflection (what worked, what to train next). No results-based goals **[confirm]** N13. |
| UC-C-18 | Coach lays out a tournament weekend: matches, rotation, rest, and a short schedule to share.                                                                                 |
| UC-C-19 | Tryouts and team or group changes with a transparent criteria note. No rankings or exportable score lists.                                                                   |
| UC-C-20 | Coach logs a team-level incident or absence reason without diagnoses. Return-to-play is handled outside the tool.                                                            |
| UC-C-21 | Coach shares schedule changes and the season plan with parents using a template message (LLM draft optional). No chat.                                                       |
| UC-C-22 | Coach records the team's values or rules and picks a behaviour focus for a week or month.                                                                                    |
| UC-C-23 | A coach with several teams switches between them; the app shows sessions per week across their teams as a load reminder.                                                     |
| UC-C-24 | The system shows a team-level attendance trend and prompts the coach to talk with the child and parents. Handled with care and only in MS3.                                  |
| UC-C-25 | Coach cancels or moves a session (weather, venue); assistants are notified.                                                                                                  |
| UC-C-26 | Head coach hands a team to a successor; history stays with the team.                                                                                                         |
| UC-C-27 | At season end the coach reviews goals, assessments and sessions, and starts next season's program from them (feeds UC-A-07).                                                 |

### Rules from the expert review that apply across use cases

- **Goals**: two types, process goals and development goals; results (wins, rank) are not a goal type **[confirm]** N13. Suggest 2-4 team goals per season and 1-2 focus skills per cycle, with a nudge above that. Each goal says how it will be seen in play, not only a number.
- **Assessment**: the scale is shown as words, not bare numbers (proposal in `plans/plan-002-expert-review.md` section 5); skills can be "not assessed"; "same as last time" is one action; strengths and next development areas, at most three each; show change, not ranking. Team level reads "most of the team is at level X", not an average. Suggested cadence: start, middle and end of the season.
- **Session record**: one screen, "as planned" as the primary action; headcount stepper; per-block done/skipped/changed; optional one-line "worked" and "change next time"; felt intensity (too easy, right, too hard); venue or weather issues. Planned versus actual minutes are compared automatically.
- **Free text**: MS1 notes carry a "no names or health information" warning and are never sent to an LLM. Whether free text is allowed in MS1 at all is open (N12).
- **Load and safety**: the tool shows sessions and minutes per week and warns against a club-defined limit (N15). It never computes individual loads or gives injury advice.
- **Athlete and guardian defaults (MS3, proposal for N2)**: athletes see what they are working on (one to three goals), the session plan and their own log. They never see numeric ratings, lists of strengths or weaknesses across players, coach private notes or comparisons. Guardians see schedule, team focus and, if the coach shares it, their own child's goals. No rankings or sorted lists by score in any view; compare an athlete only with their own earlier rating; birth quarter is shown to the coach as a bias reminder.

## 6. Cross-cutting scenarios to validate

| Scenario                                                      | Why it matters                                  |
| ------------------------------------------------------------- | ----------------------------------------------- |
| A coach opens an athlete from another team by guessing a link | Authorization must deny by default (M0)         |
| An athlete tries to read another athlete's goals or logs      | Own-data-only rule                              |
| A coach loses connectivity at the rink mid-assessment         | Quick capture must survive offline              |
| An athlete is in two teams (for example U13 and U15)          | Membership model (Q1)                           |
| An athlete leaves the club                                    | Data retention and erasure (N1)                 |
| A coach leaves the club mid-season                            | Access removal; the team and history remain     |
| LLM suggests a drill unsuitable for the age                   | Coach approval; filters by age in retrieval     |
| Assessment results shown to a child                           | Wording, visibility and motivation effects (N2) |

## 7. Traceability to modules

| Module                   | Use cases                                       |
| ------------------------ | ----------------------------------------------- |
| M0 Foundation            | UC-A-02, UC-A-06, UC-C-14, UC-G-02, UC-P-01     |
| M1 Team and roster       | UC-C-01 (team, MS1), UC-C-01b, UC-C-15, UC-A-07 |
| M2 Assessment            | UC-C-16, UC-C-03, UC-C-04, UC-C-02, UC-A-01     |
| M3 Goals                 | UC-C-05, UC-C-06                                |
| M4 Program               | UC-C-07, UC-A-04                                |
| M5 Sessions + attendance | UC-C-08, UC-C-11, UC-C-13                       |
| M6 Material bank         | UC-C-09, UC-A-03                                |
| M7 Athlete app           | UC-P-01 to UC-P-06, UC-G-01                     |
| M8 Review                | UC-C-12, UC-A-05                                |
| M9 LLM assistant         | UC-C-10                                         |

## 8. Review checklist

For each group, please mark each use case **keep / change / drop / missing**, and answer:

1. Are these the right user groups? Is guardian in or out for now?
2. Is anything missing that a coach actually does in a season (for example match preparation, injuries, tryouts, communication with parents)?
3. Is Milestone 1 right: one blank team, team-level assessment, notes and goals, program and sessions, drill search, LLM assistant last? Is UC-C-07 (program planning) correctly in MS1?
4. Which flows must work offline?
5. Which assessment content may athletes see (N2)?
6. Which questions in plan-002 section 8 and `plan-002-expert-review.md` section 7 (N11-N20) can you answer now, using these use cases as context?
7. Are the added use cases UC-C-17 to UC-C-27 right, and which of them belong in MS1?

After review, MS1 use cases become user-story issues with acceptance criteria. Until then no issues are created.
