/**
 * Button — shared action primitive
 *
 * Variants: primary (orange fill), secondary (orange outline), ghost (no border), danger (red)
 * Sizes: md (default, 44px mobile), sm (36px)
 * States: default, loading (spinner replaces icon), disabled
 */

export interface ButtonOptions {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  onClick?: (e: MouseEvent) => void;
}

export function createButton(options: ButtonOptions): HTMLButtonElement {
  const {
    label,
    variant = 'primary',
    size,
    icon,
    loading = false,
    disabled = false,
    onClick,
  } = options;

  const btn = document.createElement('button');
  btn.type = 'button';

  const classes = ['ui-btn', `ui-btn--${variant}`];
  if (size === 'sm') classes.push('ui-btn--sm');
  if (loading) classes.push('ui-btn--loading');
  btn.className = classes.join(' ');

  btn.disabled = disabled || loading;

  if (loading) {
    const spinner = document.createElement('span');
    spinner.className = 'ui-btn__spinner';
    spinner.setAttribute('aria-hidden', 'true');
    btn.appendChild(spinner);
  } else if (icon) {
    const iconSpan = document.createElement('span');
    iconSpan.className = 'ui-btn__icon';
    iconSpan.textContent = icon;
    iconSpan.setAttribute('aria-hidden', 'true');
    btn.appendChild(iconSpan);
  }

  const labelSpan = document.createElement('span');
  labelSpan.textContent = label;
  btn.appendChild(labelSpan);

  if (onClick) {
    btn.addEventListener('click', onClick);
  }

  return btn;
}
