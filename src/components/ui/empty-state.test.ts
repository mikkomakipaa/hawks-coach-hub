import { describe, expect, it, vi } from 'vitest';

import { createEmptyState } from './empty-state';

describe('createEmptyState', () => {
  it('renders container with heading text', () => {
    const el = createEmptyState({ heading: 'Ei tuloksia' });
    expect(el.querySelector('.ui-empty-state__heading')?.textContent).toBe('Ei tuloksia');
  });

  it('applies no-content variant class by default', () => {
    const el = createEmptyState({ heading: 'X' });
    expect(el.classList.contains('ui-empty-state--no-content')).toBe(true);
  });

  it('applies the requested variant class', () => {
    const el = createEmptyState({ heading: 'X', variant: 'search-empty' });
    expect(el.classList.contains('ui-empty-state--search-empty')).toBe(true);
  });

  it('applies the error variant class', () => {
    const el = createEmptyState({ heading: 'Virhe', variant: 'error' });
    expect(el.classList.contains('ui-empty-state--error')).toBe(true);
  });

  it('renders icon element when icon is provided', () => {
    const el = createEmptyState({ heading: 'X', icon: '🔍' });
    const icon = el.querySelector('.ui-empty-state__icon');
    expect(icon).not.toBeNull();
    expect(icon?.textContent).toBe('🔍');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('does not render icon element when icon is omitted', () => {
    const el = createEmptyState({ heading: 'X' });
    expect(el.querySelector('.ui-empty-state__icon')).toBeNull();
  });

  it('renders message paragraph when message is provided', () => {
    const el = createEmptyState({ heading: 'X', message: 'Kokeile eri hakusanaa.' });
    expect(el.querySelector('.ui-empty-state__message')?.textContent).toBe('Kokeile eri hakusanaa.');
  });

  it('does not render message paragraph when message is omitted', () => {
    const el = createEmptyState({ heading: 'X' });
    expect(el.querySelector('.ui-empty-state__message')).toBeNull();
  });

  it('renders action button when action is provided', () => {
    const onClick = vi.fn();
    const el = createEmptyState({
      heading: 'X',
      action: { label: 'Tyhjennä haku', onClick },
    });
    const btn = el.querySelector('button');
    expect(btn).not.toBeNull();
    btn?.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when action is omitted', () => {
    const el = createEmptyState({ heading: 'X' });
    expect(el.querySelector('button')).toBeNull();
  });

  it('never uses innerHTML — heading with injection attempt is safe', () => {
    const el = createEmptyState({ heading: '<script>alert(1)</script>' });
    expect(el.innerHTML).not.toContain('<script>alert(1)</script>');
    expect(el.querySelector('.ui-empty-state__heading')?.textContent).toContain('<script>alert(1)</script>');
  });
});
