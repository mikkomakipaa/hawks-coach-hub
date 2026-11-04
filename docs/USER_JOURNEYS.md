# User Journey Maps

**Project**: Hawks Coach Hub
**Last Updated**: 2026-02-28

---

## Journey Model

Hawks Coach Hub now has two documented experience surfaces:

- **Browse mode**: current no-login, Drive-backed material retrieval
- **Planner/CMS extension**: structured drill catalog, session planning, and editor/admin content workflows

The key product rule is unchanged:

- The fast no-login browse journey remains the primary field-use path
- Planner and editor flows extend the product without degrading browse mode

---

## Journey 1: Coach Finds a Drill Before Practice (Current Primary Flow)

**Actor**: Head Coach Harri
**Goal**: Find and open a specific drill video/document within 30 seconds
**Device**: iPhone (4G network)
**Context**: Standing at rink, players arriving in 5 minutes

| Step | Action                          | System Response                          | Emotion      | Pain Points                       |
| ---- | ------------------------------- | ---------------------------------------- | ------------ | --------------------------------- |
| 1    | Opens Coach Hub URL on phone    | App loads, skeleton cards appear         | Focused      | If over 3 seconds, anxiety starts |
| 2    | Waits for file list             | Files appear in under 5 seconds uncached | Waiting      | Critical moment                   |
| 3    | Taps "Harjoitukset" tab         | Tab activates instantly, files filter    | Good         | None                              |
| 4    | Types "kulmataistelu" in search | Results filter immediately across tabs   | Satisfied    | None                              |
| 5    | Taps "Avaa" on found file       | Drive opens in new tab                   | Done         | None                              |
| 6    | Shows material to players       | Outside app                              | Accomplished | None                              |

**Success criteria**: Step 1-5 completed in under 30 seconds
**Failure mode**: App is slow or errors -> coach abandons and improvises

---

## Journey 2: Coach Builds a Session From Structured Drills (Planned Primary Planner Flow)

**Actor**: Head Coach Harri
**Goal**: Create today's session quickly from a trusted drill catalog
**Device**: iPhone or laptop/tablet
**Context**: Before practice, often under moderate time pressure

| Step | Action                                                               | System Response                                                                                                      | Emotion    | Pain Points                                 |
| ---- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------- |
| 1    | Opens `#/plan`                                                       | Shows recent sessions and clear "Uusi suunnitelma" CTA                                                               | Focused    | Empty state confusion                       |
| 2    | Starts new session                                                   | Defaults date/group where possible                                                                                   | Neutral    | Too many required fields                    |
| 3    | Searches structured drill catalog and opens drill detail when needed | Results and detail view expose duration, players, setup, coaching points, and attachments without forcing a PDF open | Efficient  | Poor relevance or missing planning metadata |
| 4    | Adds drills to session from card or detail view                      | Session draft updates immediately, totals stay visible, and coach can continue from planner flow                     | In control | Weak mobile editing or hidden totals        |
| 5    | Reorders blocks and adds notes                                       | Order and duration update without reload, with explicit ylos/alas controls on mobile                                 | Productive | Drag-only interactions on phone             |
| 6    | Saves session                                                        | Inline save state and confirmation shown                                                                             | Reassured  | Silent save failure                         |
| 7    | Prints or shares session                                             | Printable summary or share action available                                                                          | Relief     | Unclear next step at completion             |

**Success criteria**:

- Coach creates and saves a session with 5 drills in one flow
- Session can be reopened and edited later
- Mobile planning works without horizontal scroll

**Key friction risks**:

- Auth friction on planner entry
- Search quality weaker than current browse/search expectations
- Session save uncertainty
- Recovery messaging must stay explicit if backend save fails

---

## Journey 3: Assistant Coach Reuses an Existing Session (Planned Repeat Flow)

**Actor**: Assistant Coach Anu
**Goal**: Start from last week's session instead of rebuilding from scratch
**Device**: iPad or laptop
**Context**: Office, 1 day before practice

| Step | Action                      | System Response                             | Emotion    |
| ---- | --------------------------- | ------------------------------------------- | ---------- |
| 1    | Opens planner               | Recent sessions list visible                | Efficient  |
| 2    | Opens previous session      | Full session loads with blocks and metadata | Relieved   |
| 3    | Swaps 1-2 drills            | Search/filter helps replace drills quickly  | In control |
| 4    | Adjusts durations/notes     | Total time updates live                     | Satisfied  |
| 5    | Saves revised session       | Confirmation shown                          | Confident  |
| 6    | Prints or shares internally | Session ready for practice                  | Done       |

**Pain point being solved**: repeated weekly session setup should not require re-selecting raw files
**Opportunity**: make reuse the default planner behavior, not a secondary feature

**Test-version notes**:

- Sessions list must surface a clear `Uusi suunnitelma` path and recent drill cues without facilitator explanation.
- Builder drill discovery may use curated mock suggestions during testing, as long as add, reorder, note, and total feedback remain visible and believable.
- Mobile validation target is `375px` width with tap-first controls and no dependence on drag interactions.

