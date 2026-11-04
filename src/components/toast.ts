import type { ToastType } from '@/types/google-apis';
import { createElement, getDOMElement } from '@/utils/dom';

let toastContainer: HTMLElement | null = null;

function ensureToastContainer(): HTMLElement | null {
  if (toastContainer?.isConnected) {
    return toastContainer;
  }

  try {
    toastContainer = getDOMElement('toastContainer');
    return toastContainer;
  } catch {
    toastContainer = null;
    return null;
  }
}

function createToastElement(title: string, message: string, type: ToastType): HTMLElement {
  const toast = createElement('div', `toast ${type}`);
  const icon = createElement('div', 'toast-icon', TOAST_ICONS[type] || 'i');
  const content = createElement('div', 'toast-content');
  const titleElement = createElement('div', 'toast-title', title);
  const messageElement = createElement('div', 'toast-message', message);
  const closeButton = createElement('button', 'toast-close', '×') as HTMLButtonElement;
  const progress = createElement('div', 'toast-progress');

  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Sulje ilmoitus');

  content.append(titleElement, messageElement);
  toast.append(icon, content, closeButton, progress);

  closeButton.addEventListener('click', () => removeToast(toast));

  return toast;
}

export const initializeToastContainer = (): void => {
  toastContainer = getDOMElement('toastContainer');
};

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'i',
};

export const showToast = (
  title: string,
  message: string,
  type: ToastType = 'info',
  duration = 5000,
): void => {
  const container = ensureToastContainer();
  if (!container) {
    return;
  }

  const toast = createToastElement(title, message, type);
  const progressBar = toast.querySelector('.toast-progress');

  if (!(progressBar instanceof HTMLDivElement)) {
    return;
  }

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  if (duration > 0) {
    progressBar.style.transition = `width ${duration}ms linear`;
    progressBar.style.width = '0%';

    window.setTimeout(() => {
      removeToast(toast);
    }, duration);
  }

  const toasts = container.querySelectorAll('.toast');
  if (toasts.length > 5) {
    removeToast(toasts[0] as HTMLElement);
  }
};

const removeToast = (toast: HTMLElement): void => {
  toast.classList.remove('show');
  window.setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
};
