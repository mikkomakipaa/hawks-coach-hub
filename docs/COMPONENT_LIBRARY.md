# Component Library

**Project**: Hawks Coach Hub
**Last Updated**: 2026-03-01
**Location**: `src/components/ui/`
**Status**: Stable — adopt for all new UI surfaces

---

## Why this library exists

Browse mode, planner, and editor surfaces all share the same visual language (Hawks orange, system font, 12px/16px border-radius, 48px touch targets) but historically re-implemented buttons, badges, empty states, and cards ad-hoc. This library extracts those patterns into typed factory functions that are:

- **XSS-safe** — no `innerHTML`. All text set via `.textContent`.
- **Framework-agnostic** — plain `HTMLElement` factory functions. Compatible with Preact if ADR-14 resolves that way.
- **Accessible** — ARIA roles, focus styles, 44px+ touch targets, Finnish `aria-label` defaults.

---

## Design token reference

All components build on CSS variables defined in `styles-minimal.css`:

| Token                  | Value                       | Used for                       |
| ---------------------- | --------------------------- | ------------------------------ |
| `--hawks-orange`       | `#ffa000`                   | Primary actions, active states |
| `--hawks-dark-orange`  | `#f57c00`                   | Hover / pressed state          |
| `--hawks-light-orange` | `#ffb74d`                   | Subtle tints                   |
| `--neutral-dark`       | `#212529`                   | Body text, headings            |
| `--neutral-medium`     | `#6c757d`                   | Secondary text, labels         |
| `--neutral-light`      | `#f8f9fa`                   | Backgrounds                    |
| `--border-radius`      | `12px`                      | Cards, buttons, inputs         |
| `--border-radius-lg`   | `16px`                      | Modals, large cards            |
| `--shadow-sm`          | `0 2px 4px rgba(0,0,0,0.1)` | Card lift                      |
| `--transition`         | `all 0.3s ease`             | Animations                     |

---

## Components

### `createButton` — `src/components/ui/button.ts`

**Purpose**: All interactive buttons. Replaces `.action-btn`, `.refresh-btn`, `.drill-card-primary-action`, `.auth-btn`, `.planning-toggle-btn`.

**Props**:

| Prop       | Type                                              | Default     | Description                                        |
| ---------- | ------------------------------------------------- | ----------- | -------------------------------------------------- |
| `label`    | `string`                                          | required    | Button text (set via textContent, never innerHTML) |
| `variant`  | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | Visual style                                       |
| `size`     | `'sm' \| 'md'`                                    | `'md'`      | md = 44px mobile height, sm = 36px                 |
| `icon`     | `string`                                          | —           | Prepend emoji/character icon (hidden from a11y)    |
| `loading`  | `boolean`                                         | `false`     | Shows spinner, disables button                     |
| `disabled` | `boolean`                                         | `false`     | Disables button                                    |
| `onClick`  | `(e: MouseEvent) => void`                         | —           | Click handler                                      |

**CSS classes**: `.ui-btn`, `.ui-btn--{variant}`, `.ui-btn--sm`, `.ui-btn--loading`

**Usage**:

```typescript
import { createButton } from '@/components/ui';

// Primary CTA
const save = createButton({ label: 'Tallenna', onClick: handleSave });

// Loading state (e.g. after click)
const submit = createButton({
  label: 'Tallentaa...',
  variant: 'primary',
  loading: true,
});

// Destructive action
const del = createButton({
  label: 'Poista',
  variant: 'danger',
  onClick: confirmDelete,
});

// Small secondary in toolbar
const clear = createButton({
  label: 'Tyhjennä',
  variant: 'secondary',
  size: 'sm',
  onClick: reset,
});

// With icon
const add = createButton({
  label: 'Lisää harjoite',
  icon: '+',
  onClick: addDrill,
});
```

**Do / Don't**:

- ✅ Always provide a meaningful `label` (screen reader text)
- ✅ Use `loading: true` while async operations are in progress — do not just `disabled`
- ❌ Don't use for navigation links — use `<a>` with `.route-nav-link` or `.view-shell-link`
- ❌ Don't pass HTML in `label` — it will be rendered as literal text

---

### `createBadge` — `src/components/ui/badge.ts`

**Purpose**: Inline status/type labels. Replaces `.drill-card-tag`, `.content-type-badge`, `.planner-session-card-badge`.

**Props**:

| Prop       | Type                                                                     | Default     | Description                         |
| ---------- | ------------------------------------------------------------------------ | ----------- | ----------------------------------- |
| `label`    | `string`                                                                 | required    | Badge text                          |
| `variant`  | `'default' \| 'primary' \| 'success' \| 'warning' \| 'danger' \| 'info'` | `'default'` | Semantic color                      |
| `fileType` | `'pdf' \| 'video' \| 'doc' \| 'image'`                                   | —           | File-type color (overrides variant) |

