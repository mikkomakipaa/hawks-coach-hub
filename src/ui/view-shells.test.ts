import { describe, expect, it } from 'vitest';

import { parseHashRoute } from '@/ui/routes';
import { renderShellSupportPanels, renderTopLevelNavigation, renderViewShell, selectViewShell } from '@/ui/view-shells';

describe('selectViewShell', () => {
  it('selects a drill shell for drill routes', () => {
    const shell = selectViewShell(parseHashRoute('#/drills/triangle-pass'));

    expect(shell.shell).toBe('drill');
    expect(shell.title).toBe('Harjoitteen tiedot');
    expect(shell.routeLabel).toBe('/drills/triangle-pass');
  });

  it('selects a planner shell for plan routes', () => {
    const shell = selectViewShell(parseHashRoute('#/plan/new'));

    expect(shell.shell).toBe('planner');
    expect(shell.title).toBe('Uusi suunnitelma');
    expect(shell.stageLabel).toBe('Shell + live draft');
  });

  it('selects an editor shell for editor routes', () => {
    const shell = selectViewShell(parseHashRoute('#/editor/imports'));

    expect(shell.shell).toBe('editor');
    expect(shell.title).toBe('Import-jono');
  });

  it('selects a not-found shell for unknown routes', () => {
    const shell = selectViewShell(parseHashRoute('#/missing'));

    expect(shell.shell).toBe('not-found');
    expect(shell.title).toBe('Sivua ei loytynyt');
  });
});

describe('renderViewShell', () => {
  it('renders shell metadata into the target container', () => {
    const container = document.createElement('div');

    renderViewShell(container, parseHashRoute('#/session/share-123'));

    expect(container.dataset.shell).toBe('share');
    expect(container.textContent).toContain('Jaettu sessio');
    expect(container.textContent).toContain('/session/share-123');
    expect(container.textContent).toContain('Seuraavaksi');
  });

  it('renders the top-level navigation with active section and editor sub-nav', () => {
    const container = document.createElement('div');

    renderTopLevelNavigation(container, parseHashRoute('#/editor/imports'));

    // Primary nav shows both top-level sections
    expect(container.textContent).toContain('Valmentajan käsikirja');
    expect(container.textContent).toContain('Harjoitesuunnittelija');
    // Harjoitesuunnittelija is active (editor is a planner shell)
    expect(container.querySelector('a[href="#/drills"]')?.classList.contains('is-active')).toBe(true);
    // Sub-nav is shown with Editori active (maps to editor shell)
    expect(container.querySelector('a[href="#/editor/drills/new"]')?.getAttribute('aria-current')).toBe('page');
    // Sub-nav also has Harjoitteet and Suunnitelmat links
    expect(container.querySelector('a[href="#/drills"]')).toBeTruthy();
    expect(container.querySelector('a[href="#/plan"]')).toBeTruthy();
  });

  it('renders support panels that describe the current shell state', () => {
    const markup = renderShellSupportPanels(parseHashRoute('#/drills'));

    expect(markup).toContain('Nyt testissa');
    expect(markup).toContain('Datakytkenta');
    expect(markup).toContain('Seuraavaksi');
  });
});
