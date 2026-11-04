import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/components/toast', () => ({
  showToast: vi.fn(),
}));

import { renderViewState, renderViewStateSection, showViewFeedback } from '@/components/view-state';
import { showToast } from '@/components/toast';

describe('view-state helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders compact empty and error states with actions', () => {
    const html = renderViewState({
      kind: 'error',
      title: 'Yhteys katkesi',
      message: 'Yrita uudelleen.',
      compact: true,
      actions: [
        { action: 'retry', label: 'Yrita uudelleen' },
        { href: '#/drills', label: 'Palaa' },
      ],
    });

    expect(html).toContain('shared-view-state');
    expect(html).toContain('shared-view-state-compact');
    expect(html).toContain('data-view-state-action="retry"');
    expect(html).toContain('href="#/drills"');
  });

  it('renders a full shell state section with loading copy', () => {
    const html = renderViewStateSection({
      shell: 'editor',
      eyebrow: 'Editori',
      title: 'Uusi harjoite',
      description: 'Sisainen kirjoitusnakyma.',
      state: {
        kind: 'loading',
        title: 'Tarkistetaan oikeuksia',
        message: 'Valmistellaan kirjoituspolku.',
      },
    });

    expect(html).toContain('view-shell-editor');
    expect(html).toContain('shared-view-state-loading');
    expect(html).toContain('shared-view-state-skeleton');
  });

  it('routes action feedback to the toast system', () => {
    showViewFeedback('Tallennettu', 'Luonnos paivittyi.', 'success');

    expect(showToast).toHaveBeenCalledWith('Tallennettu', 'Luonnos paivittyi.', 'success', 3200);
  });
});
