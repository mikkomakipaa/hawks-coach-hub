import { describe, expect, it } from 'vitest';

import { createBadge } from './badge';

describe('createBadge', () => {
  it('renders a <span> with the label text', () => {
    const badge = createBadge({ label: 'Harjoite' });
    expect(badge.tagName).toBe('SPAN');
    expect(badge.textContent).toBe('Harjoite');
  });

  it('applies ui-badge base class', () => {
    const badge = createBadge({ label: 'X' });
    expect(badge.classList.contains('ui-badge')).toBe(true);
  });

  it('applies default variant class when no variant or fileType given', () => {
    const badge = createBadge({ label: 'X' });
    expect(badge.classList.contains('ui-badge--default')).toBe(true);
  });

  it('applies the requested variant class', () => {
    const variants = ['primary', 'success', 'warning', 'danger', 'info'] as const;
    for (const v of variants) {
      const badge = createBadge({ label: 'X', variant: v });
      expect(badge.classList.contains(`ui-badge--${v}`)).toBe(true);
    }
  });

  it('applies file-type class when fileType is provided (takes precedence over variant)', () => {
    const badge = createBadge({ label: 'PDF', fileType: 'pdf', variant: 'success' });
    expect(badge.classList.contains('ui-badge--file-pdf')).toBe(true);
    // variant class should NOT be applied when fileType is set
    expect(badge.classList.contains('ui-badge--success')).toBe(false);
  });

  it('applies file-type classes for all supported types', () => {
    const types = ['pdf', 'video', 'doc', 'image'] as const;
    for (const t of types) {
      const badge = createBadge({ label: t, fileType: t });
      expect(badge.classList.contains(`ui-badge--file-${t}`)).toBe(true);
    }
  });

  it('never uses innerHTML — label with injection attempt is safe', () => {
    const badge = createBadge({ label: '<b>bold</b>' });
    expect(badge.innerHTML).not.toContain('<b>');
    expect(badge.textContent).toContain('<b>bold</b>');
  });
});
