import { describe, expect, it, vi } from 'vitest';

import { createButton } from './button';

describe('createButton', () => {
  it('renders a <button> element with label text', () => {
    const btn = createButton({ label: 'Tallenna' });
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.textContent).toBe('Tallenna');
    expect(btn.type).toBe('button');
  });

  it('applies primary variant class by default', () => {
    const btn = createButton({ label: 'OK' });
    expect(btn.classList.contains('ui-btn')).toBe(true);
    expect(btn.classList.contains('ui-btn--primary')).toBe(true);
  });

  it('applies the requested variant class', () => {
    expect(createButton({ label: 'X', variant: 'secondary' }).classList.contains('ui-btn--secondary')).toBe(true);
    expect(createButton({ label: 'X', variant: 'ghost' }).classList.contains('ui-btn--ghost')).toBe(true);
    expect(createButton({ label: 'X', variant: 'danger' }).classList.contains('ui-btn--danger')).toBe(true);
  });

  it('applies sm size class when size is sm', () => {
    const btn = createButton({ label: 'X', size: 'sm' });
    expect(btn.classList.contains('ui-btn--sm')).toBe(true);
  });

  it('is disabled when disabled option is true', () => {
    const btn = createButton({ label: 'X', disabled: true });
    expect(btn.disabled).toBe(true);
  });

  it('is disabled and has loading class when loading is true', () => {
    const btn = createButton({ label: 'Ladataan', loading: true });
    expect(btn.disabled).toBe(true);
    expect(btn.classList.contains('ui-btn--loading')).toBe(true);
  });

  it('renders spinner element when loading', () => {
    const btn = createButton({ label: 'X', loading: true });
    expect(btn.querySelector('.ui-btn__spinner')).not.toBeNull();
  });

  it('renders icon element when icon is provided and not loading', () => {
    const btn = createButton({ label: 'Lisää', icon: '+' });
    const icon = btn.querySelector('.ui-btn__icon');
    expect(icon).not.toBeNull();
    expect(icon?.textContent).toBe('+');
  });

  it('does not render icon element when loading (spinner replaces it)', () => {
    const btn = createButton({ label: 'X', icon: '+', loading: true });
    expect(btn.querySelector('.ui-btn__icon')).toBeNull();
  });

  it('calls onClick handler when clicked', () => {
    const handler = vi.fn();
    const btn = createButton({ label: 'Klikkaa', onClick: handler });
    btn.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not throw when onClick is omitted', () => {
    const btn = createButton({ label: 'Ei toimintoa' });
    expect(() => btn.click()).not.toThrow();
  });

  it('never uses innerHTML — label text is safe even with HTML injection attempt', () => {
    const btn = createButton({ label: '<script>alert(1)</script>' });
    expect(btn.innerHTML).not.toContain('<script>');
    expect(btn.textContent).toContain('<script>alert(1)</script>');
  });
});
