/**
 * Badge — inline label for status, content type, or file type
 *
 * Semantic variants: default (gray), primary (orange), success (green),
 *   warning (amber), danger (red), info (blue)
 * File-type variants: pdf (red), video (purple), doc (blue), image (green)
 */

export interface BadgeOptions {
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  fileType?: 'pdf' | 'video' | 'doc' | 'image';
}

export function createBadge(options: BadgeOptions): HTMLSpanElement {
  const { label, variant = 'default', fileType } = options;

  const badge = document.createElement('span');

  const classes = ['ui-badge'];
  if (fileType) {
    classes.push(`ui-badge--file-${fileType}`);
  } else {
    classes.push(`ui-badge--${variant}`);
  }
  badge.className = classes.join(' ');
  badge.textContent = label;

  return badge;
}
