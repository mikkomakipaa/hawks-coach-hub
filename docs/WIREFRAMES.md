# Wireframes & Screen Layouts

**Project**: Hawks Coach Hub
**Last Updated**: 2026-02-28

---

## Screen Index

1. Browse Mode (Desktop)
2. Browse Mode (Mobile)
3. Coach Planner - Sessions List
4. Coach Planner - Session Builder (Desktop/Tablet)
5. Coach Planner - Session Builder (Mobile)
6. Drill Catalog
7. Drill Detail
8. Editor Drill Form
9. Import Review Queue
10. Permission Denied State
11. Error State

---

## 1. Browse Mode (Desktop)

```text
┌─────────────────────────────────────────────────────────────────────┐
│ 🦅 Hawks Coach Hub                         [🔍 Etsi...]  [⟳ Päivitä]│
├─────────────────────────────────────────────────────────────────────┤
│ [Käsikirja] [Harjoitukset ●] [Taktiikka] [Videot] [Kausisuunnitelma]│
├─────────────────────────────────────────────────────────────────────┤
│ 127 tiedostoa · Harjoitukset                                        │
├──────────────────┬──────────────────┬──────────────────┬────────────┤
│ 📄 Harjoitus 1  │ 📄 Harjoitus 2  │ 🎬 Laukaushar.. │ 📄 Peliavar│
│ Kulmataistelu   │ Puolustuspeli   │ 204 KB          │ joja       │
│ 2.2 MB          │ 1.1 MB          │ Muok. 15.1.2026 │ 890 KB     │
│ [Avaa] [⬇]     │ [Avaa] [⬇]     │ [Avaa] [⬇]     │ [Avaa] [⬇]│
└──────────────────┴──────────────────┴──────────────────┴────────────┘
```

Notes:

- Existing browse mode remains the fastest no-login flow.
- Planner/editor features must not add noise here.

---

## 2. Browse Mode (Mobile)

```text
┌────────────────────────────────────┐
│ 🦅 Hawks Hub             [🔍] [⟳] │
├────────────────────────────────────┤
│ [Käsikirja][Harjoitukset●][Tak...] │
├────────────────────────────────────┤
│ 127 tiedostoa                      │
├────────────────────────────────────┤
│ 📄 Harjoitus 1 - Kulmataistelu    │
│    2.2 MB · 2.2.2026               │
│                      [Avaa] [⬇]   │
├────────────────────────────────────┤
│ 📁 Laukaukset (8 tiedostoa)       │
│                           [Avaa→] │
└────────────────────────────────────┘
```

Notes:

- No horizontal page scroll.
- Touch targets remain large.

---

## 3. Coach Planner - Sessions List

```text
┌─────────────────────────────────────────────────────────────────────┐
│ 🦅 Hawks Coach Hub          [Selaa] [Suunnitelmat●] [Harjoitteet]  │
├─────────────────────────────────────────────────────────────────────┤
│ Harjoitussuunnitelmat                               [+ Uusi]        │
├─────────────────────────────────────────────────────────────────────┤
│ U12 - Maanantaiharjoitus         3.3.2026 · 75 min          [Avaa] │
│ U14 - Puolustusharjoitus        28.2.2026 · 60 min          [Avaa] │
│                                                                     │
│ Viimeksi kaytetyt harjoitteet                                       │
│ [Kulmataistelu] [Peruslaukaus] [2v2 puolustus]                      │
└─────────────────────────────────────────────────────────────────────┘
```

Notes:

- Sessions list is the coach entry point for repeat planning.
- Recent drills help first action happen quickly.

---

