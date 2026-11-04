import { showToast } from '@/components/toast';
import { escapeHtml } from '@/components/drill-presenters';
import type { ToastType } from '@/types/google-apis';

type ViewStateTone = 'neutral' | 'warning' | 'danger' | 'success';
type ViewStateKind = 'loading' | 'empty' | 'error' | 'permission';

interface ViewStateActionLink {
  href: string;
  label: string;
}

interface ViewStateActionButton {
  action: string;
  label: string;
  tone?: 'primary' | 'secondary';
}

interface ViewStateConfig {
  kind: ViewStateKind;
  title: string;
  message: string;
  tone?: ViewStateTone;
  actions?: Array<ViewStateActionLink | ViewStateActionButton>;
  compact?: boolean;
}

interface ViewStateSectionConfig {
  shell: string;
  eyebrow: string;
  title: string;
  description: string;
  state: ViewStateConfig;
}

function renderAction(action: ViewStateActionLink | ViewStateActionButton): string {
  if ('href' in action) {
    return `<a class="shared-view-state-action" href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`;
  }

  return `
    <button
      type="button"
      class="shared-view-state-action${action.tone === 'secondary' ? ' is-secondary' : ''}"
      data-view-state-action="${escapeHtml(action.action)}"
    >${escapeHtml(action.label)}</button>
  `;
}

export function renderViewState(config: ViewStateConfig): string {
  const tone = config.tone ?? (config.kind === 'error' ? 'danger' : config.kind === 'permission' ? 'warning' : 'neutral');
  const actions = config.actions?.length
    ? `<div class="shared-view-state-actions">${config.actions.map(renderAction).join('')}</div>`
    : '';
  const skeleton = config.kind === 'loading'
    ? `
      <div class="shared-view-state-skeleton" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `
    : '';

  return `
    <div class="shared-view-state shared-view-state-${config.kind} shared-view-state-${tone}${config.compact ? ' shared-view-state-compact' : ''}" ${
      config.kind === 'error' || config.kind === 'permission' ? 'role="alert"' : 'role="status"'
    }>
      <div class="shared-view-state-copy">
        <p class="shared-view-state-kicker">${escapeHtml(
          config.kind === 'loading'
            ? 'Ladataan'
            : config.kind === 'empty'
              ? 'Tyhja tila'
              : config.kind === 'permission'
                ? 'Oikeudet'
                : 'Virhetila',
        )}</p>
        <h3>${escapeHtml(config.title)}</h3>
        <p>${escapeHtml(config.message)}</p>
      </div>
      ${skeleton}
      ${actions}
    </div>
  `;
}

export function renderViewStateSection(config: ViewStateSectionConfig): string {
  return `
    <section class="view-shell view-shell-${config.shell} shared-view-state-section" aria-labelledby="sharedViewStateTitle">
      <p class="view-shell-eyebrow">${escapeHtml(config.eyebrow)}</p>
      <h2 id="sharedViewStateTitle" class="view-shell-title">${escapeHtml(config.title)}</h2>
      <p class="view-shell-description">${escapeHtml(config.description)}</p>
      ${renderViewState(config.state)}
    </section>
  `;
}

export function showViewFeedback(title: string, message: string, type: ToastType = 'info'): void {
  showToast(title, message, type, 3200);
}
