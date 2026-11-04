/**
 * Card — base container for file cards, drill cards, or any grouped content
 *
 * Variants: default (static), interactive (hover state + pointer cursor)
 * If onClick is provided, renders as <button> for native keyboard/accessibility support.
 */

export interface CardOptions {
  children: HTMLElement[];
  variant?: 'default' | 'interactive';
  onClick?: (e: MouseEvent) => void;
}

export function createCard(options: CardOptions): HTMLElement {
  const { children, variant = 'default', onClick } = options;

  let card: HTMLElement;

  if (onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.addEventListener('click', onClick);
    card = btn;
  } else {
    card = document.createElement('div');
  }

  const classes = ['ui-card'];
  if (variant === 'interactive' || onClick) classes.push('ui-card--interactive');
  card.className = classes.join(' ');

  for (const child of children) {
    card.appendChild(child);
  }

  return card;
}
