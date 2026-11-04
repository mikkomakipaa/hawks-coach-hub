import { escapeHtml } from '@/components/drill-presenters';
import { renderViewStateSection, showViewFeedback } from '@/components/view-state';
import { PlannerSessionRecoveryStore, plannerSessionRecoveryStore } from '@/services/planner-session-recovery-store';
import { openSessionPrintView } from '@/services/session-print-service';
import { SessionPlannerService } from '@/services/session-planner-service';
import {
  calculateTotalDuration,
  createEmptyDraftSession,
  plannerDraftState,
  PlannerDraftState,
} from '@/state/planner-draft-state';
import { PlannerSessionState } from '@/state/planner-session-state';
import type { CreateSessionInput, Session, SessionBlock, SessionBlockType, UpdateSessionInput } from '@/types/sessions';
import { parseHashRoute } from '@/ui/routes';
import { getPlannerDrillCategories, PLANNER_TEST_DRILLS } from '@/ui/planner-test-data';
import { renderShellSupportPanels, selectViewShell } from '@/ui/view-shells';

const BLOCK_TYPE_LABELS: Record<SessionBlockType, string> = {
  warmup: 'Alkuverryttely',
  drill: 'Harjoite',
  break: 'Tauko',
  game: 'Peli',
  cooldown: 'Loppuverryttely',
  custom: 'Muu lohko',
};

interface FocusSnapshot {
  selector: string;
  selectionStart?: number | null;
  selectionEnd?: number | null;
}

export interface PlannerDraftViewOptions {
  routeKind?: 'new' | 'detail';
  sessionId?: string;
  service?: SessionPlannerService;
  sessionState?: PlannerSessionState;
  recoveryStore?: PlannerSessionRecoveryStore;
}

interface PlannerDraftUiState {
  drillQuery: string;
  drillCategory: string;
  testerNotes: string;
}

function formatBlockMeta(block: SessionBlock): string {
  const meta = [BLOCK_TYPE_LABELS[block.type], `${block.durationMin} min`];

  if (block.drillId) {
    meta.push(`Harjoite ${block.drillId}`);
  }

  return meta.join(' · ');
}

function formatDelta(targetDurationMin: number, totalDurationMin: number): string {
  const delta = targetDurationMin - totalDurationMin;

  if (delta === 0) {
    return 'Aikataulu tasan';
  }

  if (delta > 0) {
    return `${delta} min jaljella`;
  }

  return `${Math.abs(delta)} min yli`;
}

function getRenderSession(session: Session | null): Session {
  return session ?? createEmptyDraftSession();
}

function getFocusSnapshot(container: HTMLElement): FocusSnapshot | null {
  const activeElement = document.activeElement;
  if (
    !activeElement ||
    !container.contains(activeElement) ||
    !(
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement instanceof HTMLSelectElement
    )
  ) {
    return null;
  }

  const blockField = activeElement.dataset.blockField;
  const blockId = activeElement.dataset.blockId;
  const sessionField = activeElement.dataset.sessionField;
  let selector = '';

  if (blockField && blockId) {
    selector = `[data-block-field="${blockField}"][data-block-id="${blockId}"]`;
  } else if (sessionField) {
    selector = `[data-session-field="${sessionField}"]`;
  } else if (activeElement.id) {
    selector = `#${activeElement.id}`;
  }

  if (!selector) {
    return null;
  }

  return {
    selector,
    selectionStart: 'selectionStart' in activeElement ? activeElement.selectionStart : null,
    selectionEnd: 'selectionEnd' in activeElement ? activeElement.selectionEnd : null,
  };
}

function restoreFocus(container: HTMLElement, focusSnapshot: FocusSnapshot | null): void {
  if (!focusSnapshot) {
    return;
  }

  const nextActiveElement = container.querySelector(focusSnapshot.selector);
  if (
    !nextActiveElement ||
    !(
      nextActiveElement instanceof HTMLInputElement ||
      nextActiveElement instanceof HTMLTextAreaElement ||
      nextActiveElement instanceof HTMLSelectElement
    )
  ) {
    return;
  }

  nextActiveElement.focus();

  if (
    focusSnapshot.selectionStart !== null &&
    focusSnapshot.selectionStart !== undefined &&
    'setSelectionRange' in nextActiveElement
  ) {
    nextActiveElement.setSelectionRange(
      focusSnapshot.selectionStart,
      focusSnapshot.selectionEnd ?? focusSnapshot.selectionStart,
    );
  }
}

