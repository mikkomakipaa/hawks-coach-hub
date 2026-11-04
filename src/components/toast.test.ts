import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initializeToastContainer, showToast } from '@/components/toast';

describe('toast component', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="toastContainer"></div>';
    vi.useFakeTimers();
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('initializes against the shared toast container', () => {
    expect(() => initializeToastContainer()).not.toThrow();
  });

  it('renders escaped text via DOM textContent rather than innerHTML injection', () => {
    initializeToastContainer();
    showToast('<script>alert(1)</script>', '<img src=x onerror=alert(1)>', 'success', 0);

    const toast = document.querySelector('.toast');
    expect(toast?.textContent).toContain('<script>alert(1)</script>');
    expect(toast?.innerHTML).not.toContain('<script>alert(1)</script>');
    expect(toast?.innerHTML).not.toContain('<img src=x onerror=alert(1)>');
  });

  it('adds a toast and auto-removes it after the configured duration', () => {
    initializeToastContainer();
    showToast('Tallennettu', 'Luonnos paivitettiin.', 'info', 1000);

    expect(document.querySelectorAll('.toast')).toHaveLength(1);
    expect(document.querySelector('.toast')?.classList.contains('show')).toBe(true);

    vi.advanceTimersByTime(1000);
    expect(document.querySelector('.toast')?.classList.contains('show')).toBe(false);

    vi.advanceTimersByTime(300);
    expect(document.querySelectorAll('.toast')).toHaveLength(0);
  });

  it('does nothing when the container is missing', () => {
    document.body.innerHTML = '';

    expect(() => showToast('Otsikko', 'Viesti')).not.toThrow();
  });
});
