import { escapeHtml } from '@/components/drill-presenters';
import { openSessionPrintView } from '@/services/session-print-service';
import { SessionPlannerService } from '@/services/session-planner-service';
import type { SharedSessionView as SharedSessionPayload } from '@/types/sessions';
import { parseHashRoute } from '@/ui/routes';
import { selectViewShell } from '@/ui/view-shells';

const BLOCK_TYPE_LABELS = {
  warmup: 'Alkuverryttely',
  drill: 'Harjoite',
  break: 'Tauko',
  game: 'Peli',
  cooldown: 'Loppuverryttely',
  custom: 'Muu lohko',
} as const;

export class SharedSessionView {
  private payload: SharedSessionPayload | null = null;
  private errorMessage: string | null = null;
  private readonly container: HTMLElement;
  private readonly shareId: string;
  private readonly service: SessionPlannerService;

  constructor(
    container: HTMLElement,
    shareId: string,
    service: SessionPlannerService = new SessionPlannerService(),
  ) {
    this.container = container;
    this.shareId = shareId;
    this.service = service;
  }

  async mount(): Promise<void> {
    this.container.dataset.shell = 'share';
    this.container.dataset.view = 'shared-session';
    this.container.addEventListener('click', this.handleClick);
    this.renderLoading();

    try {
      this.payload = await this.service.getSharedSession(this.shareId);
      this.render();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Jaettua suunnitelmaa ei voitu ladata.';
      this.render();
    }
  }

  destroy(): void {
    this.container.removeEventListener('click', this.handleClick);
  }

  private readonly handleClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.dataset.shareAction !== 'print' || !this.payload) {
      return;
    }

    openSessionPrintView(this.payload.session);
  };

  private renderLoading(): void {
    const view = selectViewShell(parseHashRoute(`#/session/${this.shareId}`));
    this.container.innerHTML = `
      <section class="view-shell view-shell-${view.shell} shared-session-view">
        <p class="view-shell-eyebrow">${view.eyebrow}</p>
        <h2 class="view-shell-title">${view.title}</h2>
        <p class="view-shell-description">Ladataan jaettua suunnitelmaa...</p>
        <div class="drill-detail-skeleton" aria-hidden="true"></div>
      </section>
    `;
  }

  private render(): void {
    const view = selectViewShell(parseHashRoute(`#/session/${this.shareId}`));

    if (!this.payload) {
      this.container.innerHTML = `
        <section class="view-shell view-shell-${view.shell} shared-session-view">
          <div class="planner-draft-header">
            <div>
              <p class="view-shell-eyebrow">${view.eyebrow}</p>
              <h2 class="view-shell-title">${view.title}</h2>
              <p class="view-shell-description">Jaettua suunnitelmaa ei voitu avata.</p>
            </div>
          </div>
          <div class="drill-detail-error" role="alert">
            <h3>Linkki ei ole kaytettavissa</h3>
            <p>${escapeHtml(this.errorMessage || 'Jaettu suunnitelma puuttuu tai linkki ei ole enaa voimassa.')}</p>
          </div>
        </section>
      `;
      return;
    }

    const { session } = this.payload;

    this.container.innerHTML = `
      <section class="view-shell view-shell-${view.shell} shared-session-view" aria-labelledby="sharedSessionTitle">
        <div class="planner-draft-header">
          <div>
            <p class="view-shell-eyebrow">${view.eyebrow}</p>
            <h2 id="sharedSessionTitle" class="view-shell-title">${escapeHtml(session.name)}</h2>
            <p class="view-shell-description">Luettava harjoitusrunko jaettuna avustavalle valmentajalle, puhelimeen tai paperille.</p>
          </div>
          <div class="planner-draft-actions">
            <button type="button" class="planner-draft-save-button planner-draft-save-button-secondary" data-share-action="print">Tulosta</button>
            <a class="view-shell-link" href="#/plan">Palaa suunnitelmiin</a>
          </div>
        </div>

        <div class="planner-session-share-meta">
          <div><span>Ryhma</span><strong>${escapeHtml(session.group)}</strong></div>
          <div><span>Paiva</span><strong>${escapeHtml(session.date)}</strong></div>
          <div><span>Valmentaja</span><strong>${escapeHtml(session.coachLabel)}</strong></div>
          <div><span>Kesto</span><strong>${session.totalDurationMin ?? 0} / ${session.targetDurationMin ?? 0} min</strong></div>
        </div>

        <ol class="planner-draft-blocks planner-draft-blocks-readonly">
          ${session.blocks
            .map(
              (block, index) => `
                <li class="planner-draft-block" data-planner-block-id="${escapeHtml(block.id)}">
                  <div class="planner-draft-block-topline">
                    <p class="planner-draft-block-order">Lohko ${index + 1}</p>
                    <p class="planner-draft-block-meta">${escapeHtml(BLOCK_TYPE_LABELS[block.type])} · ${block.durationMin} min</p>
                  </div>
                  <h3 class="planner-session-share-block-title">${escapeHtml(block.title)}</h3>
                  ${block.notes ? `<p class="planner-session-share-block-notes">${escapeHtml(block.notes)}</p>` : ''}
                </li>
              `,
            )
            .join('')}
        </ol>
      </section>
    `;
  }
}
