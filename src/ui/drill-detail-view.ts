import {
  escapeHtml,
  formatAgeGroups,
  formatAttachmentType,
  formatDuration,
  formatIntensityLabel,
  formatPlayerCount,
} from '@/components/drill-presenters';
import { renderViewStateSection, showViewFeedback } from '@/components/view-state';
import { DrillCatalogService } from '@/services/drill-catalog-service';
import { DrillCatalogState } from '@/state/drill-catalog-state';
import { plannerDraftState, PlannerDraftState } from '@/state/planner-draft-state';
import type { DrillAttachment } from '@/types/drills';
import { parseHashRoute } from '@/ui/routes';
import { renderShellSupportPanels, selectViewShell } from '@/ui/view-shells';

function renderList(items: string[], emptyCopy: string): string {
  if (items.length === 0) {
    return `<p class="drill-detail-empty-copy">${escapeHtml(emptyCopy)}</p>`;
  }

  return `<ul class="drill-detail-list">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderAttachment(attachment: DrillAttachment): string {
  return `
    <li class="drill-detail-attachment">
      <div>
        <p class="drill-detail-attachment-type">${escapeHtml(formatAttachmentType(attachment.type))}</p>
        <h4>${escapeHtml(attachment.title)}</h4>
      </div>
      <a class="drill-detail-attachment-link" href="${escapeHtml(attachment.url)}" target="_blank" rel="noreferrer">Avaa</a>
    </li>
  `;
}

function renderTextBlock(value: string | undefined, fallback: string): string {
  return escapeHtml(value?.trim() || fallback);
}

function renderMediaSurface(detailTitle: string, category: string, primaryImageUrl?: string): string {
  if (primaryImageUrl) {
    return `<img class="drill-detail-image" src="${escapeHtml(primaryImageUrl)}" alt="${escapeHtml(detailTitle)}" />`;
  }

  return `
    <div class="drill-detail-media-placeholder">
      <div class="drill-detail-monogram" aria-hidden="true">${escapeHtml(category.slice(0, 1) || 'H')}</div>
      <div class="drill-detail-media-copy">
        <p class="drill-detail-media-kicker">Kaavio / media</p>
        <h3>Visuaali tulossa</h3>
        <p>Testiversio nayttaa taman paikanvarauksen, jos kuva tai diagrammi ei ole viela saatavilla Airtablesta.</p>
      </div>
    </div>
  `;
}

export class DrillDetailView {
  private unsubscribeState: (() => void) | null = null;
  private activeRequestId = 0;

  constructor(
    private readonly container: HTMLElement,
    private readonly drillId: string,
    options: {
      service?: DrillCatalogService;
      state?: DrillCatalogState;
      plannerDraftState?: PlannerDraftState;
    } = {},
  ) {
    this.service = options.service ?? new DrillCatalogService();
    this.state = options.state ?? new DrillCatalogState();
    this.plannerDraftState = options.plannerDraftState ?? plannerDraftState;
  }

  private readonly service: DrillCatalogService;
  private readonly state: DrillCatalogState;
  private readonly plannerDraftState: PlannerDraftState;

  async mount(): Promise<void> {
    this.container.dataset.shell = 'drill';
    this.container.dataset.view = 'drill-detail';
    this.unsubscribeState = this.state.subscribe(() => this.render());
    this.container.addEventListener('click', this.handleClick);
    this.render();
    await this.loadDetail();
  }

  destroy(): void {
    this.unsubscribeState?.();
    this.unsubscribeState = null;
    this.container.removeEventListener('click', this.handleClick);
  }

  private readonly handleClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const stateAction = target.closest<HTMLElement>('[data-view-state-action]')?.dataset.viewStateAction;
    if (stateAction === 'retry-drill-detail') {
      void this.loadDetail();
      return;
    }

    if (target.dataset.drillDetailAction === 'add-to-plan') {
      const detail = this.state.getSnapshot().selectedDrill;
      if (!detail) {
        return;
      }

      this.plannerDraftState.addDrill(detail);
      showViewFeedback('Harjoite lisatty', `${detail.title} siirrettiin suunnitelman builderiin.`, 'success');
      window.location.hash = '#/plan/new';
    }
  };

  private async loadDetail(): Promise<void> {
    const requestId = ++this.activeRequestId;
    this.state.beginDetailLoad(this.drillId);

    try {
      const detail = await this.service.getDrill(this.drillId);

      if (requestId !== this.activeRequestId) {
        return;
      }

      this.state.completeDetailLoad(detail);
    } catch (error) {
      if (requestId !== this.activeRequestId) {
        return;
      }

      this.state.failDetailLoad(error);
    }
  }

  private render(): void {
    const route = parseHashRoute(`#/drills/${this.drillId}`);
    const view = selectViewShell(route);
    const snapshot = this.state.getSnapshot();
    const detail = snapshot.selectedDrill;

    if (snapshot.detailState.status === 'loading' && !detail) {
      this.container.innerHTML = renderViewStateSection({
        shell: view.shell,
        eyebrow: view.eyebrow,
        title: view.title,
        description: 'Harjoitteen tiedot, media ja suunnitteluun tarvittavat metatiedot avataan tahan nakymaan.',
        state: {
          kind: 'loading',
          title: 'Ladataan harjoitteen tietoja',
          message: 'Valmistellaan kuvaus, valmennuspisteet ja liitteet testiversion katselmointia varten.',
        },
      });
      return;
    }

    if (snapshot.detailState.status === 'error') {
      this.container.innerHTML = renderViewStateSection({
        shell: view.shell,
        eyebrow: view.eyebrow,
        title: view.title,
        description: 'Harjoitteen tarkempi tarkastelu epaonnistui, mutta valmentajan polku takaisin katalogiin pysyy ehjana.',
        state: {
          kind: 'error',
          title: 'Harjoitetta ei voitu avata',
          message: snapshot.detailState.error?.message || 'Yrita hetken paasta uudelleen.',
          actions: [
            { action: 'retry-drill-detail', label: 'Yrita uudelleen' },
            { href: '#/drills', label: 'Palaa katalogiin' },
          ],
        },
      });
      return;
    }

    if (!detail) {
      this.container.innerHTML = '';
      return;
    }

    this.container.innerHTML = `
      <section class="view-shell view-shell-${view.shell} drill-detail-view" aria-labelledby="drillDetailTitle">
        <div class="planner-draft-header">
          <div>
            <p class="view-shell-eyebrow">${view.eyebrow}</p>
            <h2 id="drillDetailTitle" class="view-shell-title">${escapeHtml(detail.title)}</h2>
            <p class="view-shell-description">${escapeHtml(detail.summary || 'Harjoite avautuu suunnittelua varten myos keskeneraisella sisallolla.')}</p>
          </div>
          <div class="planner-draft-actions">
            <a class="view-shell-link" href="#/drills">Palaa harjoitteisiin</a>
            <button
              type="button"
              class="drill-detail-primary-action"
              data-drill-detail-action="add-to-plan"
            >
              Lisaa suunnitelmaan
            </button>
          </div>
        </div>

        ${renderShellSupportPanels(route)}

        <div class="drill-detail-hero">
          <section class="drill-detail-visual-panel">
            ${renderMediaSurface(detail.title, detail.category, detail.primaryImageUrl)}
          </section>
          <section class="drill-detail-planning-panel">
            <div class="drill-detail-summary-card">
              <p class="planner-draft-section-kicker">Suunnittelua varten</p>
              <h3>Valitse harjoite session rungoksi</h3>
              <p>Harjoite voidaan lisata heti suunnitelmaan, vaikka kuva, liitteet tai osa tekstista olisi viela testiversiossa keskenerainen.</p>
              <button
                type="button"
                class="drill-detail-primary-action"
                data-drill-detail-action="add-to-plan"
              >
                Lisaa suunnitelmaan
              </button>
            </div>
            <dl class="drill-detail-meta">
              <div>
                <dt>Kategoria</dt>
                <dd>${escapeHtml(detail.category)}</dd>
              </div>
              <div>
                <dt>Ikaryhma</dt>
                <dd>${escapeHtml(formatAgeGroups(detail.ageGroups))}</dd>
              </div>
              <div>
                <dt>Kesto</dt>
                <dd>${escapeHtml(formatDuration(detail.durationMin))}</dd>
              </div>
              <div>
                <dt>Pelaajat</dt>
                <dd>${escapeHtml(formatPlayerCount(detail))}</dd>
              </div>
              <div>
                <dt>Teho</dt>
                <dd>${escapeHtml(formatIntensityLabel(detail.intensityLevel))}</dd>
              </div>
              <div>
                <dt>Taidot</dt>
                <dd>${escapeHtml(detail.skillTags.join(', ') || 'Ei merkitty')}</dd>
              </div>
            </dl>
          </section>
        </div>

        <div class="drill-detail-layout">
          <section class="drill-detail-panel">
            <h3>Kuvaus</h3>
            <p>${renderTextBlock(detail.description, 'Harjoitteen tarkempi kuvaus taydentyy pian. Ydinajatus kannattaa silti arvioida jo summaryn ja metatietojen perusteella.')}</p>
          </section>
          <section class="drill-detail-panel">
            <h3>Alkuasettelu</h3>
            <p>${renderTextBlock(detail.setupInstructions, 'Ei erillista asettelukuvausta. Testiversiossa kayta liitteita tai valmennuspisteita alustavana tukena.')}</p>
          </section>
          <section class="drill-detail-panel">
            <h3>Valmennuspisteet</h3>
            ${renderList(detail.coachingPoints, 'Ei valmennuspisteita lisatty.')}
          </section>
          <section class="drill-detail-panel">
            <h3>Valineet</h3>
            ${renderList(detail.equipment, 'Valineita ei ole rajattu.')}
          </section>
          <section class="drill-detail-panel">
            <h3>Progressiot</h3>
            ${renderList(detail.progressionIdeas, 'Ei progressioita lisatty.')}
          </section>
          <section class="drill-detail-panel">
            <h3>Variaatiot</h3>
            ${renderList(detail.variationIdeas, 'Ei variaatioita lisatty.')}
          </section>
        </div>

        <section class="drill-detail-panel drill-detail-panel-attachments">
          <div class="drill-detail-panel-heading">
            <h3>Liitteet</h3>
            <p>Liitteet ovat lisatuki. Suunnitelman teko onnistuu ilman PDF-avausta.</p>
          </div>
          ${
            detail.attachments.length === 0
              ? '<p class="drill-detail-empty-copy">Tahan harjoitteeseen ei ole liitetty lisamateriaaleja. Testiversiossa jokainen harjoite ei viela sisalla mediaa.</p>'
              : `<ul class="drill-detail-attachments">${detail.attachments
                  .slice()
                  .sort((left, right) => left.sortOrder - right.sortOrder)
                  .map(renderAttachment)
                  .join('')}</ul>`
          }
        </section>
      </section>
    `;
  }
}