function getRecoveryMessage(message: string): string {
  return `Tallennus epaonnistui. Viimeisin versio sailyi palautettavana. ${message}`;
}

export class PlannerDraftView {
  private unsubscribeDraft: (() => void) | null = null;
  private unsubscribeSession: (() => void) | null = null;
  private pendingNotice: string | null = null;
  private activeLoad = Promise.resolve();
  private readonly uiState: PlannerDraftUiState = {
    drillQuery: '',
    drillCategory: '',
    testerNotes:
      'Testaa ensin listasta builderiin siirtyminen, sitten harjoitteen lisaaminen, lohkon siirto ja tallennustilan ymmarrettavyys.',
  };
  private readonly container: HTMLElement;
  private readonly draftState: PlannerDraftState;
  private readonly options: PlannerDraftViewOptions;

  constructor(
    container: HTMLElement,
    draftState: PlannerDraftState = plannerDraftState,
    options: PlannerDraftViewOptions = {},
  ) {
    this.container = container;
    this.draftState = draftState;
    this.options = options;
    this.service = options.service ?? new SessionPlannerService();
    this.sessionState = options.sessionState ?? new PlannerSessionState();
    this.recoveryStore = options.recoveryStore ?? plannerSessionRecoveryStore;
  }

  private readonly service: SessionPlannerService;
  private readonly sessionState: PlannerSessionState;
  private readonly recoveryStore: PlannerSessionRecoveryStore;

  async mount(): Promise<void> {
    this.container.dataset.shell = 'planner';
    this.container.dataset.view = 'planner-draft';
    this.unsubscribeDraft = this.draftState.subscribe(session => {
      if (session) {
        this.recoveryStore.saveDraft(session);
        this.sessionState.markDirty(session);
      } else {
        this.recoveryStore.clearDraft();
        this.sessionState.resetCurrentSession();
      }

      this.render();
    });
    this.unsubscribeSession = this.sessionState.subscribe(() => this.render());
    this.render();

    this.container.addEventListener('click', this.handleClick);
    this.container.addEventListener('input', this.handleFieldUpdate);
    this.container.addEventListener('change', this.handleFieldUpdate);

    this.activeLoad = this.initializeSession();
    await this.activeLoad;
  }

  destroy(): void {
    this.unsubscribeDraft?.();
    this.unsubscribeDraft = null;
    this.unsubscribeSession?.();
    this.unsubscribeSession = null;
    this.container.removeEventListener('click', this.handleClick);
    this.container.removeEventListener('input', this.handleFieldUpdate);
    this.container.removeEventListener('change', this.handleFieldUpdate);
  }

  private async initializeSession(): Promise<void> {
    if (this.options.routeKind === 'detail' && this.options.sessionId) {
      this.sessionState.beginSessionLoad();

      try {
        const session = await this.service.getSession(this.options.sessionId);
        this.draftState.replace(session);
        this.sessionState.completeSessionLoad(session);
      } catch (error) {
        this.sessionState.failSessionLoad(error);
      }

      return;
    }

    if (this.draftState.getSnapshot()) {
      return;
    }

    const draft = this.recoveryStore.getDraft();
    if (draft) {
      this.pendingNotice = 'Paikallinen luonnos palautettiin selaimesta.';
      this.draftState.replace(draft);
    }
  }

  private readonly handleClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const actionTarget = target.closest<HTMLElement>('[data-planner-action]');
    if (!actionTarget) {
      return;
    }

    const action = actionTarget.dataset.plannerAction;
    const blockId = actionTarget.dataset.blockId;

