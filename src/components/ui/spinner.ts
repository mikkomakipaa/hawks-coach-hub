/**
 * LoadingSpinner — inline animated indicator for pending states
 *
 * Sizes: sm (12px), md (20px default), lg (32px)
 * Accessible: aria-label set in Finnish by default
 */

export interface SpinnerOptions {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function createLoadingSpinner(options: SpinnerOptions = {}): HTMLElement {
  const { size, label = 'Ladataan...' } = options;

  const spinner = document.createElement('span');

  const classes = ['ui-spinner'];
  if (size) classes.push(`ui-spinner--${size}`);
  spinner.className = classes.join(' ');

  spinner.setAttribute('role', 'status');
  spinner.setAttribute('aria-label', label);

  // Screen-reader text
  const srText = document.createElement('span');
  srText.className = 'sr-only';
  srText.textContent = label;
  spinner.appendChild(srText);

  return spinner;
}
