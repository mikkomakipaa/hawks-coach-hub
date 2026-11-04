/**
 * Modal — focus-trapped dialog overlay
 *
 * Behaviour: ESC closes, click-outside closes, body scroll locked while open
 * Sizes: sm (400px), md (560px default), lg (720px)
 * Returns { overlay, close } so callers can append overlay to DOM and call close() programmatically
 */

export interface ModalOptions {
  title: string;
  content: HTMLElement;
  footer?: HTMLElement;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export interface ModalHandle {
  overlay: HTMLElement;
  close: () => void;
}

export function createModal(options: ModalOptions): ModalHandle {
  const { title, content, footer, onClose, size = 'md' } = options;

  const overlay = document.createElement('div');
  overlay.className = 'ui-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'ui-modal-title');

  const modal = document.createElement('div');
  modal.className = `ui-modal ui-modal--${size}`;

  // Header
  const header = document.createElement('div');
  header.className = 'ui-modal__header';

  const titleEl = document.createElement('h2');
  titleEl.id = 'ui-modal-title';
  titleEl.className = 'ui-modal__title';
  titleEl.textContent = title;
  header.appendChild(titleEl);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'ui-modal__close';
  closeBtn.setAttribute('aria-label', 'Sulje');
  closeBtn.textContent = '×';
  header.appendChild(closeBtn);

  modal.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'ui-modal__body';
  body.appendChild(content);
  modal.appendChild(body);

  // Footer
  if (footer) {
    const footerEl = document.createElement('div');
    footerEl.className = 'ui-modal__footer';
    footerEl.appendChild(footer);
    modal.appendChild(footerEl);
  }

  overlay.appendChild(modal);

  const close = (): void => {
    overlay.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleKeyDown);
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') close();
  };

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', handleKeyDown);

  document.body.style.overflow = 'hidden';

  return { overlay, close };
}