    switch (action) {
      case 'clear':
        this.pendingNotice = null;
        this.recoveryStore.clearDraft();
        this.draftState.clear();
        break;
      case 'add-block':
        this.draftState.addCustomBlock();
        break;
      case 'add-mock-drill': {
        const drillId = actionTarget.dataset.drillId;
        const drill = PLANNER_TEST_DRILLS.find(candidate => candidate.id === drillId);
        if (drill) {
          this.pendingNotice = `${drill.title} lisattiin harjoitukseen.`;
          this.draftState.addDrill(drill);
          showViewFeedback('Harjoite lisatty', `${drill.title} lisattiin harjoituksen runkoon.`, 'success');
        }
        break;
      }
      case 'move-up':
        if (blockId) {
          this.draftState.moveBlock(blockId, 'up');
        }
        break;
      case 'move-down':
        if (blockId) {
          this.draftState.moveBlock(blockId, 'down');
        }
        break;
      case 'remove-block':
        if (blockId) {
          this.draftState.removeBlock(blockId);
        }
        break;
      case 'save':
        void this.saveSession();
        break;
      case 'share':
        void this.shareSession();
        break;
      case 'restore-recovery':
        this.restoreRecovery();
        break;
      case 'discard-recovery':
        this.recoveryStore.clearRecovery();
        this.render();
        break;
      case 'print':
        this.printSession();
        break;
      default:
        break;
    }
  };

  private readonly handleFieldUpdate = (event: Event): void => {
    const target = event.target;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      )
    ) {
      return;
    }

    const uiField = target.dataset.plannerUiField;
    if (uiField) {
      this.updateUiField(uiField, target.value);
      return;
    }

    const sessionField = target.dataset.sessionField;
    if (sessionField) {
      this.updateSessionField(sessionField, target.value);
      return;
    }

    const blockField = target.dataset.blockField;
    const blockId = target.dataset.blockId;
    if (blockField && blockId) {
      this.updateBlockField(blockId, blockField, target.value);
    }
  };

  private updateUiField(field: string, value: string): void {
    switch (field) {
      case 'drillQuery':
        this.uiState.drillQuery = value;
        this.render();
        break;
      case 'drillCategory':
        this.uiState.drillCategory = value;
        this.render();
        break;
      case 'testerNotes':
        this.uiState.testerNotes = value;
        this.render();
        break;
      default:
        break;
    }
  }

  private updateSessionField(field: string, rawValue: string): void {
    switch (field) {
      case 'name':
      case 'group':
      case 'date':
      case 'coachLabel':
        this.draftState.updateSessionDetails({ [field]: rawValue });
        break;
      case 'targetDurationMin':
        this.draftState.updateSessionDetails({
          targetDurationMin: rawValue === '' ? 0 : Number(rawValue),
        });
        break;
      default:
        break;
    }
  }

  private updateBlockField(blockId: string, field: string, rawValue: string): void {
    switch (field) {
      case 'title':
      case 'notes':
        this.draftState.updateBlock(blockId, { [field]: rawValue });
        break;
      case 'durationMin':
        this.draftState.updateBlock(blockId, {
          durationMin: rawValue === '' ? 0 : Number(rawValue),
        });
        break;
      case 'type':
        this.draftState.updateBlock(blockId, { type: rawValue as SessionBlockType });
        break;
      default:
        break;
    }
  }

  private async saveSession(): Promise<void> {
    const session = this.draftState.ensureDraft();
    this.sessionState.beginSave();

    try {
      const basePayload = {
        name: session.name,
        group: session.group,
        date: session.date,
        coachLabel: session.coachLabel,
        totalDurationMin: calculateTotalDuration(session.blocks),
        blocks: session.blocks.map(block => {
          const nextBlock: NonNullable<CreateSessionInput['blocks']>[number] = {
            order: block.order,
            type: block.type,
            title: block.title,
            durationMin: block.durationMin,
            notes: block.notes,
          };

          if (!block.id.startsWith('block_')) {
            nextBlock.id = block.id;
          }

          if (block.drillId) {
            nextBlock.drillId = block.drillId;
          }

          if (block.attachmentIds && block.attachmentIds.length > 0) {
            nextBlock.attachmentIds = block.attachmentIds;
          }

          return nextBlock;
        }),
      };

      const createPayload: CreateSessionInput = { ...basePayload };
      const updatePayload: UpdateSessionInput = { ...basePayload };

      if (session.targetDurationMin !== undefined) {
        createPayload.targetDurationMin = session.targetDurationMin;
        updatePayload.targetDurationMin = session.targetDurationMin;
      }

      const saved = session.id === 'session_draft'
        ? await this.service.createSession(createPayload)
        : await this.service.updateSession(session.id, updatePayload);

      this.pendingNotice = 'Suunnitelma tallennettiin palvelimelle.';
      showViewFeedback('Suunnitelma tallennettu', `${saved.name} paivittyi plannerin testiversioon.`, 'success');
      this.recoveryStore.saveDraft(saved);
      this.recoveryStore.clearRecovery();
      this.draftState.replace(saved);
      this.sessionState.completeSave(saved);

      if (this.options.routeKind !== 'detail') {
        window.location.hash = `#/plan/${saved.id}`;
      }
    } catch (error) {
      this.pendingNotice = null;
      this.recoveryStore.saveRecovery(session, error instanceof Error ? error.message : 'Tuntematon virhe.');
      this.sessionState.failSave(error);
      this.render();
    }
  }

  private async shareSession(): Promise<void> {
    const session = this.draftState.getSnapshot();
    if (!session || session.id === 'session_draft') {
      this.pendingNotice = 'Tallenna suunnitelma ennen jakolinkin luontia.';
      this.render();
      return;
    }

    this.sessionState.beginShare();

    try {
      const shareResult = await this.service.createShareLink(session.id);
      this.sessionState.completeShare(shareResult);
      const nextSession = {
        ...session,
        visibility: shareResult.visibility,
        shareId: shareResult.shareId,
      };
      this.draftState.replace(nextSession);
      this.pendingNotice = `Jaettava linkki valmis: ${shareResult.shareUrl}`;
      showViewFeedback('Jakolinkki valmis', 'Jaettu lukutila voidaan avata puhelimelle tai tulostaa.', 'success');
    } catch (error) {
      this.pendingNotice = null;
      this.sessionState.failShare(error);
    }
  }

  private restoreRecovery(): void {
    const recovery = this.recoveryStore.getRecovery();
    if (!recovery) {
      return;
    }

    this.pendingNotice = 'Palautettava versio avattiin muokattavaksi.';
    this.draftState.replace(recovery.session);
    this.recoveryStore.saveDraft(recovery.session);
  }

  private printSession(): void {
    const session = this.draftState.getSnapshot();
    if (!session) {
      return;
    }

    const opened = openSessionPrintView({
      ...session,
      totalDurationMin: session.totalDurationMin ?? calculateTotalDuration(session.blocks),
    });

    this.pendingNotice = opened
      ? 'Tulostusnakyma avattiin uuteen ikkunaan.'
      : 'Tulostusikkunaa ei voitu avata. Tarkista selaimen estoasetukset.';
    showViewFeedback(
      opened ? 'Tulostus avattu' : 'Tulostus estetty',
      opened ? 'Jaettu tulostusnakyma avattiin uuteen ikkunaan.' : 'Selaimen estoasetukset estivat uuden ikkunan.',
      opened ? 'info' : 'warning',
    );
    this.render();
  }

  private render(): void {
    const focusSnapshot = getFocusSnapshot(this.container);
    const routeHash = this.options.routeKind === 'detail' && this.options.sessionId
      ? `#/plan/${this.options.sessionId}`
      : '#/plan/new';
    const route = parseHashRoute(routeHash);
    const view = selectViewShell(route);
    const sessionSnapshot = this.draftState.getSnapshot();
    const session = getRenderSession(sessionSnapshot);
    const plannerSnapshot = this.sessionState.getSnapshot();
    const totalDurationMin = session.totalDurationMin ?? calculateTotalDuration(session.blocks);
    const targetDurationMin = session.targetDurationMin ?? 0;
    const hasBlocks = session.blocks.length > 0;
    const recovery = this.recoveryStore.getRecovery();
    const filteredDrills = PLANNER_TEST_DRILLS.filter(drill => {
      if (this.uiState.drillCategory && drill.category !== this.uiState.drillCategory) {
        return false;
      }

      const normalizedQuery = this.uiState.drillQuery.trim().toLocaleLowerCase('fi');
      if (!normalizedQuery) {
        return true;
      }

      return [drill.title, drill.summary, drill.category, ...drill.skillTags]
        .join(' ')
        .toLocaleLowerCase('fi')
        .includes(normalizedQuery);
    });
    const recommendedDrill = filteredDrills[0] ?? null;
    const shareUrl = plannerSnapshot.currentSession?.shareId
      ? `#/session/${plannerSnapshot.currentSession.shareId}`
      : session.shareId
        ? `#/session/${session.shareId}`
        : '';
    const saveStateCopy = plannerSnapshot.saveState.status === 'error'
      ? getRecoveryMessage(plannerSnapshot.saveState.error?.message || 'Yrita uudelleen.')
      : plannerSnapshot.saveState.status === 'saved'
        ? 'Viimeisin versio on tallessa. Voit jatkaa muokkausta tai avata tulostuksen.'
        : sessionSnapshot
          ? 'Luonnos pysyy selaimessa myos ennen palvelintallennusta.'
          : 'Aloita harjoituksen runko ja tallenna se valmentajan suunnitelmiin.';

    if (plannerSnapshot.detailState.status === 'loading') {
      this.container.innerHTML = renderViewStateSection({
        shell: view.shell,
        eyebrow: view.eyebrow,
        title: view.title,
        description: 'Sessiorunko, tallennustila ja builderin sivupaneelit valmistellaan ennen muokkausta.',
        state: {
          kind: 'loading',
          title: 'Ladataan suunnitelmaa',
          message: 'Valmistellaan lohkot, kestotiedot ja palautettava luonnos samaan nakymaan.',
        },
      });
      return;
    }

    if (plannerSnapshot.detailState.status === 'error') {
      this.container.innerHTML = renderViewStateSection({
        shell: view.shell,
        eyebrow: view.eyebrow,
        title: view.title,
        description: 'Sessiota ei voitu ladata, mutta listalle palaaminen ja uuden rungon avaaminen pysyvat tarjolla.',
        state: {
          kind: 'error',
          title: 'Suunnitelmaa ei voitu avata',
          message: plannerSnapshot.detailState.error?.message || 'Yrita hetken paasta uudelleen.',
          actions: [{ href: '#/plan', label: 'Palaa suunnitelmiin' }],
        },
      });
      return;
    }

    this.container.innerHTML = `
      <section class="view-shell view-shell-${view.shell} planner-draft-view" aria-labelledby="plannerDraftTitle">
        <div class="planner-draft-header">
          <div>
            <p class="view-shell-eyebrow">${view.eyebrow}</p>
            <h2 id="plannerDraftTitle" class="view-shell-title">${escapeHtml(session.name)}</h2>
            <p class="view-shell-description">Rakenna harjoitusrunko, tallenna se valmentajalle ja avaa selkea jako- tai tulostusversio harjoituksiin.</p>
          </div>
          <div class="planner-draft-actions">
            <a class="view-shell-link" href="#/plan">Omat suunnitelmat</a>
            <a class="view-shell-link" href="#/drills">Lisaa harjoitteita</a>
            <button type="button" class="planner-draft-clear" data-planner-action="clear">Tyhjenna luonnos</button>
          </div>
        </div>

        ${renderShellSupportPanels(route)}

        ${
          recovery
            ? `
              <div class="planner-inline-banner planner-inline-banner-warning" role="status">
                <div>
                  <strong>Palautettava versio loytyi</strong>
                  <p>${escapeHtml(recovery.reason)}</p>
                </div>
                <div class="planner-inline-actions">
                  <button type="button" class="planner-draft-save-button" data-planner-action="restore-recovery">Palauta</button>
                  <button type="button" class="planner-draft-clear" data-planner-action="discard-recovery">Poista</button>
                </div>
              </div>
            `
            : ''
        }

        ${
          this.pendingNotice
            ? `<div class="planner-inline-banner planner-inline-banner-success" role="status"><p>${escapeHtml(this.pendingNotice)}</p></div>`
            : ''
        }

        <div class="planner-draft-save-strip" aria-live="polite">
          <div>
            <p class="planner-draft-save-label">Tallennustila</p>
            <strong>${plannerSnapshot.saveState.status === 'saving' ? 'Tallennetaan...' : session.id === 'session_draft' ? 'Paikallinen luonnos' : 'Tallennettu suunnitelma'}</strong>
            <p class="planner-draft-save-copy">${escapeHtml(saveStateCopy)}</p>
          </div>
          <div class="planner-inline-actions">
            <button type="button" class="planner-draft-save-button" data-planner-action="save" ${plannerSnapshot.saveState.status === 'saving' ? 'disabled' : ''}>
              ${session.id === 'session_draft' ? 'Tallenna suunnitelma' : 'Paivita suunnitelma'}
            </button>
            <button type="button" class="planner-draft-save-button planner-draft-save-button-secondary" data-planner-action="share" ${session.id === 'session_draft' || plannerSnapshot.shareState.status === 'saving' ? 'disabled' : ''}>Jaa linkki</button>
            <button type="button" class="planner-draft-save-button planner-draft-save-button-secondary" data-planner-action="print">Tulosta</button>
          </div>
        </div>

        ${
          shareUrl
            ? `
              <div class="planner-inline-banner planner-inline-banner-neutral" role="status">
                <div>
                  <strong>Jaettu versio valmis</strong>
                  <p>Avaa luettava harjoitusnakyma puhelimelle tai tulostettavaksi.</p>
                </div>
                <div class="planner-inline-actions">
                  <a class="view-shell-link" href="${shareUrl}">Avaa jaettu nakyma</a>
                </div>
              </div>
            `
            : ''
        }

        <div class="planner-draft-builder">
          <div class="planner-draft-main-column">
            <section class="planner-draft-panel planner-draft-panel-meta" aria-labelledby="plannerDraftMetaTitle">
              <div class="planner-draft-section-heading">
                <div>
                  <p class="planner-draft-section-kicker">Harjoituksen tiedot</p>
                  <h3 id="plannerDraftMetaTitle">Perustiedot</h3>
                </div>
              </div>
              <div class="planner-draft-form-grid">
                <label class="planner-draft-field">
                  <span>Nimi</span>
                  <input type="text" value="${escapeHtml(session.name)}" data-session-field="name" />
                </label>
                <label class="planner-draft-field">
                  <span>Ryhma</span>
                  <input type="text" value="${escapeHtml(session.group)}" data-session-field="group" />
                </label>
                <label class="planner-draft-field">
                  <span>Paiva</span>
                  <input type="date" value="${escapeHtml(session.date)}" data-session-field="date" />
                </label>
                <label class="planner-draft-field">
                  <span>Tavoitekesto</span>
                  <input type="number" min="0" inputmode="numeric" value="${targetDurationMin}" data-session-field="targetDurationMin" />
                </label>
                <label class="planner-draft-field planner-draft-field-wide">
                  <span>Valmentajan nimi</span>
                  <input type="text" value="${escapeHtml(session.coachLabel)}" data-session-field="coachLabel" />
                </label>
              </div>
            </section>

            <section class="planner-draft-panel planner-draft-panel-catalog" aria-labelledby="plannerDraftCatalogTitle">
              <div class="planner-draft-section-heading">
                <div>
                  <p class="planner-draft-section-kicker">Harjoitehaku</p>
                  <h3 id="plannerDraftCatalogTitle">Lisaa runkoon nopeasti</h3>
                </div>
                ${
                  recommendedDrill
                    ? `<span class="planner-draft-helper-pill">Suositus: ${escapeHtml(recommendedDrill.title)}</span>`
                    : '<span class="planner-draft-helper-pill">Ei osumia</span>'
                }
              </div>
              <div class="planner-draft-catalog-toolbar">
                <label class="planner-draft-field planner-draft-field-search">
                  <span>Etsi harjoite</span>
                  <input
                    type="search"
                    inputmode="search"
                    placeholder="Kirjoita nimi, kategoria tai tagi"
                    value="${escapeHtml(this.uiState.drillQuery)}"
                    data-planner-ui-field="drillQuery"
                  />
                </label>
                <label class="planner-draft-field">
                  <span>Kategoria</span>
                  <select data-planner-ui-field="drillCategory">
                    <option value="">Kaikki kategoriat</option>
                    ${getPlannerDrillCategories()
                      .map(
                        category =>
                          `<option value="${escapeHtml(category)}"${
                            category === this.uiState.drillCategory ? ' selected' : ''
                          }>${escapeHtml(category)}</option>`,
                      )
                      .join('')}
                  </select>
                </label>
              </div>
              <div class="planner-draft-drill-grid" aria-label="Harjoite-ehdotukset">
                ${
                  filteredDrills.length > 0
                    ? filteredDrills
                        .map(
                          drill => `
                            <article class="planner-draft-drill-card">
                              <div class="planner-draft-block-topline">
                                <div>
                                  <p class="planner-draft-section-kicker">${escapeHtml(drill.category)}</p>
                                  <h4>${escapeHtml(drill.title)}</h4>
                                </div>
                                <span class="planner-draft-helper-pill">${drill.durationMin ?? 0} min</span>
                              </div>
                              <p class="planner-draft-drill-copy">${escapeHtml(drill.summary)}</p>
                              <p class="planner-draft-drill-meta">${escapeHtml(drill.ageGroups.join(', '))} · ${escapeHtml(
                                drill.skillTags.slice(0, 3).join(', '),
                              )}</p>
                              <div class="planner-inline-actions">
                                <button
                                  type="button"
                                  class="planner-draft-save-button planner-draft-save-button-secondary"
                                  data-planner-action="add-mock-drill"
                                  data-drill-id="${escapeHtml(drill.id)}"
                                >
                                  Lisaa suunnitelmaan
                                </button>
                                <a class="view-shell-link" href="#/drills/${encodeURIComponent(drill.id)}">Avaa tiedot</a>
                              </div>
                            </article>
                          `,
                        )
                        .join('')
                    : `
                      <div class="planner-draft-empty">
                        <h3>Ei harjoitteita tallla haulla</h3>
                        <p>Tyhjenna haku tai vaihda kategoria. Testiversio kayttaa rajattua mock-listaa, jotta lisaamispolku pysyy nopeana arvioinnissa.</p>
                      </div>
                    `
                }
              </div>
            </section>
          </div>

          <aside class="planner-draft-side-column">
            <section class="planner-draft-panel planner-draft-panel-totals">
              <div class="planner-draft-totals-sticky">
                <p class="planner-draft-section-kicker">Kesto</p>
                <div class="planner-draft-totals-grid">
                  <div>
                    <span>Yhteensa</span>
                    <strong>${totalDurationMin} min</strong>
                  </div>
                  <div>
                    <span>Tavoite</span>
                    <strong>${targetDurationMin} min</strong>
                  </div>
                  <div>
                    <span>Erotus</span>
                    <strong>${escapeHtml(formatDelta(targetDurationMin, totalDurationMin))}</strong>
                  </div>
                  <div>
                    <span>Lohkoja</span>
                    <strong>${session.blocks.length}</strong>
                  </div>
                </div>
                <p class="planner-draft-totals-note">Kesto paivittyy heti, kun muutat lohkon minuutteja tai jarjestysta.</p>
              </div>
            </section>

            <section class="planner-draft-panel planner-draft-panel-notes" aria-labelledby="plannerDraftNotesTitle">
              <div class="planner-draft-section-heading">
                <div>
                  <p class="planner-draft-section-kicker">Testimuistiinpanot</p>
                  <h3 id="plannerDraftNotesTitle">Mita tarkkailet testissa</h3>
                </div>
              </div>
              <label class="planner-draft-field">
                <span>Huomiot testerille</span>
                <textarea rows="5" data-planner-ui-field="testerNotes">${escapeHtml(this.uiState.testerNotes)}</textarea>
              </label>
              <p class="planner-draft-totals-note">Tallennetaan vain selaimen testiversiota varten. Lopullinen sessio-API ei viela kayta tata kenttaa.</p>
            </section>

            <section class="planner-draft-panel planner-draft-panel-status" aria-labelledby="plannerDraftStatusTitle">
              <div class="planner-draft-section-heading">
                <div>
                  <p class="planner-draft-section-kicker">Valmius</p>
                  <h3 id="plannerDraftStatusTitle">Mika on aitoa, mika mockattu</h3>
                </div>
              </div>
              <div class="planner-draft-status-grid">
                <div>
                  <span>Lista ja avaus</span>
                  <strong>Live sessio-API</strong>
                </div>
                <div>
                  <span>Harjoitehaku builderissa</span>
                  <strong>Mockattu testidatalla</strong>
                </div>
                <div>
                  <span>Tallennustila</span>
                  <strong>${plannerSnapshot.saveState.status === 'saved' ? 'Palvelimeen tallennettu' : 'Paikallinen + API-polku'}</strong>
                </div>
                <div>
                  <span>Jako ja tulostus</span>
                  <strong>${shareUrl ? 'Linkki valmis' : 'Placeholder-nakyma valmis'}</strong>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <section class="planner-draft-panel planner-draft-panel-blocks" aria-labelledby="plannerDraftBlocksTitle">
          <div class="planner-draft-section-heading">
            <div>
              <p class="planner-draft-section-kicker">Lohkot</p>
              <h3 id="plannerDraftBlocksTitle">Harjoituksen runko</h3>
            </div>
            <button type="button" class="planner-draft-add-block" data-planner-action="add-block">Lisaa tyhja lohko</button>
          </div>

          ${
            hasBlocks
              ? `
                <ol class="planner-draft-blocks" aria-label="Suunnitelman lohkot">
                  ${session.blocks
                    .map(
                      (block, index) => `
                        <li class="planner-draft-block" data-planner-block-id="${escapeHtml(block.id)}">
                          <div class="planner-draft-block-topline">
                            <p class="planner-draft-block-order">Lohko ${index + 1}</p>
                            <p class="planner-draft-block-meta">${escapeHtml(formatBlockMeta(block))}</p>
                          </div>
                          <div class="planner-draft-block-grid">
                            <label class="planner-draft-field planner-draft-field-wide">
                              <span>Otsikko</span>
                              <input type="text" value="${escapeHtml(block.title)}" data-block-id="${escapeHtml(block.id)}" data-block-field="title" />
                            </label>
                            <label class="planner-draft-field">
                              <span>Tyyppi</span>
                              <select data-block-id="${escapeHtml(block.id)}" data-block-field="type">
                                ${Object.entries(BLOCK_TYPE_LABELS)
                                  .map(
                                    ([value, label]) =>
                                      `<option value="${escapeHtml(value)}"${
                                        block.type === value ? ' selected' : ''
                                      }>${escapeHtml(label)}</option>`,
                                  )
                                  .join('')}
                              </select>
                            </label>
                            <label class="planner-draft-field">
                              <span>Kesto (min)</span>
                              <input type="number" min="0" inputmode="numeric" value="${block.durationMin}" data-block-id="${escapeHtml(block.id)}" data-block-field="durationMin" />
                            </label>
                            <label class="planner-draft-field planner-draft-field-wide">
                              <span>Muistiinpanot</span>
                              <textarea rows="3" data-block-id="${escapeHtml(block.id)}" data-block-field="notes">${escapeHtml(block.notes)}</textarea>
                            </label>
                          </div>
                          <div class="planner-draft-block-actions">
                            <button type="button" class="planner-draft-block-move" data-planner-action="move-up" data-block-id="${escapeHtml(block.id)}" ${
                              index === 0 ? 'disabled' : ''
                            }>Siirra ylos</button>
                            <button type="button" class="planner-draft-block-move" data-planner-action="move-down" data-block-id="${escapeHtml(block.id)}" ${
                              index === session.blocks.length - 1 ? 'disabled' : ''
                            }>Siirra alas</button>
                            <button type="button" class="planner-draft-block-remove" data-planner-action="remove-block" data-block-id="${escapeHtml(block.id)}">Poista</button>
                          </div>
                        </li>
                      `,
                    )
                    .join('')}
                </ol>
              `
              : `
                <div class="planner-draft-empty">
                  <h3>Luonnos on tyhja</h3>
                  <p>Lisaa harjoite katalogista tai rakenna runko kasin. Kokonaiskesto alkaa paivittya heti, kun lohkot saavat minuutit.</p>
                  <div class="planner-draft-empty-actions">
                    <a class="view-shell-link" href="#/drills">Avaa harjoitteet</a>
                    <button type="button" class="planner-draft-add-block" data-planner-action="add-block">Lisaa ensimmainen lohko</button>
                  </div>
                </div>
              `
          }
        </section>
      </section>
    `;

    restoreFocus(this.container, focusSnapshot);
  }
}
