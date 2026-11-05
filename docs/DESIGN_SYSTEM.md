# Design System

**Project**: Hawks Coach Hub
**Last Updated**: 2026-02-28

---

## Design Principles

### 1. Speed First

Every design decision is evaluated against load time and interaction speed. No heavy animations, no layout-shift-causing elements, no large decorative images.

### 2. Mobile-First, Field-Ready

Coaches use this on phones at cold, loud rinks. Large touch targets, high contrast, glanceable layout.

### 3. Minimal & Functional

No gamification, no decorative elements. Content is the UI. Hawks branding is present but subtle.

### 4. Finnish Language

All UI copy in Finnish. File names from Drive are displayed as-is.

---

## Color Palette

### Primary Brand

- **Hawks Red**: `#C8102E` — primary accent, buttons, active states
- **Hawks Dark**: `#1A1A2E` — backgrounds, headers (dark navy)
- **White**: `#FFFFFF` — primary text on dark backgrounds, card backgrounds

### Semantic Colors

- **Success**: `#22C55E` (green-500) — file loaded, action confirmed
- **Error**: `#EF4444` (red-500) — load failure, API error
- **Info**: `#3B82F6` (blue-500) — informational messages
- **Loading**: `#6B7280` (gray-500) — skeleton loaders, pending states

### Neutral Grays

- `#F9FAFB` (gray-50) — page background
- `#F3F4F6` (gray-100) — card backgrounds
- `#E5E7EB` (gray-200) — borders, dividers
- `#9CA3AF` (gray-400) — placeholders, secondary text
- `#4B5563` (gray-600) — body text
- `#111827` (gray-900) — headings

### File Type Colors

- PDF: `#C8102E` (red — matches Adobe)
- Video: `#7C3AED` (purple)
- Google Doc: `#1D4ED8` (blue)
- Image: `#059669` (green)
- Other: `#6B7280` (gray)

---

## Typography

**Font**: System font stack

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

**Sizes**:

- Page title: 24px / `font-weight: 700`
- Tab label: 16px / `font-weight: 600`
- File name: 15px / `font-weight: 500`
- Metadata (size, date): 13px / `font-weight: 400` / `color: gray-500`
- Status messages: 14px / `font-weight: 400`
- Search input: 16px (prevents iOS zoom-on-focus)

---

## Spacing

Base unit: 4px

- XS: 4px
- S: 8px
- M: 16px
- L: 24px
- XL: 32px
- XXL: 48px

---

## Touch Targets

**Minimum 48px** for all interactive elements (iOS Human Interface Guidelines).

- Tab buttons: 48px height
- File cards: 64px minimum height
- Action buttons: 48px × 48px minimum
- Search input: 48px height

---

## Components

### File Card

```
┌─────────────────────────────────────────┐  ← 1px border, gray-200
│ [PDF]  Harjoitus 1 - Kulmataistelu.pdf  │  ← file name, 15px medium
│        204 KB · 15.1.2026               │  ← metadata, 13px gray-500
│                        [Avaa] [⬇]      │  ← action buttons, 40px
└─────────────────────────────────────────┘
```

- Background: white
- Border: 1px `gray-200`, radius 8px
- Hover: subtle shadow, `gray-100` background
- Selected: `red-50` background, `red-500` left border 3px

### Tab Bar

```
[Käsikirja] [Harjoitukset*] [Taktiikka] [Videot] ...
```

- Active tab: `red-600` bottom border 2px, `red-700` text
- Inactive: `gray-500` text
- Scroll horizontal on mobile (no wrapping)

### Search Input

```
[🔍 Etsi harjoituksia...              ]
```

- Full width
- 48px height
- Border: 1px `gray-300`, radius 8px
- Focus: `red-500` border

### Status/Loading Bar

```
⟳ Ladataan harjoitusmateriaaleja...
```

- Inline, not blocking
- Dismissed automatically on success

### Skeleton Card

```
┌─────────────────────────────────────────┐
│ ████████████████████         ███████    │  ← animated gray pulse
│ ████████████     ████████               │
└─────────────────────────────────────────┘
```

- CSS animation: `pulse 1.5s ease-in-out infinite`
- `gray-200` fill color

### Toast Notification

```
✓ Linkki kopioitu leikepöydälle
```

- Appears bottom-right (desktop) or bottom-center (mobile)
- Auto-dismiss after 3 seconds
- Success: green background
- Error: red background

### Shared Test-Version States