## 4. Coach Planner - Session Builder (Desktop/Tablet)

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ← Suunnitelmat   U12 - Maanantaiharjoitus          [Tulosta] [Jaa] │
├─────────────────────────────────────────────────────────────────────┤
│ Valmentaja [Harri Virtanen]  Pvm [2026-03-03]  Ryhma [U12]         │
│ Tavoite [75] min                                                   │
├──────────────────────────────────┬──────────────────────────────────┤
│ HARJOITTEET                     │ SUUNNITELMA                      │
│ [🔍 Etsi harjoite]              │ Kaytetty: 60 / 75 min           │
│ [Laukaukset] [Puolustus]        │                                  │
│                                  │ 1. Alkulammittely  [10 min]     │
│ [diagram] Kulmataistelu          │ 2. Kulmataistelu   [15 min]     │
│ Laukaukset         [+ Lisaa]     │    [Muistiinpanot] [Poista]     │
│                                  │ 3. Loppupeli       [15 min]     │
│ [diagram] Peruslaukaus           │                                  │
│ Laukaukset         [+ Lisaa]     │ [Lisaa lohko] [Vie JSON]        │
└──────────────────────────────────┴──────────────────────────────────┘
```

Notes:

- Coach-facing metadata is concise.
- Totals remain visible during editing.

---

## 5. Coach Planner - Session Builder (Mobile)

```text
┌──────────────────────────────────────────────┐
│ ← Suunnitelmat                 [Tulosta]     │
├──────────────────────────────────────────────┤
│ U12 - Maanantaiharjoitus                     │
│ Valmentaja [.................]               │
│ Pvm [2026-03-03]  Ryhma [U12]               │
│ Tavoite [75] min                             │
├──────────────────────────────────────────────┤
│ Etsi harjoite [.........................]    │
│ [Laukaukset] [Puolustus]                    │
│ [diagram] Kulmataistelu      [+ Lisaa]      │
│ [diagram] Peruslaukaus       [+ Lisaa]      │
├──────────────────────────────────────────────┤
│ Suunnitelma   60 / 75 min                   │
│ 1. Alkulammittely [10 min] [Poista]         │
│    [Siirra ylos] [Siirra alas]              │
│ 2. Kulmataistelu [15 min]                   │
│    [Muistiinpanot] [Poista]                 │
│    [Siirra ylos] [Siirra alas]              │
│ [Lisaa lohko] [Vie JSON]                    │
└──────────────────────────────────────────────┘
```

Notes:

- No drag-only interactions.
- No horizontal scrolling at `375px`.

---

## 6. Drill Catalog

```text
┌─────────────────────────────────────────────────────────────────────┐
│ 🦅 Hawks Coach Hub            [Selaa] [Suunnitelmat] [Harjoitteet●]│
├─────────────────────────────────────────────────────────────────────┤
│ [🔍 Etsi harjoite]  [Ikaryhma] [Kategoria] [Tagit]                 │
├─────────────────────────────────────────────────────────────────────┤
│ [diagram] Kulmataistelu          [diagram] Peruslaukaus            │
│ Laukaukset · U12/U14             Laukaukset · U10/U12             │
│ 15 min · 6-8 pelaajaa            10 min · 4-6 pelaajaa            │
│ [Avaa] [+ Lisaa suunnitelmaan]   [Avaa] [+ Lisaa suunnitelmaan]   │
└─────────────────────────────────────────────────────────────────────┘
```

Notes:

- Coach-facing drill cards show only planning-relevant metadata.
- Priority order on cards: title, summary, age fit, duration, player count, intensity, then skill tags.
- Search must stay visible above the fold, and quick filters should cover common coach paths like age, category, and high-intensity work.
- Editor controls do not appear here for non-editors.

---

## 7. Drill Detail

```text
┌──────────────────────────────────────────────────────────────┐
│ ← Harjoitteet                     Kulmataistelu              │
├──────────────────────────────────────────────────────────────┤
│ [DIAGRAM IMAGE]                                               │
├──────────────────────────────────────────────────────────────┤
│ Kategoria: Laukaukset                                        │
│ Ikaryhmat: U12, U14                                          │
│ Kesto: 15 min                                                │
│ Pelaajat: 6-8                                                │
├──────────────────────────────────────────────────────────────┤
│ Kuvaus                                                       │
│ Harjoitteen lyhyt kuvaus...                                  │
├──────────────────────────────────────────────────────────────┤
│ Valmennuspisteet                                             │
│ - Sulje tila nopeasti                                        │
│ - Ajoita suunnanmuutos                                       │
├──────────────────────────────────────────────────────────────┤
│ [Lisaa suunnitelmaan] [Avaa liitteet]                        │
└──────────────────────────────────────────────────────────────┘
```

Notes:

- Drill detail should make a PDF optional, not required.
- Detail priority order: add-to-session action, visual/diagram area, planning metadata, description/setup, coaching points, then attachments.
- If Airtable-backed media or long-form content is missing in the first test version, show an intentional placeholder instead of leaving empty gaps.

---

## 8. Editor Drill Form

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ← Harjoitteet                    Uusi harjoite          [Tallenna]  │
├─────────────────────────────────────────────────────────────────────┤
│ Otsikko [.......................................................]   │
│ Yhteenveto [....................................................]   │
│ Kategoria [Laukaukset ▼]   Ikaryhmat [U12][U14][U16]               │
│ Kesto [15] min   Pelaajat [6] - [8]                                 │
├─────────────────────────────────────────────────────────────────────┤
│ Kuvaus                                                              │
│ [ rich text / structured fields ]                                   │
├─────────────────────────────────────────────────────────────────────┤
│ Valmennuspisteet                                                    │
│ [+ Lisaa kohta]                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Liitteet                                                            │
│ [Lataa kuva] [Liita Drive-PDF] [Liita linkki]                       │
├─────────────────────────────────────────────────────────────────────┤
│ [Tallenna luonnos] [Julkaise]                                       │
└─────────────────────────────────────────────────────────────────────┘
```

