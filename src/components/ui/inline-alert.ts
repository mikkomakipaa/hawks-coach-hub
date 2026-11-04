/**
 * InlineAlert — contextual feedback banner within a page region
 *
 * Types: info (blue), warning (amber), error (red), success (green)
 * Optional: action button, dismiss (×) button
 */

import type { ButtonOptions } from './button';
import { createButton } from './button';

export interface InlineAlertOptions {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  action?: ButtonOptions;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const ALERT_ICONS: Record<InlineAlertOptions['type'], string> = {
  info: 'ℹ',
  warning: '⚠',
  error: '✕',
  success: '✓',
};

export function createInlineAlert(options: InlineAlertOptions): HTMLElement {
  const { type, message, action, dismissible = false, onDismiss } = options;

  const alert = document.createElement('div');
  alert.className = `ui-alert ui-alert--${type}`;
  alert.setAttribute('role', 'alert');

  const icon = document.createElement('span');
  icon.className = 'ui-alert__icon';
  icon.textContent = ALERT_ICONS[type];
  icon.setAttribute('aria-hidden', 'true');
  alert.appendChild(icon);

  const msg = document.createElement('span');
  msg.className = 'ui-alert__message';
  msg.textContent = message;
  alert.appendChild(msg);

  if (action) {
    const actionBtn = createButton({ ...action, size: 'sm' });
    actionBtn.classList.add('ui-alert__action');
    alert.appendChild(actionBtn);
  }

  if (dismissible) {
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'ui-alert__close';
    closeBtn.setAttribute('aria-label', 'Sulje ilmoitus');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => {
      alert.remove();
      onDismiss?.();
    });
    alert.appendChild(closeBtn);
  }

  return alert;
}