**CSS classes**: `.ui-badge`, `.ui-badge--{variant}`, `.ui-badge--file-{type}`

**Usage**:

```typescript
import { createBadge } from '@/components/ui';

// Drill skill tag
const tag = createBadge({ label: 'Laukaus', variant: 'primary' });

// File type
const pdfBadge = createBadge({ label: 'PDF', fileType: 'pdf' });

// Session status
const live = createBadge({ label: 'Aktiivinen', variant: 'success' });
const draft = createBadge({ label: 'Luonnos', variant: 'warning' });
```

---

### `createEmptyState` — `src/components/ui/empty-state.ts`

**Purpose**: Centered placeholder for empty results, errors, or no-content screens. Replaces three ad-hoc empty state implementations in `file-display.ts`.

**Props**:

| Prop      | Type                                        | Default        | Description                     |
| --------- | ------------------------------------------- | -------------- | ------------------------------- |
| `heading` | `string`                                    | required       | Primary message                 |
| `icon`    | `string`                                    | —              | Emoji or short text icon        |
| `message` | `string`                                    | —              | Supporting explanation          |
| `action`  | `ButtonOptions`                             | —              | Optional recovery button        |
| `variant` | `'no-content' \| 'search-empty' \| 'error'` | `'no-content'` | Adjusts heading color for error |

**CSS classes**: `.ui-empty-state`, `.ui-empty-state--{variant}`, `.ui-empty-state__icon`, `.ui-empty-state__heading`, `.ui-empty-state__message`

**Usage**:

```typescript
import { createEmptyState } from '@/components/ui';

// No search results
const noResults = createEmptyState({
  icon: '🔍',
  heading: 'Ei hakutuloksia',
  message: 'Kokeile eri hakusanaa.',
  variant: 'search-empty',
  action: { label: 'Tyhjennä haku', onClick: clearSearch },
});

// Empty folder
const emptyFolder = createEmptyState({
  icon: '📁',
  heading: 'Kansio on tyhjä',
  variant: 'no-content',
});

// Load error
const loadError = createEmptyState({
  icon: '⚠',
  heading: 'Lataaminen epäonnistui',
  message: 'Tarkista verkkoyhteys ja yritä uudelleen.',
  variant: 'error',
  action: { label: 'Yritä uudelleen', variant: 'secondary', onClick: retry },
});
```

---

### `createLoadingSpinner` — `src/components/ui/spinner.ts`

**Purpose**: Inline animated indicator for pending states.

**Props**:

| Prop    | Type                   | Default         | Description        |
| ------- | ---------------------- | --------------- | ------------------ |
| `size`  | `'sm' \| 'md' \| 'lg'` | `'md'`          | 14px / 20px / 32px |
| `label` | `string`               | `'Ladataan...'` | Finnish aria-label |

**CSS classes**: `.ui-spinner`, `.ui-spinner--sm`, `.ui-spinner--lg`

**Usage**:

```typescript
import { createLoadingSpinner } from '@/components/ui';

const spinner = createLoadingSpinner(); // 20px, default Finnish label
const small = createLoadingSpinner({ size: 'sm', label: 'Haetaan...' });
```

---

### `createSkeletonItem` — `src/components/ui/skeleton.ts`

**Purpose**: Animated placeholder for list items while content loads. Replaces `createSkeletonItem()` in `file-display.ts`.

**Props**:

| Prop       | Type      | Default | Description                         |
| ---------- | --------- | ------- | ----------------------------------- |
| `lines`    | `number`  | `2`     | Number of text lines                |
| `showIcon` | `boolean` | `true`  | Show the icon-sized box on the left |

**CSS classes**: `.ui-skeleton`, `.ui-skeleton__icon`, `.ui-skeleton__content`, `.ui-skeleton__line`, `.ui-skeleton__line--title`

**Usage**:

```typescript
import { createSkeletonItem } from '@/components/ui';

// Standard file skeleton
const skel = createSkeletonItem();

// Text-only list skeleton (no icon)
const textSkel = createSkeletonItem({ showIcon: false, lines: 3 });

// Render multiple
for (let i = 0; i < 6; i++) {
  container.appendChild(createSkeletonItem());
}
```

---

### `createInlineAlert` — `src/components/ui/inline-alert.ts`

**Purpose**: Contextual feedback banner within a page region (not floating). Use for auth errors in planner, validation feedback in editor, or connection warnings in browse mode.

**Props**:

