/**
 * SkeletonItem — animated placeholder shown while content loads
 *
 * Replaces the ad-hoc `createSkeletonItem()` in file-display.ts
 */

export interface SkeletonOptions {
  lines?: number;
  showIcon?: boolean;
}

export function createSkeletonItem(options: SkeletonOptions = {}): HTMLElement {
  const { lines = 2, showIcon = true } = options;

  const container = document.createElement('div');
  container.className = 'ui-skeleton';
  container.setAttribute('aria-hidden', 'true');

  if (showIcon) {
    const icon = document.createElement('div');
    icon.className = 'ui-skeleton__icon';
    container.appendChild(icon);
  }

  const content = document.createElement('div');
  content.className = 'ui-skeleton__content';

  for (let i = 0; i < lines; i++) {
    const line = document.createElement('div');
    line.className = i === 0 ? 'ui-skeleton__line ui-skeleton__line--title' : 'ui-skeleton__line';
    content.appendChild(line);
  }

  container.appendChild(content);

  return container;
}