---

## Journey 4: Editor Creates a Native Drill (Planned Editorial Flow)

**Actor**: Assistant Coach Anu or Club Admin Mika
**Goal**: Add a new structured drill to the catalog without relying on a PDF
**Device**: Laptop or tablet
**Context**: Desk-based content work, low immediate time pressure

| Step | Action                                | System Response                               | Emotion    | Pain Points              |
| ---- | ------------------------------------- | --------------------------------------------- | ---------- | ------------------------ |
| 1    | Opens editor route                    | Authenticated editor view loads               | Deliberate | Permission confusion     |
| 2    | Taps "Uusi harjoite"                  | Empty drill form appears                      | Productive | Form may feel long       |
| 3    | Adds title, summary, tags, age groups | Validation helps complete required fields     | Structured | Overly strict validation |
| 4    | Adds diagram and attachments          | Upload/link state is visible                  | Confident  | Upload failures          |
| 5    | Saves draft                           | Draft state preserved                         | Safe       | Fear of losing work      |
| 6    | Publishes drill                       | Drill becomes visible in coach-facing catalog | Satisfied  | Publish state unclear    |

**Success criteria**:

- Editor can create and publish a native drill without touching Drive folder structure
- Published drill appears in coach-facing search/catalog promptly

---

## Journey 5: Editor Converts a PDF Into a Structured Drill (Planned Migration Flow)

**Actor**: Club Admin Mika
**Goal**: Convert a useful legacy PDF into a reusable structured drill
**Device**: Laptop
**Context**: Migration and curation work

| Step | Action                    | System Response                             | Emotion    |
| ---- | ------------------------- | ------------------------------------------- | ---------- |
| 1    | Opens import queue        | Pending imports visible                     | Organized  |
| 2    | Selects PDF/Drive source  | System creates import draft                 | Curious    |
| 3    | Reviews extracted fields  | Confidence and missing fields shown clearly | Skeptical  |
| 4    | Fixes metadata manually   | Editor preserves progress                   | In control |
| 5    | Publishes converted drill | Original PDF remains attached as reference  | Satisfied  |
| 6    | Verifies drill in catalog | Coach-facing result is usable               | Done       |

**Requirement**: import automation never bypasses human review for publication
**Risk**: low-confidence extraction could create misleading drill records if review UX is weak

---

## Journey 6: Unauthorized User Hits an Editor Route (Planned Access Split Recovery)

**Actor**: Coach without editor role
**Goal**: Understand why editing is unavailable and recover gracefully
**Device**: Phone or laptop

| Step | Action                            | System Response                                           | Expected Behavior           |
| ---- | --------------------------------- | --------------------------------------------------------- | --------------------------- |
| 1    | Opens editor route or edit action | Access check runs                                         | No broken screen            |
| 2    | Lacks permission                  | Show clear Finnish message explaining read-only access    | User understands limitation |
| 3    | Chooses recovery action           | "Palaa harjoitteisiin" or "Palaa suunnitelmiin" available | User continues working      |

**Requirement**: permission failures must be recoverable, not dead ends

---

## Journey 7: Error Recovery

**Actor**: Coach or editor
**Goal**: Recover from service failure without losing work

### Browse-mode failure

| Step | Action     | System Response      | Expected Behavior                          |
| ---- | ---------- | -------------------- | ------------------------------------------ |
| 1    | Opens app  | Drive/API call fails | Show friendly Finnish error message        |
| 2    | Taps retry | App retries          | Returns to normal flow if service recovers |

### Planner/CMS failure

| Step | Action                              | System Response                          | Expected Behavior                          |
| ---- | ----------------------------------- | ---------------------------------------- | ------------------------------------------ |
| 1    | Saves session or drill              | Save fails                               | Preserve local state and show inline error |
| 2    | Auth expired or backend unavailable | Prompt re-auth or retry                  | User does not lose edits                   |
| 3    | Retries save                        | Save succeeds or clear next action shown | Recovery path remains visible              |

**Requirement**: never fail silently; always preserve user effort where possible

---

## Critical Moments

| Moment                      | What makes or breaks the experience                          |
| --------------------------- | ------------------------------------------------------------ |
| First browse result appears | Must remain under 5 seconds on mobile                        |
| Drill search result         | Must feel instant, whether in browse mode or planner catalog |
| First saved session         | This is the key proof that planner value exists              |
| Permission boundary         | Must be clear without blocking read-only work                |
| Import review               | Must help editors trust what they are publishing             |

---

## Design Implications

- Keep browse mode optimized for no-login field use.
- Make planner reuse more important than planner complexity.
- Keep editor/import flows separate from coach-facing navigation.
- Use structured drills as the planner default; legacy PDFs are fallback/reference content.
- Ensure mobile planning works even if editor workflows remain tablet/desktop-first.