Notes:

- Editor flow is desktop/tablet-first.
- Save state and validation must be visible inline.

---

## 9. Import Review Queue

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ← Harjoitteet                        Tuontijono                     │
├─────────────────────────────────────────────────────────────────────┤
│ PDF: kulmataistelu.pdf         Luottamus: keskitaso       [Avaa]   │
│ PDF: 2v2-puolustus.pdf         Luottamus: matala          [Avaa]   │
├─────────────────────────────────────────────────────────────────────┤
│ Valittu tuonti                                                     │
│ Otsikko [Kulmataistelu.................................]            │
│ Kategoria [Laukaukset ▼]                                           │
│ Puuttuvat kentat: valmennuspisteet, pelaajamaara                   │
│ [Hyvaksy luonnokseksi] [Hylkaa]                                    │
└─────────────────────────────────────────────────────────────────────┘
```

Notes:

- Confidence must be explicit.
- Human review is mandatory before publish.

---

## 10. Permission Denied State

```text
┌─────────────────────────────────────────────────────────────────────┐
│ 🦅 Hawks Coach Hub                                                 │
├─────────────────────────────────────────────────────────────────────┤
│ Et voi muokata harjoitteita tällä tunnuksella.                     │
│                                                                     │
│ Voit silti selata harjoitteita ja käyttää suunnitelmia.            │
│                                                                     │
│ [Palaa harjoitteisiin]   [Palaa suunnitelmiin]                     │
└─────────────────────────────────────────────────────────────────────┘
```

Notes:

- Recovery is explicit.
- Permission failure should never strand the user.

---

## 11. Error State

```text
┌─────────────────────────────────────────────────────────────────────┐
│ 🦅 Hawks Coach Hub                                        [⟳]      │
├─────────────────────────────────────────────────────────────────────┤
│ Harjoitusmateriaalit eivat ole juuri nyt saatavilla.               │
│ Tarkista verkkoyhteys ja yrita uudelleen.                          │
│                                                                     │
│ [Yrita uudelleen]                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

Notes:

- Browse, planner, and editor errors should follow the same recovery principle:
  clear explanation, preserved work where possible, and an obvious retry path.

---

## Design Notes

- All user-facing text should remain in Finnish.
- Hawks visual identity remains intact across new surfaces.
- Browse mode stays visually lightweight and immediate.
- Coach planner surfaces prioritize speed and clarity.
- Editor/admin surfaces can be denser, but must stay structured and keyboard-friendly.

---

## Planned MS1 Navigation and Screens (expert review, 2026-11-05)

Not yet drawn. This is the list the review says must exist before MS1 screens are built.

### Information architecture

- Top level: Selaa | Harjoitteet | Joukkue (editor behind role). On phones the primary destinations also sit in a bottom bar within thumb reach; editor stays out of it.
- Inside Joukkue, a short swipeable tab row: Yleiskatsaus | Arviointi | Tavoitteet | Ohjelma | Harjoitukset.
- Breadcrumbs only on deep screens (Ohjelma > Jakso > Viikko). Always a "back to Joukkue" link, and the current team name and season in the header (multi-team ready).
- New routes under `/team`, `/team/assess`, `/team/goals`, `/team/program/...`; the existing hash router stays so the previous IA can be restored. Coach routes are lazy-loaded.

### Screens to wireframe (mobile first, then tablet)

1. Sign-in and no-access
2. Create team (name, age group, season; save-fail retry)
3. Joukkue overview in three states: first run (checklist), active (this week, next session, goals, strengths), no data
4. Team assessment, one category per screen, with summary and sync state
5. Team strengths and next development areas, with change since last time and a "not enough assessments" state
6. Observation quick-add (bottom sheet) and list
7. Team goals: list, create (sentence template), review
8. Program: season > cycle > week, week detail (focus, goals, sessions)
9. Session builder from a week (extend wireframes 4-5 with week link, focus chips, coverage note)
10. Session record (one-screen bottom sheet, offline-capable)
11. Drill search: search plus Taito, Ikäryhmä and Kesto chips, team-focus preset, Drive material collapsed
12. Sync and conflict screens, offline banner (shared)
13. Share and print for the week
14. Goal review prompt with reassess action
15. Permission-denied and error states for the new routes

### First run

Three-step checklist on the overview: assess the team (about 2 minutes), pick one to three goals, plan the first week. Pre-filled season, suggested team name, optional clearly labelled demo data, dismissable inline hints instead of a tour modal.

### Required states per screen

Empty, loading (skeleton or spinner), error with retry, no permission, offline, and "no assessment yet" where relevant.
