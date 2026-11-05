# User Personas

**Project**: Hawks Coach Hub
**Last Updated**: 2026-11-05
**Purpose**: Define target users to guide product decisions and UX design

---

## Update 2026-11-05: Junior Programs

The product is moving toward junior team training programs. The personas below were written for a single senior team and still describe the coach and admin well. The following user groups are added or refined; details are in `USE_CASES.md` and are **drafts pending product-owner review**.

| Group                                  | Priority    | Summary                                                                                                                                        |
| -------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Coach (junior team, head or assistant) | Milestone 1 | Sets team assessment, goals, program and sessions; often a volunteer with limited time. Harri and Anu below are the closest existing personas. |
| Junior head / admin                    | Milestone 2 | Coordinates juniors across teams: skills language, coach access, material, templates. Mika below is the closest existing persona.              |
| Athlete                                | Milestone 3 | Junior player; sees the program and logs progress. Not yet researched; age range and devices are open.                                         |
| Guardian                               | Milestone 3 | Parent or carer of a minor; role is to be confirmed.                                                                                           |

Draft personas from the expert review (to be validated with real people):

- **Volunteer junior coach "Jenni"** (MS1 primary): parent-coach, 35-45, two to three hours a week for the team, low tech confidence, phone first, shares the role with an assistant. Needs a first-run checklist, quick capture and Finnish copy that is plain and consistent.
- **Athlete** (MS3): do not design one UI for all ages. Rough bands to confirm: about 7-9 (learning through play), 10-12, 13-16, with different language, reading level and sign-in. Positive, growth framing; sees only their own one to three goals and the next session; no numeric scores for the youngest; no peer comparison.
- **Guardian** (MS3): schedule and team focus; consent is a separate plain-language flow.

Research needed before MS3: athlete age range, sign-in options, what athletes should see about themselves, and guardian involvement.

---

## Primary Persona: "Head Coach Harri"

**Role**: Head Coach / Session Planner

### Demographics

- **Age**: 42
- **Role**: Head coach of Hawks Helsinki floorball team
- **Tech savviness**: Medium — comfortable with smartphones, less comfortable with web apps
- **Device**: iPhone 14 (field use), MacBook Pro (office)
- **Location**: Rinks, gyms, training facilities across Helsinki area

### Goals

1. **Build training sessions efficiently** — plan drills, durations, and order before practice
2. **Find drill materials quickly** — on the field, in under 30 seconds
3. **Access tactical documents** — game preparation, opponent analysis
4. **Print or share session plan** — assistant coaches need the plan before sessions

### Pain Points

- Slow load times are unacceptable on the field — coaches don't wait
- Too many clicks to find a specific drill
- Forgetting which folder a material is in
- Poor mobile experience on existing tools

### Behaviors

- Opens app on phone while standing at rink
- Needs results in under 5 seconds or gives up
- Uses search first if he knows the name; browses tabs if exploring
- Frequently revisits the same 10-15 drills/materials

### Quote

> "I need to find the 'corner battle drill' video in under 10 seconds while my players are waiting. If the app is slow, I'll just skip it."

### Design Implications

- **Speed above all** — 5-second load target is non-negotiable
- Large touch targets — gloves off but cold fingers
- Tab navigation must be instant (no loading per tab switch)
- Search prominently placed

---

## Secondary Persona: "Assistant Coach Anu"

**Role**: Assistant Coach / Drills Coordinator

### Demographics

- **Age**: 31
- **Role**: Assistant coach, manages drill library
- **Tech savviness**: High — comfortable with Google Workspace, web apps
- **Device**: iPad (primary), Android phone (backup)
- **Location**: Office, rinks

### Goals

1. **Organize sessions** — prepare drill lists ahead of time
2. **Select materials for export** — compile session handouts
3. **Stay current** — see recently added materials
4. **Browse by category** — look through "Harjoitukset" tab systematically

### Pain Points

- Can't quickly see what's new since last session
- No way to bookmark frequently used materials
- Difficult to build and share a "practice session plan"

### Behaviors

- Plans sessions 1-2 days ahead at desk (iPad)
- Browses by folder hierarchy systematically
- Selects multiple files for a session
- Would benefit from export/download-all feature

### Quote

> "I spend 30 minutes before each session finding and organizing the right materials. It would be great if I could save a session plan and just load it next time."

### Design Implications

- Multi-select file export for session planning
- Folder navigation must be intuitive (breadcrumbs)
- Recently modified files would be a valuable feature (future)

---

## Tertiary Persona: "Club Admin Mika"

**Role**: Club Administrator / Drive Manager

### Demographics

- **Age**: 48
- **Role**: Hawks Helsinki club administrator
- **Tech savviness**: High — manages Google Workspace for the club
- **Device**: MacBook (primary)
- **Location**: Office

### Goals

1. **Control what coaches can access** — manages Drive folder permissions
2. **Upload new materials** — adds drills, tactical documents, season plans
3. **Ensure the app works** — makes sure coaches can find what they need
4. **No IT tickets** — wants coaches to be self-sufficient

### Pain Points

- No way to know if coaches can actually find the materials he uploads
- Drive folder structure may not match coaches' mental model

### Behaviors

- Manages Google Drive directly (not via Coach Hub)
- Tests the app occasionally to check it works
- Reorganizes folders when structure gets messy

### Design Implications

- Tab structure derived from Drive folders — admin controls it via Drive, not code
- App must gracefully handle folder reorganizations
- Any new top-level folder automatically becomes a tab

---

## Anti-Persona: Non-Coaching Staff

**Who we don't design for (in MS1 and MS2)**: media, general public. Players and guardians become target users in MS3 (see the update at the top of this document).

- App is for internal coaching staff only
- No public access / no need for registration or landing page
- Security: relies on Drive folder permissions (service account only accesses shared folder)

---

## Usage Context Summary

| Context               | Device        | Network    | Time pressure           |
| --------------------- | ------------- | ---------- | ----------------------- |
| At rink (practice)    | Phone         | 4G/LTE     | High — seconds matter   |
| Pre-practice planning | Tablet/laptop | Wi-Fi      | Medium — 10-30 min prep |
| Post-game analysis    | Laptop        | Wi-Fi      | Low — thorough review   |
| Travel to away games  | Phone         | Spotty LTE | High — must be fast     |
