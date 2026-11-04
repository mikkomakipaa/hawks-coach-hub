/**
 * EmptyState — centered placeholder for empty results, errors, or no-content screens
 *
 * Variants: no-content (empty folder/list), search-empty (no search hits), error (load failure)
 */

import type { ButtonOptions } from './button';
import { createButton } from './button';

export interface EmptyStateOptions {
  icon?: string;
  heading: string;
  message?: string;
  action?: ButtonOptions;
  variant?: 'no-content' | 'search-empty' | 'error';
}

export function createEmptyState(options: EmptyStateOptions): HTMLElement {
  const { icon, heading, message, action, variant = 'no-content' } = options;

  const container = document.createElement('div');
  container.className = `ui-empty-state ui-empty-state--${variant}`;

  if (icon) {
    const iconEl = document.createElement('div');
    iconEl.className = 'ui-empty-state__icon';
    iconEl.textContent = icon;
    iconEl.setAttribute('aria-hidden', 'true');
    container.appendChild(iconEl);
  }

  const headingEl = document.createElement('h3');
  headingEl.className = 'ui-empty-state__heading';
  headingEl.textContent = heading;
  container.appendChild(headingEl);

  if (message) {
    const messageEl = document.createElement('p');
    messageEl.className = 'ui-empty-state__message';
    messageEl.textContent = message;
    container.appendChild(messageEl);
  }

  if (action) {
    const actionEl = createButton(action);
    container.appendChild(actionEl);
  }

  return container;
}