| Prop          | Type                                          | Default  | Description                      |
| ------------- | --------------------------------------------- | -------- | -------------------------------- |
| `type`        | `'info' \| 'warning' \| 'error' \| 'success'` | required | Color and icon                   |
| `message`     | `string`                                      | required | Alert text                       |
| `action`      | `ButtonOptions`                               | —        | Optional action button (sm size) |
| `dismissible` | `boolean`                                     | `false`  | Adds × button                    |
| `onDismiss`   | `() => void`                                  | —        | Called when dismissed            |

**CSS classes**: `.ui-alert`, `.ui-alert--{type}`, `.ui-alert__icon`, `.ui-alert__message`, `.ui-alert__action`, `.ui-alert__close`

**Usage**:

```typescript
import { createInlineAlert } from '@/components/ui';

// Auth warning with action
const authWarn = createInlineAlert({
  type: 'warning',
  message: 'Istuntosi on vanhentunut. Kirjaudu uudelleen jatkaaksesi.',
  action: { label: 'Kirjaudu', onClick: login },
  dismissible: true,
});

// Inline save error
const saveErr = createInlineAlert({
  type: 'error',
  message: 'Tallennus epäonnistui. Tarkista verkkoyhteys.',
});
```

---

### `createModal` — `src/components/ui/modal.ts`

**Purpose**: Focus-trapped dialog overlay. Replaces ad-hoc `.modal-overlay` patterns.

**Props**:

| Prop      | Type                   | Default  | Description                     |
| --------- | ---------------------- | -------- | ------------------------------- |
| `title`   | `string`               | required | Modal heading                   |
| `content` | `HTMLElement`          | required | Body content element            |
| `footer`  | `HTMLElement`          | —        | Footer element (buttons etc.)   |
| `onClose` | `() => void`           | required | Called when closed by any means |
| `size`    | `'sm' \| 'md' \| 'lg'` | `'md'`   | 400px / 560px / 720px max-width |

**Returns**: `{ overlay: HTMLElement, close: () => void }`

Behaviour: ESC closes, click-outside closes, `document.body.overflow` locked while open.

**CSS classes**: `.ui-modal-overlay`, `.ui-modal`, `.ui-modal--{size}`, `.ui-modal__header`, `.ui-modal__title`, `.ui-modal__close`, `.ui-modal__body`, `.ui-modal__footer`

**Usage**:

```typescript
import { createModal } from '@/components/ui';
import { createButton } from '@/components/ui';

function openConfirmModal(onConfirm: () => void): void {
  const body = document.createElement('p');
  body.textContent = 'Poistetaanko harjoite pysyvästi?';

  const footer = document.createElement('div');

  const { overlay, close } = createModal({
    title: 'Vahvista poisto',
    content: body,
    footer,
    size: 'sm',
    onClose: () => console.log('closed'),
  });

  footer.appendChild(
    createButton({ label: 'Peruuta', variant: 'ghost', onClick: close })
  );
  footer.appendChild(
    createButton({
      label: 'Poista',
      variant: 'danger',
      onClick: () => {
        onConfirm();
        close();
      },
    })
  );

  document.body.appendChild(overlay);
}
```

**Do / Don't**:

- ✅ Always clean up: the `close()` function removes the overlay and restores scroll
- ✅ Append `overlay` to `document.body` directly
- ❌ Don't nest modals — the ESC handler only closes the most recently registered one

---

### `createFormField` — `src/components/ui/form-field.ts`

**Purpose**: Label + input + hint/error wrapper for consistent form layout. Replaces `.planner-draft-field`, `.editor-drill-field`, `.form-group`.

**Props**:

| Prop       | Type          | Default        | Description                              |
| ---------- | ------------- | -------------- | ---------------------------------------- |
| `label`    | `string`      | required       | Field label text                         |
| `input`    | `HTMLElement` | required       | Any input element                        |
| `hint`     | `string`      | —              | Helper text (not shown if error present) |
| `error`    | `string`      | —              | Validation error text                    |
| `required` | `boolean`     | `false`        | Appends ` *` and marks label             |
| `id`       | `string`      | auto-generated | Override the generated input id          |

**CSS classes**: `.ui-field`, `.ui-field--error`, `.ui-field__label`, `.ui-field__required`, `.ui-field__hint`, `.ui-field__error`

**Usage**:

```typescript
import { createFormField } from '@/components/ui';

// Text input with hint
const nameInput = document.createElement('input');
nameInput.type = 'text';
const nameField = createFormField({
  label: 'Harjoitteen nimi',
  input: nameInput,
  hint: 'Esim. "Kulmataistelu 1v1"',
  required: true,
});

// Select with validation error
const catSelect = document.createElement('select');
const catField = createFormField({
  label: 'Kategoria',
  input: catSelect,
  error: 'Valitse kategoria jatkaaksesi.',
});
```

