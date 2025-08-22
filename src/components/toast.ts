import type { ToastType } from '@/types/google-apis';
import { getDOMElement, createElementWithHTML } from '@/utils/dom';

let toastContainer: HTMLElement;

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
  duration = 5000
): void => {
  const toast = createElementWithHTML(
    'div',
    `toast ${type}`,
    `
    <div class="toast-icon">${TOAST_ICONS[type] || 'i'}</div>
    <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" aria-label="Close notification">×</button>
    <div class="toast-progress" style="width: 100%;"></div>
    `
  );

  const closeBtn = toast.querySelector('.toast-close') as HTMLButtonElement;
  const progressBar = toast.querySelector('.toast-progress') as HTMLDivElement;

  closeBtn.addEventListener('click', () => removeToast(toast));

  toastContainer.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto-remove after duration
  if (duration > 0) {
    progressBar.style.transition = `width ${duration}ms linear`;
    progressBar.style.width = '0%';

    setTimeout(() => {
      removeToast(toast);
    }, duration);
  }

  // Limit number of toasts
  const toasts = toastContainer.querySelectorAll('.toast');
  if (toasts.length > 5) {
    removeToast(toasts[0] as HTMLElement);
  }
};

const removeToast = (toast: HTMLElement): void => {
  toast.classList.remove('show');
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
};