- Planner-, harjoite- ja editorinakyma kayttavat samaa state-surface rakennetta lataus-, tyhja-, virhe- ja oikeuspuutetiloissa.
- State-surface sisaltaa aina otsikon, lyhyen selitteen ja tarvittaessa yhden ensisijaisen palautus- tai jatkotoiminnon.
- Permission denied -tila ei nayta rikkinnaista lomaketta tai tyhjaa paneelia, vaan kertoo roolirajauksen suoraan suomeksi.
- Mockattu tallennus-, julkaisu- ja jakopalaute kaytetaan toastina ja tarvittaessa myos inline-bannerina, jotta osittaiset integraatiot tuntuvat tarkoituksellisilta.
- Kaikkien state-toimintojen kosketuspinta on vahintaan 48px.

---

## Icons

Use simple Unicode/emoji or CSS-drawn icons — no external icon library dependency:

- PDF: `📄`
- Video: `🎬`
- Folder: `📁`
- Download: `⬇`
- Open: `↗` or `Avaa`
- Search: `🔍`
- Refresh: `⟳`

If icons are added in future, prefer inline SVG over icon fonts.

---

## Layout

### Desktop (≥768px)

```
┌────────────────────────────────────────────────────────┐
│ Hawks Coach Hub                  [🔍 Etsi...]  [⟳]   │  ← header
├────────────────────────────────────────────────────────┤
│ [Käsikirja] [Harjoitukset] [Taktiikka] [Videot]       │  ← tabs
├────────────────────────────────────────────────────────┤
│ Harjoitukset > Laukaukset                              │  ← breadcrumb
├──────────┬──────────┬──────────┬──────────┬────────────┤
│ File     │ File     │ File     │ File     │ File       │  ← grid (3-4 col)
│ Card     │ Card     │ Card     │ Card     │ Card       │
└──────────┴──────────┴──────────┴──────────┴────────────┘
```

### Mobile (<768px)

```
┌───────────────────────────┐
│ Hawks Coach Hub    [🔍][⟳]│  ← compact header
├───────────────────────────┤
│ [Käsikirja][Harjoitukset] │  ← scrollable tabs
├───────────────────────────┤
│ File Card                 │  ← 1 column list
├───────────────────────────┤
│ File Card                 │
├───────────────────────────┤
│ File Card                 │
└───────────────────────────┘
```

---

## Hawks Branding

- Logo: `public/hawks.png` — display in header
- Primary color: Hawks Red `#C8102E`
- Secondary: Dark navy `#1A1A2E`
- Keep branding subtle — content is the focus, not branding

---

## Accessibility

- All interactive elements have visible focus styles
- Color is not the only indicator (icons + text always paired with color)
- Touch targets minimum 48px
- Screen reader: `aria-label` on icon-only buttons
- Keyboard navigation: Tab order follows visual order
- No auto-playing media

---

## Known Gaps and Additions (expert review, 2026-11-05)

Findings from the UI/UX review. Contrast ratios are the reviewer's estimates and must be re-measured with a tool before changing tokens.

### Accessibility gaps

| Area            | Gap                                                                                                                      | Direction                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Contrast        | `#9CA3AF` secondary text on white (about 2.5:1), white on `#22C55E` (about 2.3:1), `#EF4444` text on white (about 3.8:1) | Darker text tokens; do not use these pairs for body text                |
| Dark mode       | Not specified in this document although the project requires it                                                          | Define dark tokens and test every component                             |
| Reduced motion  | No rule (skeleton pulse)                                                                                                 | Respect `prefers-reduced-motion`                                        |
| Error feedback  | Toasts auto-dismiss in 3 s                                                                                               | Errors persist or appear as inline alerts                               |
| Icons           | Emoji icons are inconsistent for screen readers                                                                          | `aria-hidden` plus a text label                                         |
| Targets         | Some actions are 40 px                                                                                                   | 48 px minimum; 56 px on quick-capture screens                           |
| Rating controls | Colour-only buttons                                                                                                      | Radio group with text labels, visible focus                             |
| Route change    | Hash router does not move focus                                                                                          | Move focus to the page heading; `aria-live` for save state; `lang="fi"` |
| Testing         | No automated accessibility check                                                                                         | Add axe to CI                                                           |

### Sync and conflict pattern (shared component)

One persistent, non-modal chip on capture screens: saved, saving, offline (will save later), conflict. Rules: never block capture, never discard local input silently. Conflict screen offers "keep mine", "use theirs", "see differences". MS1 offline scope is draft-and-retry (see NFR-O04).

### Finnish glossary (suggested)

| Term          | Meaning     | Note                                            |
| ------------- | ----------- | ----------------------------------------------- |
| harjoite      | drill       | used for the library item                       |
| harjoitus     | session     | wireframes currently mix harjoite and harjoitus |
| viikko, jakso | week, cycle |                                                 |
| taito         | skill       |                                                 |
| tavoite       | goal        |                                                 |
| arviointi     | assessment  |                                                 |
| joukkue       | team        |                                                 |

Use correct diacritics (the wireframes drop them in places) and keep all copy in one file. Sinä or te is open (N17); sinä is common for sports volunteers.