---

### `createCard` — `src/components/ui/card.ts`

**Purpose**: Base card container used by file cards and drill cards.

**Props**:

| Prop       | Type                         | Default     | Description                        |
| ---------- | ---------------------------- | ----------- | ---------------------------------- |
| `children` | `HTMLElement[]`              | required    | Card content elements              |
| `variant`  | `'default' \| 'interactive'` | `'default'` | Interactive adds hover state       |
| `onClick`  | `(e: MouseEvent) => void`    | —           | If provided, renders as `<button>` |

**CSS classes**: `.ui-card`, `.ui-card--interactive`

**Usage**:

```typescript
import { createCard } from '@/components/ui';

// Static info card
const card = createCard({ children: [heading, body] });

// Clickable drill card
const drillCard = createCard({
  children: [titleEl, metaEl, actionsEl],
  variant: 'interactive',
  onClick: () => openDrillDetail(drill.id),
});
```

---

### `createMetaList` — `src/components/ui/meta-list.ts`

**Purpose**: Key-value pair display using `<dl>` 2-column grid. Replaces `<dl class="drill-card-meta">` patterns.

**Props**:

| Prop    | Type                                      | Description     |
| ------- | ----------------------------------------- | --------------- |
| `items` | `Array<{ label: string; value: string }>` | Key-value pairs |

**CSS classes**: `.ui-meta-list`, `.ui-meta-list__item`, `.ui-meta-list__label`, `.ui-meta-list__value`

**Usage**:

```typescript
import { createMetaList } from '@/components/ui';

const meta = createMetaList({
  items: [
    { label: 'Pelaajat', value: '6–12' },
    { label: 'Kesto', value: '10–15 min' },
    { label: 'Teho', value: 'Korkea' },
    { label: 'Ikäryhmä', value: 'U14+' },
  ],
});
```

---

## Composition example

A complete drill card using library primitives:

```typescript
import {
  createCard,
  createBadge,
  createMetaList,
  createButton,
} from '@/components/ui';

function buildDrillCard(drill: Drill, onAdd: () => void): HTMLElement {
  const titleEl = document.createElement('h3');
  titleEl.className = 'drill-card-title';
  titleEl.textContent = drill.title;

  const badge = createBadge({ label: drill.category, variant: 'primary' });

  const meta = createMetaList({
    items: [
      { label: 'Kesto', value: formatDuration(drill.durationMin) },
      { label: 'Teho', value: formatIntensity(drill.intensityLevel) },
    ],
  });

  const addBtn = createButton({
    label: '+ Lisää',
    size: 'sm',
    variant: 'secondary',
    onClick: onAdd,
  });

  return createCard({
    children: [badge, titleEl, meta, addBtn],
    variant: 'interactive',
  });
}
```

---

## Naming conventions

| Layer              | Convention                                                                  |
| ------------------ | --------------------------------------------------------------------------- |
| Factory functions  | `create{ComponentName}` — e.g. `createButton`                               |
| Options interfaces | `{ComponentName}Options` — e.g. `ButtonOptions`                             |
| CSS classes        | `.ui-{component}`, `.ui-{component}--{modifier}`, `.ui-{component}__{part}` |
| Files              | `kebab-case.ts` — e.g. `empty-state.ts`                                     |

---

## Accessibility checklist

When composing components:

- [ ] All interactive elements have ≥44px touch target (48px on mobile)
- [ ] Buttons created with `createButton` always have visible text (screen reader)
- [ ] Icon-only buttons: add `aria-label` to the outer element or use `sr-only` span inside
- [ ] Spinners: `createLoadingSpinner` provides `role="status"` and Finnish `aria-label`
- [ ] Modals: `createModal` sets `role="dialog"` and `aria-modal="true"` automatically
- [ ] Alerts: `createInlineAlert` sets `role="alert"` automatically
- [ ] Empty states: icon has `aria-hidden="true"` so screen readers read heading only
- [ ] Form fields: `createFormField` links label to input via `htmlFor` / `id` automatically
- [ ] Focus visible: all components use `outline: 2px solid var(--hawks-orange)` on focus-visible

---

## Adding a new component

1. Create `src/components/ui/{name}.ts` — export the factory function and options interface
2. Add re-export to `src/components/ui/index.ts`
3. Add CSS section to `styles-minimal.css` under the UI Component Library block
4. Write at least 4 Vitest tests covering: renders correctly, variants, XSS safety, click handler
5. Add a section to this document with props table and usage example
6. Update `docs/COMPONENTS.md` — add entry under `src/components/ui/`
