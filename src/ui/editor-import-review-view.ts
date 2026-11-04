import { escapeHtml } from '@/components/drill-presenters';
import { renderViewState, renderViewStateSection, showViewFeedback } from '@/components/view-state';
import { EditorDrillService } from '@/services/drill-catalog-service';
import { ImportReviewService } from '@/services/import-review-service';
import { isPlannerApiError } from '@/services/planner-api-client';
import { PlannerAuthService } from '@/services/planner-auth-service';
import { PlannerAccessState } from '@/state/planner-access-state';
import { EditorDraftState } from '@/state/editor-draft-state';
import type { DrillIntensityLevel } from '@/types/drills';
import type { DrillImportConfidence, DrillImportDraft, DrillImportReviewStatus, DrillImportSourceType } from '@/types/imports';
import { parseHashRoute } from '@/ui/routes';
import { renderShellSupportPanels, selectViewShell } from '@/ui/view-shells';
import { validateEditorDrillForm } from '@/ui/editor-drill-view';

interface FocusSnapshot {
  selector: string;
  selectionStart?: number | null;
  selectionEnd?: number | null;
}

interface ImportReviewFormValues {
  title: string;
  slug: string;
  summary: string;
  description: string;
  category: string;
  intensityLevel: '' | DrillIntensityLevel;
  ageGroups: string;
  skillTags: string;
  durationMin: string;
  playerCountMin: string;
  playerCountMax: string;
  equipment: string;
  coachingPoints: string;
  setupInstructions: string;
  progressionIdeas: string;
  variationIdeas: string;
  primaryImageUrl: string;
  reviewNotes: string;
}

interface ImportQueueFilters {
  reviewStatus: '' | DrillImportReviewStatus;
  sourceType: '' | DrillImportSourceType;
}

interface ReadinessChecklistItem {
  label: string;
  done: boolean;
}

const REVIEW_DRAFT_STORAGE_PREFIX = 'hawks.editor.import-review.v1:';

function createEmptyFormValues(): ImportReviewFormValues {
  return {
    title: '',
    slug: '',
    summary: '',
    description: '',
    category: '',
    intensityLevel: '',
    ageGroups: '',
    skillTags: '',
    durationMin: '',
    playerCountMin: '',
    playerCountMax: '',
    equipment: '',
    coachingPoints: '',
    setupInstructions: '',
    progressionIdeas: '',
    variationIdeas: '',
    primaryImageUrl: '',
    reviewNotes: '',
  };
}

function listToFieldValue(values: string[] | undefined): string {
  return (values || []).join('\n');
}

function fieldValueToList(value: string): string[] {
  return value
    .split(/\n|,/)
    .map(item => item.trim())
    .filter(Boolean);
}

function parseOptionalNonNegativeInteger(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (!/^\d+$/.test(trimmed)) {
    return Number.NaN;
  }

  return Number(trimmed);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
}

function buildFormValuesFromDraft(draft: DrillImportDraft): ImportReviewFormValues {
  const extracted = draft.extractedFields || {};

  return {
    title: asString(extracted.title) || draft.extractedTitle || '',
    slug: asString(extracted.slug),
    summary: asString(extracted.summary),
    description: asString(extracted.description) || draft.extractedText || '',
    category: asString(extracted.category),
    intensityLevel: (asString(extracted.intensityLevel) as ImportReviewFormValues['intensityLevel']) || '',
    ageGroups: listToFieldValue(asStringList(extracted.ageGroups)),
    skillTags: listToFieldValue(asStringList(extracted.skillTags)),
    durationMin: extracted.durationMin === undefined ? '' : String(extracted.durationMin),
    playerCountMin: extracted.playerCountMin === undefined ? '' : String(extracted.playerCountMin),
    playerCountMax: extracted.playerCountMax === undefined ? '' : String(extracted.playerCountMax),
    equipment: listToFieldValue(asStringList(extracted.equipment)),
    coachingPoints: listToFieldValue(asStringList(extracted.coachingPoints)),
    setupInstructions: asString(extracted.setupInstructions),
    progressionIdeas: listToFieldValue(asStringList(extracted.progressionIdeas)),
    variationIdeas: listToFieldValue(asStringList(extracted.variationIdeas)),
    primaryImageUrl: asString(extracted.primaryImageUrl),
    reviewNotes: draft.reviewNotes || '',
  };
}

function buildApprovalInput(values: ImportReviewFormValues) {
  const payload: Record<string, unknown> = {
    ageGroups: fieldValueToList(values.ageGroups),
    skillTags: fieldValueToList(values.skillTags),
    equipment: fieldValueToList(values.equipment),
    coachingPoints: fieldValueToList(values.coachingPoints),
    progressionIdeas: fieldValueToList(values.progressionIdeas),
    variationIdeas: fieldValueToList(values.variationIdeas),
  };

  const title = values.title.trim();
  const slug = values.slug.trim();
  const summary = values.summary.trim();
  const description = values.description.trim();
  const category = values.category.trim();
  const setupInstructions = values.setupInstructions.trim();
  const primaryImageUrl = values.primaryImageUrl.trim();
  const durationMin = parseOptionalNonNegativeInteger(values.durationMin);
  const playerCountMin = parseOptionalNonNegativeInteger(values.playerCountMin);
  const playerCountMax = parseOptionalNonNegativeInteger(values.playerCountMax);

  if (title) {
    payload.title = title;
  }
  if (slug) {
    payload.slug = slug;
  }
  if (summary) {
    payload.summary = summary;
  }
  if (description) {
    payload.description = description;
  }
  if (category) {
    payload.category = category;
  }
  if (values.intensityLevel) {
    payload.intensityLevel = values.intensityLevel;
  }
  if (durationMin !== undefined && !Number.isNaN(durationMin)) {
    payload.durationMin = durationMin;
  }
  if (playerCountMin !== undefined && !Number.isNaN(playerCountMin)) {
    payload.playerCountMin = playerCountMin;
  }
  if (playerCountMax !== undefined && !Number.isNaN(playerCountMax)) {
    payload.playerCountMax = playerCountMax;
  }
  if (setupInstructions) {
    payload.setupInstructions = setupInstructions;
  }
  if (primaryImageUrl) {
    payload.primaryImageUrl = primaryImageUrl;
  }

  return payload;
}

function buildImportQuery(filters: ImportQueueFilters): {
  reviewStatus?: DrillImportReviewStatus;
  sourceType?: DrillImportSourceType;
} {
  const query: {
    reviewStatus?: DrillImportReviewStatus;
    sourceType?: DrillImportSourceType;
  } = {};

  if (filters.reviewStatus) {
    query.reviewStatus = filters.reviewStatus;
  }

  if (filters.sourceType) {
    query.sourceType = filters.sourceType;
  }

  return query;
}

function buildReviewPayload(reviewNotes: string): { reviewNotes?: string } {
  const trimmed = reviewNotes.trim();
  return trimmed ? { reviewNotes: trimmed } : {};
}

function buildImportReadinessChecklist(values: ImportReviewFormValues): ReadinessChecklistItem[] {
  return [
    { label: 'Jarjestelman nimi tarkistettu', done: Boolean(values.title.trim()) },
    { label: 'Yhteenveto ja kuvaus korjattu', done: Boolean(values.summary.trim() && values.description.trim()) },
    { label: 'Kategoria ja ikaryhmat tarkennettu', done: Boolean(values.category.trim() && values.ageGroups.trim()) },
    { label: 'Valmennussisalto taydennetty', done: Boolean(values.coachingPoints.trim()) },
    { label: 'Review-muistiinpano kirjattu', done: Boolean(values.reviewNotes.trim()) },
  ];
}

function renderReadinessChecklist(items: ReadinessChecklistItem[]): string {
  return `
    <div class="editor-review-checklist" aria-label="Importin tarkistuslista">
      ${items
        .map(
          item => `
            <div class="editor-review-checklist-item${item.done ? ' is-complete' : ''}">
              <span>${item.done ? 'Valmis' : 'Kesken'}</span>
              <strong>${escapeHtml(item.label)}</strong>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

function getStorageKey(draftId: string): string {
  return `${REVIEW_DRAFT_STORAGE_PREFIX}${draftId}`;
}

function readStoredFormValues(draftId: string): Partial<ImportReviewFormValues> | null {
  try {
    const raw = window.localStorage.getItem(getStorageKey(draftId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<ImportReviewFormValues>;
    return typeof parsed === 'object' && parsed ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredFormValues(draftId: string, values: ImportReviewFormValues): void {
  try {
    window.localStorage.setItem(getStorageKey(draftId), JSON.stringify(values));
  } catch {
    // Ignore local persistence failures and keep the editor usable.
  }
}

function clearStoredFormValues(draftId: string): void {
  try {
    window.localStorage.removeItem(getStorageKey(draftId));
  } catch {
    // Ignore local persistence failures and keep the editor usable.
  }
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

  const field = activeElement.dataset.importField;
  if (!field) {
    return null;
  }

  return {
    selector: `[data-import-field="${field}"]`,
    selectionStart: 'selectionStart' in activeElement ? activeElement.selectionStart : null,
    selectionEnd: 'selectionEnd' in activeElement ? activeElement.selectionEnd : null,
  };
}

function restoreFocus(container: HTMLElement, snapshot: FocusSnapshot | null): void {
  if (!snapshot) {
    return;
  }

  const element = container.querySelector(snapshot.selector);
  if (
    !element ||
    !(
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    )
  ) {
    return;
  }

  element.focus();
  if (
    snapshot.selectionStart !== null &&
    snapshot.selectionStart !== undefined &&
    'setSelectionRange' in element
  ) {
    element.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd ?? snapshot.selectionStart);
  }
}

function renderField(
  type: 'input' | 'textarea' | 'select',
  name: keyof ImportReviewFormValues,
  label: string,
  value: string,
  error: string | undefined,
  options: {
    inputType?: string;
    placeholder?: string;
    rows?: number;
    width?: 'wide';
    selectOptions?: Array<{ value: string; label: string }>;
    hint?: string;
  } = {},
): string {
  const describedBy = error ? `editorImportError-${name}` : '';
  const invalid = error ? 'true' : 'false';
  const fieldClass = options.width === 'wide' ? 'planner-draft-field planner-draft-field-wide' : 'planner-draft-field';

  let control = '';
  if (type === 'textarea') {
    control = `<textarea data-import-field="${name}" rows="${options.rows || 4}" aria-invalid="${invalid}" ${
      describedBy ? `aria-describedby="${describedBy}"` : ''
    } placeholder="${escapeHtml(options.placeholder || '')}">${escapeHtml(value)}</textarea>`;
  } else if (type === 'select') {
    control = `
      <select data-import-field="${name}" aria-invalid="${invalid}" ${describedBy ? `aria-describedby="${describedBy}"` : ''}>
        ${(options.selectOptions || [])
          .map(option => `<option value="${escapeHtml(option.value)}"${option.value === value ? ' selected' : ''}>${escapeHtml(option.label)}</option>`)
          .join('')}
      </select>
    `;
  } else {
    control = `<input data-import-field="${name}" type="${options.inputType || 'text'}" value="${escapeHtml(value)}" aria-invalid="${invalid}" ${
      describedBy ? `aria-describedby="${describedBy}"` : ''
    } placeholder="${escapeHtml(options.placeholder || '')}" />`;
  }

  return `
    <label class="${fieldClass}">
      <span>${label}</span>
      ${control}
      ${options.hint ? `<small class="editor-drill-field-hint">${escapeHtml(options.hint)}</small>` : ''}
      ${error ? `<small class="editor-drill-field-error" id="editorImportError-${name}">${escapeHtml(error)}</small>` : ''}
    </label>
  `;
}

function renderBadge(label: string, tone: 'neutral' | 'warning' | 'success'): string {
  return `<span class="editor-import-badge editor-import-badge-${tone}">${escapeHtml(label)}</span>`;
}

function renderConfidenceBadge(confidence: DrillImportConfidence): string {
  const copy: Record<DrillImportConfidence, { label: string; tone: 'neutral' | 'warning' | 'success' }> = {
    high: { label: 'Korkea varmuus', tone: 'success' },
    medium: { label: 'Keskitasoinen varmuus', tone: 'neutral' },
    low: { label: 'Matala varmuus', tone: 'warning' },
  };

  return renderBadge(copy[confidence].label, copy[confidence].tone);
}

function renderStatusBadge(status: DrillImportReviewStatus): string {
  const copy: Record<DrillImportReviewStatus, { label: string; tone: 'neutral' | 'warning' | 'success' }> = {
    pending: { label: 'Odottaa', tone: 'warning' },
    reviewed: { label: 'Tarkistettu', tone: 'neutral' },
    rejected: { label: 'Hylatty', tone: 'warning' },
    converted: { label: 'Muunnettu', tone: 'success' },
  };

  return renderBadge(copy[status].label, copy[status].tone);
}

function formatTimestamp(value: string | undefined): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fi-FI', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export class EditorImportReviewView {
  private readonly editorState: EditorDraftState;
  private readonly accessState: PlannerAccessState;
  private readonly importService: ImportReviewService;
  private readonly drillService: EditorDrillService;
  private readonly authService: PlannerAuthService;
  private readonly queueFilters: ImportQueueFilters = {
    reviewStatus: '',
    sourceType: '',
  };

  private formValues: ImportReviewFormValues = createEmptyFormValues();
  private unsubscribeEditorState: (() => void) | null = null;
  private unsubscribeAccessState: (() => void) | null = null;
  private pendingNotice: string | null = null;

  constructor(
    private readonly container: HTMLElement,
    options: {
      editorState?: EditorDraftState;
      accessState?: PlannerAccessState;
      importService?: ImportReviewService;
      drillService?: EditorDrillService;
      authService?: PlannerAuthService;
    } = {},
  ) {
    this.editorState = options.editorState ?? new EditorDraftState();
    this.accessState = options.accessState ?? new PlannerAccessState();
    this.importService = options.importService ?? new ImportReviewService();
    this.drillService = options.drillService ?? new EditorDrillService();
    this.authService = options.authService ?? new PlannerAuthService();
  }

  async mount(): Promise<void> {
    this.container.dataset.shell = 'editor';
    this.container.dataset.view = 'editor-imports';

    this.unsubscribeEditorState = this.editorState.subscribe(() => this.render());
    this.unsubscribeAccessState = this.accessState.subscribe(() => this.render());

    this.container.addEventListener('click', this.handleClick);
    this.container.addEventListener('input', this.handleFieldInput);
    this.container.addEventListener('change', this.handleChange);

    this.render();
    await this.loadAccess();

    if (this.accessState.getSnapshot().permissions?.canReviewImports) {
      await this.loadQueue();
    }
  }

  destroy(): void {
    this.unsubscribeEditorState?.();
    this.unsubscribeAccessState?.();
    this.unsubscribeEditorState = null;
    this.unsubscribeAccessState = null;
    this.container.removeEventListener('click', this.handleClick);
    this.container.removeEventListener('input', this.handleFieldInput);
    this.container.removeEventListener('change', this.handleChange);
  }

  private readonly handleFieldInput = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
      return;
    }

    const field = target.dataset.importField as keyof ImportReviewFormValues | undefined;
    if (!field) {
      return;
    }

    this.formValues = {
      ...this.formValues,
      [field]: target.value,
    };

    const selectedDraft = this.editorState.getSnapshot().selectedImportDraft;
    if (selectedDraft) {
      writeStoredFormValues(selectedDraft.id, this.formValues);
    }

    const currentErrors = this.editorState.getSnapshot().validationErrors;
    if (currentErrors[field]) {
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      this.editorState.setValidationErrors(nextErrors);
    }
  };

  private readonly handleChange = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    if (target.id === 'editorImportStatusFilter') {
      this.queueFilters.reviewStatus = target.value as ImportQueueFilters['reviewStatus'];
      void this.loadQueue();
      return;
    }

    if (target.id === 'editorImportSourceFilter') {
      this.queueFilters.sourceType = target.value as ImportQueueFilters['sourceType'];
      void this.loadQueue();
    }
  };

  private readonly handleClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const draftTarget = target.closest<HTMLElement>('[data-import-draft-id]');
    if (draftTarget?.dataset.importDraftId) {
      void this.loadDraft(draftTarget.dataset.importDraftId);
      return;
    }

    const actionTarget = target.closest<HTMLElement>('[data-import-action], [data-view-state-action]');
    if (!actionTarget) {
      return;
    }

    const action = actionTarget.dataset.importAction;
    const stateAction = actionTarget.dataset.viewStateAction;
    if (action === 'retry-access' || stateAction === 'retry-import-access') {
      void this.loadAccess();
      return;
    }

    if (action === 'retry-imports' || stateAction === 'retry-import-queue') {
      void this.loadQueue();
      return;
    }

    if (action === 'review') {
      void this.reviewDraft();
      return;
    }

    if (action === 'reject') {
      void this.rejectDraft();
      return;
    }

    if (action === 'convert') {
      void this.approveDraft({ publish: false });
      return;
    }

    if (action === 'publish') {
      void this.approveDraft({ publish: true });
    }
  };

  private async loadAccess(): Promise<void> {
    this.accessState.beginLoad();

    try {
      const { profile, permissions } = await this.authService.getCurrentPermissions();
      this.accessState.completeLoad(profile, permissions);
    } catch (error) {
      this.accessState.failLoad(error);
    }
  }

  private async loadQueue(preferredDraftId?: string): Promise<void> {
    this.editorState.beginImportLoad();

    try {
      const page = await this.importService.listDrafts(buildImportQuery(this.queueFilters));
      this.editorState.completeImportListLoad(page);

      const nextId = preferredDraftId
        || this.editorState.getSnapshot().selectedImportDraft?.id
        || page.items[0]?.id;

      if (nextId && page.items.some(item => item.id === nextId)) {
        await this.loadDraft(nextId, { listAlreadyLoaded: true });
      } else if (!page.items.length) {
        this.formValues = createEmptyFormValues();
        this.editorState.clearSelectedImportDraft();
      }
    } catch (error) {
      this.editorState.failImportLoad(error);
    }
  }

  private async loadDraft(draftId: string, options: { listAlreadyLoaded?: boolean } = {}): Promise<void> {
    if (!options.listAlreadyLoaded) {
      this.editorState.beginImportLoad();
    }

    try {
      const draft = await this.importService.getDraft(draftId);
      this.formValues = {
        ...buildFormValuesFromDraft(draft),
        ...(readStoredFormValues(draft.id) || {}),
      };
      this.editorState.completeImportDetailLoad(draft);
      this.editorState.clearValidationErrors();
    } catch (error) {
      this.editorState.failImportLoad(error);
    }
  }

  private async reviewDraft(): Promise<void> {
    const selectedDraft = this.editorState.getSnapshot().selectedImportDraft;
    if (!selectedDraft) {
      return;
    }

    this.pendingNotice = null;
    this.editorState.beginImportAction();

    try {
      const draft = await this.importService.reviewDraft(selectedDraft.id, buildReviewPayload(this.formValues.reviewNotes));
      this.editorState.completeImportAction(draft);
      this.pendingNotice = 'Importtiluonnos merkittiin tarkistetuksi.';
      showViewFeedback('Importti tarkistettu', 'Luonnos merkittiin tarkistetuksi testiversion jonossa.', 'success');
      await this.loadQueue(draft.id);
    } catch (error) {
      this.handleImportActionError(error);
    }
  }

  private async rejectDraft(): Promise<void> {
    const selectedDraft = this.editorState.getSnapshot().selectedImportDraft;
    if (!selectedDraft) {
      return;
    }

    this.pendingNotice = null;
    this.editorState.beginImportAction();

    try {
      const draft = await this.importService.rejectDraft(selectedDraft.id, buildReviewPayload(this.formValues.reviewNotes));
      this.editorState.completeImportAction(draft);
      this.pendingNotice = 'Importtiluonnos hylattiin.';
      showViewFeedback('Importti hylatty', 'Importtirivi merkittiin hylatyksi editorin tarkastusjonossa.', 'warning');
      await this.loadQueue(draft.id);
    } catch (error) {
      this.handleImportActionError(error);
    }
  }

  private async approveDraft(options: { publish: boolean }): Promise<void> {
    const permissions = this.accessState.getSnapshot().permissions;
    const selectedDraft = this.editorState.getSnapshot().selectedImportDraft;
    if (!permissions?.canApproveImports || !selectedDraft) {
      showViewFeedback('Toiminto estetty', 'Importin muunto tai julkaisu vaatii riittavat editorioikeudet.', 'warning');
      return;
    }

    const validation = validateEditorDrillForm(this.formValues, { forPublish: true });
    if (Object.keys(validation.errors).length > 0) {
      this.pendingNotice = validation.summary;
      this.editorState.setValidationErrors(validation.errors);
      return;
    }

    this.pendingNotice = null;
    this.editorState.clearValidationErrors();
    this.editorState.beginImportAction();

    try {
      const createdDrill = await this.importService.approveDraft(selectedDraft.id, {
        ...buildReviewPayload(this.formValues.reviewNotes),
        drill: buildApprovalInput(this.formValues),
      });

      if (options.publish) {
        await this.drillService.publishDrill(createdDrill.id);
        this.pendingNotice = 'Importti julkaistiin harjoitekatalogiin.';
        showViewFeedback('Importti julkaistu', 'Korjattu importti julkaistiin harjoitekatalogiin.', 'success');
      } else {
        this.pendingNotice = 'Importti muunnettiin harjoiteluonnokseksi.';
        showViewFeedback('Importti muunnettu', 'Korjattu importti tallennettiin harjoiteluonnokseksi.', 'success');
      }

      clearStoredFormValues(selectedDraft.id);
      await this.loadQueue(selectedDraft.id);
    } catch (error) {
      this.handleImportActionError(error);
    }
  }

  private handleImportActionError(error: unknown): void {
    if (isPlannerApiError(error) && error.details.length > 0) {
      const errors = error.details.reduce<Record<string, string>>((result, detail) => {
        if (detail.field && !result[detail.field]) {
          result[detail.field] = detail.message;
        }

        return result;
      }, {});
      this.editorState.setValidationErrors(errors);
    }

    this.editorState.failImportAction(error);
  }

  private render(): void {
    const focusSnapshot = getFocusSnapshot(this.container);
    const accessSnapshot = this.accessState.getSnapshot();
    const editorSnapshot = this.editorState.getSnapshot();
    const view = selectViewShell(parseHashRoute('#/editor/imports'));
    const canReview = Boolean(accessSnapshot.permissions?.canReviewImports);
    const canApprove = Boolean(accessSnapshot.permissions?.canApproveImports);
    const canPublish = Boolean(accessSnapshot.permissions?.canPublishDrills && canApprove);
    const selectedDraft = editorSnapshot.selectedImportDraft;
    const bannerCopy = this.pendingNotice || editorSnapshot.importActionState.error?.message || editorSnapshot.importLoadState.error?.message;
    const bannerTone = editorSnapshot.importActionState.error || editorSnapshot.importLoadState.error
      ? 'warning'
      : this.pendingNotice?.includes('julkaistiin') || this.pendingNotice?.includes('muunnettiin') || this.pendingNotice?.includes('merkittiin')
        ? 'success'
        : 'neutral';

    if (accessSnapshot.loadState.status === 'loading' && !accessSnapshot.permissions) {
      this.container.innerHTML = renderViewStateSection({
        shell: view.shell,
        eyebrow: view.eyebrow,
        title: view.title,
        description: 'Importtijono avataan vasta kun tarkastus- ja julkaisuoikeudet on vahvistettu.',
        state: {
          kind: 'loading',
          title: 'Tarkistetaan importtien editorioikeuksia',
          message: 'Valmistellaan tarkastusjono, review-toiminnot ja julkaisuvaltuudet testiversiota varten.',
        },
      });
      return;
    }

    if (accessSnapshot.loadState.status === 'error' && !accessSnapshot.permissions) {
      const isAuthError = accessSnapshot.loadState.error?.code === 'UNAUTHORIZED';
      this.container.innerHTML = renderViewStateSection({
        shell: view.shell,
        eyebrow: view.eyebrow,
        title: view.title,
        description: 'Importtien tarkastus pysyy suljettuna kunnes editorirooli on vahvistettu tai yhteys palautuu.',
        state: {
          kind: 'error',
          title: isAuthError ? 'Kirjautuminen puuttuu' : 'Editoriin ei paasty',
          message: isAuthError
            ? 'Kirjaudu planner/editor-kayttajana ennen importtien tarkastusta.'
            : accessSnapshot.loadState.error?.message || 'Yrita hetken paasta uudelleen.',
          actions: [{ action: 'retry-import-access', label: 'Yrita uudelleen' }],
        },
      });
      return;
    }

    if (!canReview) {
      this.container.innerHTML = renderViewStateSection({
        shell: view.shell,
        eyebrow: view.eyebrow,
        title: view.title,
        description: 'Importtijono, confidence-arviot ja kasikorjauspolku naytetaan vain editori- tai admin-roolille.',
        state: {
          kind: 'permission',
          title: 'Ei oikeutta tarkistaa importteja',
          message: 'Importtijono on piilotettu ilman editori-roolia.',
          actions: [{ href: '#/drills', label: 'Palaa harjoitteisiin' }],
        },
      });
      return;
    }

    if (editorSnapshot.importLoadState.status === 'loading' && !editorSnapshot.importPage) {
      this.container.innerHTML = renderViewStateSection({
        shell: view.shell,
        eyebrow: view.eyebrow,
        title: view.title,
        description: 'Importtirivit, confidence-merkinnat ja viimeisin valinta ladataan tarkastusta varten.',
        state: {
          kind: 'loading',
          title: 'Ladataan importtijonoa',
          message: 'Valmistellaan tarkastettavat rivit ja editorin korjauslomake samaan nakymaan.',
        },
      });
      return;
    }

    if (editorSnapshot.importLoadState.status === 'error' && !editorSnapshot.importPage) {
      this.container.innerHTML = renderViewStateSection({
        shell: view.shell,
        eyebrow: view.eyebrow,
        title: view.title,
        description: 'Jonoa ei saatu avattua, mutta retry-polku pidetaan heti kaytettavana ilman rikkinnaista tyhjaa paneelia.',
        state: {
          kind: 'error',
          title: 'Importtijonon lataus epaonnistui',
          message: editorSnapshot.importLoadState.error?.message || 'Yrita hetken paasta uudelleen.',
          actions: [{ action: 'retry-import-queue', label: 'Yrita uudelleen' }],
        },
      });
      return;
    }

    const items = editorSnapshot.importPage?.items || [];
    const currentTitle = selectedDraft?.extractedTitle || selectedDraft?.sourceFileName || view.title;
    const readinessChecklist = buildImportReadinessChecklist(this.formValues);
    const readinessCompleted = readinessChecklist.filter(item => item.done).length;
    const readinessLabel = readinessCompleted === readinessChecklist.length ? 'Valmis julkaisuun' : 'Manuaalinen tarkistus kesken';
    const suggestionFields = selectedDraft?.extractedFields ? JSON.stringify(selectedDraft.extractedFields, null, 2) : '{}';

    this.container.innerHTML = `
      <section class="view-shell view-shell-${view.shell} planner-draft-view editor-import-view" aria-labelledby="editorImportTitle">
        <div class="planner-draft-header">
          <div>
            <p class="view-shell-eyebrow">${view.eyebrow}</p>
            <h2 id="editorImportTitle" class="view-shell-title">${escapeHtml(currentTitle)}</h2>
            <p class="view-shell-description">Tarkista koneellisesti poimitut kentat, korjaa puutteet kasin ja julkaise vasta kun harjoite on oikeasti valmis katalogiin.</p>
          </div>
          <div class="planner-draft-actions">
            <a class="view-shell-link" href="#/drills">Palaa harjoitteisiin</a>
            ${selectedDraft?.convertedDrillId ? `<a class="view-shell-link" href="#/editor/drills/${encodeURIComponent(selectedDraft.convertedDrillId)}/edit">Avaa harjoiteluonnos</a>` : ''}
          </div>
        </div>

        ${renderShellSupportPanels(parseHashRoute('#/editor/imports'))}

        <section class="editor-review-split-banner" aria-label="Import review rajaus">
          <div class="editor-review-split-card">
            <span class="editor-review-split-label">Editorin testiversio</span>
            <strong>Jarjestelman ehdotus + ihmisen korjaus</strong>
            <p>Importti ei mene suoraan valmentajille, vaan vaatii editorin tarkistuksen ja korjatun kanonisen drill-rivin.</p>
          </div>
          <div class="editor-review-split-card">
            <span class="editor-review-split-label">Coach-facing vasta julkaisussa</span>
            <strong>Luonnos pysyy editoripuolella</strong>
            <p>Jonot, confidence-merkinnat ja raakadata ovat vain editorikaytossa. Valmentajat nakisivat vain julkaistun lopputuloksen.</p>
          </div>
        </section>

        <section class="planner-draft-save-strip">
          <div>
            <p class="planner-draft-save-label">Jono</p>
            <strong>${items.length}</strong>
            <p class="planner-draft-save-copy">Suodattimien jalkeen naytettavat importit.</p>
          </div>
          <div>
            <p class="planner-draft-save-label">Rooli</p>
            <strong>${escapeHtml(accessSnapshot.permissions?.role || '-')}</strong>
            <p class="planner-draft-save-copy">${escapeHtml(accessSnapshot.profile?.displayName || accessSnapshot.profile?.email || '')}</p>
          </div>
          <div>
            <p class="planner-draft-save-label">Julkaisu</p>
            <strong>${canPublish ? 'Mahdollinen' : 'Estetty'}</strong>
            <p class="planner-draft-save-copy">${escapeHtml(
              canPublish
                ? 'Admin voi julkaista importista suoraan katalogiin.'
                : canApprove
                  ? 'Voit muuntaa luonnokseksi, mutta julkaisu vaatii admin-oikeuden.'
                  : 'Vain admin voi muuntaa ja julkaista importin.',
            )}</p>
          </div>
          <div>
            <p class="planner-draft-save-label">Valmius</p>
            <strong>${escapeHtml(readinessLabel)}</strong>
            <p class="planner-draft-save-copy">${escapeHtml(`Checklist ${readinessCompleted}/${readinessChecklist.length}.`)}</p>
          </div>
        </section>

        ${
          bannerCopy
            ? `<div class="planner-inline-banner planner-inline-banner-${bannerTone}" role="status"><p>${escapeHtml(bannerCopy)}</p></div>`
            : ''
        }

        <div class="planner-draft-builder editor-import-builder">
          <section class="planner-draft-panel editor-import-queue-panel">
            <div class="planner-draft-section-heading">
              <div>
                <p class="planner-draft-section-kicker">Import-jono</p>
                <h3>Tarkastusjonon kohteet</h3>
              </div>
            </div>

            <div class="planner-draft-form-grid editor-import-filter-grid">
              <label class="planner-draft-field">
                <span>Tila</span>
                <select id="editorImportStatusFilter">
                  <option value="">Kaikki tilat</option>
                  <option value="pending"${this.queueFilters.reviewStatus === 'pending' ? ' selected' : ''}>Odottaa</option>
                  <option value="reviewed"${this.queueFilters.reviewStatus === 'reviewed' ? ' selected' : ''}>Tarkistettu</option>
                  <option value="rejected"${this.queueFilters.reviewStatus === 'rejected' ? ' selected' : ''}>Hylatty</option>
                  <option value="converted"${this.queueFilters.reviewStatus === 'converted' ? ' selected' : ''}>Muunnettu</option>
                </select>
              </label>
              <label class="planner-draft-field">
                <span>Lahde</span>
                <select id="editorImportSourceFilter">
                  <option value="">Kaikki lahteet</option>
                  <option value="pdf"${this.queueFilters.sourceType === 'pdf' ? ' selected' : ''}>PDF</option>
                  <option value="drive-file"${this.queueFilters.sourceType === 'drive-file' ? ' selected' : ''}>Drive-tiedosto</option>
                </select>
              </label>
            </div>

            <div class="editor-import-queue-list">
              ${
                items.length
                  ? items
                      .map(item => `
                        <button
                          type="button"
                          class="editor-import-queue-item${selectedDraft?.id === item.id ? ' is-active' : ''}"
                          data-import-draft-id="${escapeHtml(item.id)}"
                        >
                          <div class="editor-import-queue-item-topline">
                            <strong>${escapeHtml(item.extractedTitle || item.sourceFileName || item.id)}</strong>
                            ${renderStatusBadge(item.reviewStatus)}
                          </div>
                          <p>${escapeHtml(item.sourceFileName || 'Nimeton lahdetiedosto')}</p>
                          <div class="editor-import-queue-item-meta">
                            ${renderConfidenceBadge(item.confidence)}
                            <span>Paivitetty ${escapeHtml(formatTimestamp(item.updatedAt))}</span>
                          </div>
                        </button>
                      `)
                      .join('')
                  : `
                    ${renderViewState({
                      kind: 'empty',
                      title: 'Importteja ei loytynyt',
                      message: 'Nykyisilla suodattimilla ei ole tarkastettavia riveja.',
                      compact: true,
                    })}
                  `
              }
            </div>
          </section>

          <div class="editor-import-main">
            ${
              selectedDraft
                ? `
                  <section class="planner-draft-panel editor-review-sidebar">
                    <div class="planner-draft-section-heading">
                      <div>
                        <p class="planner-draft-section-kicker">Review-malli</p>
                        <h3>Ehdotus vs. korjattu julkaisuversio</h3>
                      </div>
                    </div>
                    <div class="editor-review-status-stack">
                      <div class="editor-review-status-card">
                        <span class="editor-review-status-label">Confidence</span>
                        <strong>${escapeHtml(selectedDraft.confidence === 'high' ? 'Korkea' : selectedDraft.confidence === 'medium' ? 'Keskitasoinen' : 'Matala')}</strong>
                        <p>${escapeHtml(
                          selectedDraft.confidence === 'high'
                            ? 'Jarjestelman ehdotus on lahella valmista, mutta vaatii silti ihmisen tarkistuksen.'
                            : selectedDraft.confidence === 'medium'
                              ? 'Perusrakenne on mukana, mutta kentat vaativat tavallisesti kasikorjauksen.'
                              : 'Raakapoiminta on heikko ja manuaalinen korjaus on kaytannossa pakollinen.',
                        )}</p>
                      </div>
                      <div class="editor-review-status-card">
                        <span class="editor-review-status-label">Kasikorjaus</span>
                        <strong>${readinessCompleted} / ${readinessChecklist.length} valmiina</strong>
                        <p>Tama paneeli tekee testiversiossa selvaksi, mita editori taydentaa ennen muunnosta tai julkaisua.</p>
                      </div>
                    </div>
                    ${renderReadinessChecklist(readinessChecklist)}
                  </section>

                  <section class="planner-draft-panel">
                    <div class="planner-draft-section-heading">
                      <div>
                        <p class="planner-draft-section-kicker">Tarkastus</p>
                        <h3>Luottamus, tila ja julkaisuvalmius</h3>
                      </div>
                      <div class="editor-import-badge-row">
                        ${renderConfidenceBadge(selectedDraft.confidence)}
                        ${renderStatusBadge(selectedDraft.reviewStatus)}
                      </div>
                    </div>
                    <div class="editor-import-summary-grid">
                      <div>
                        <span>Lahde</span>
                        <strong>${escapeHtml(selectedDraft.sourceType === 'pdf' ? 'PDF' : 'Drive-tiedosto')}</strong>
                      </div>
                      <div>
                        <span>Tiedosto</span>
                        <strong>${escapeHtml(selectedDraft.sourceFileName || '-')}</strong>
                      </div>
                      <div>
                        <span>Viimeisin tarkastaja</span>
                        <strong>${escapeHtml(selectedDraft.reviewedByUserId || '-')}</strong>
                      </div>
                      <div>
                        <span>Paivitetty</span>
                        <strong>${escapeHtml(formatTimestamp(selectedDraft.updatedAt))}</strong>
                      </div>
                    </div>
                    <div class="editor-import-model-grid">
                      <article class="editor-import-model-card">
                        <span class="editor-import-model-label">Jarjestelman ehdotus</span>
                        <strong>Poimitut kentat ennen korjausta</strong>
                        <pre>${escapeHtml(suggestionFields)}</pre>
                      </article>
                      <article class="editor-import-model-card">
                        <span class="editor-import-model-label">Ihmisen korjaus</span>
                        <strong>Alla oleva lomake muodostaa julkaistavan drill-rivin</strong>
                        <p>Korjaa kentat, lisaa puuttuvat tiedot ja tarkenna muistiinpanot ennen muunnosta tai julkaisua.</p>
                      </article>
                    </div>
                  </section>

                  <section class="planner-draft-panel">
                    <div class="planner-draft-section-heading">
                      <div>
                        <p class="planner-draft-section-kicker">Kasikorjaus</p>
                        <h3>Korjaa ennen muunnosta</h3>
                      </div>
                      <div class="planner-inline-actions">
                        <button type="button" class="planner-draft-save-button planner-draft-save-button-secondary" data-import-action="review" ${
                          editorSnapshot.importActionState.status === 'saving' ? 'disabled' : ''
                        }>Merkitse tarkistetuksi</button>
                        <button type="button" class="planner-draft-save-button planner-draft-save-button-secondary" data-import-action="reject" ${
                          editorSnapshot.importActionState.status === 'saving' ? 'disabled' : ''
                        }>Hylkaa</button>
                        <button type="button" class="planner-draft-save-button planner-draft-save-button-secondary" data-import-action="convert" ${
                          !canApprove || selectedDraft.reviewStatus === 'converted' || editorSnapshot.importActionState.status === 'saving' ? 'disabled' : ''
                        }>Muunna luonnokseksi</button>
                        <button type="button" class="planner-draft-save-button" data-import-action="publish" ${
                          !canPublish || selectedDraft.reviewStatus === 'converted' || editorSnapshot.importActionState.status === 'saving' ? 'disabled' : ''
                        }>Julkaise katalogiin</button>
                      </div>
                    </div>
                    <div class="planner-draft-form-grid">
                      ${renderField('input', 'title', 'Nimi', this.formValues.title, editorSnapshot.validationErrors.title, {
                        width: 'wide',
                        placeholder: 'Esim. Syottokolmio paineessa',
                      })}
                      ${renderField('input', 'slug', 'Slug', this.formValues.slug, editorSnapshot.validationErrors.slug, {
                        placeholder: 'valinnainen-url-tunniste',
                      })}
                      ${renderField('input', 'summary', 'Yhteenveto', this.formValues.summary, editorSnapshot.validationErrors.summary, {
                        width: 'wide',
                        placeholder: 'Lyhyt kuvaus harjoitteen tavoitteesta',
                      })}
                      ${renderField('input', 'category', 'Kategoria', this.formValues.category, editorSnapshot.validationErrors.category, {
                        placeholder: 'Esim. Syotot',
                      })}
                      ${renderField('select', 'intensityLevel', 'Teho', this.formValues.intensityLevel, editorSnapshot.validationErrors.intensityLevel, {
                        selectOptions: [
                          { value: '', label: 'Ei valittu' },
                          { value: 'low', label: 'Matala' },
                          { value: 'medium', label: 'Keskitaso' },
                          { value: 'high', label: 'Korkea' },
                        ],
                      })}
                      ${renderField('input', 'primaryImageUrl', 'Paa kuva', this.formValues.primaryImageUrl, editorSnapshot.validationErrors.primaryImageUrl, {
                        width: 'wide',
                        placeholder: 'https://...',
                      })}
                      ${renderField('textarea', 'description', 'Kuvaus', this.formValues.description, editorSnapshot.validationErrors.description, {
                        width: 'wide',
                        rows: 6,
                        placeholder: 'Kuvaa harjoitteen kulku vaihe vaiheelta.',
                      })}
                      ${renderField('input', 'durationMin', 'Kesto (min)', this.formValues.durationMin, editorSnapshot.validationErrors.durationMin, {
                        inputType: 'number',
                        placeholder: '12',
                      })}
                      ${renderField('input', 'playerCountMin', 'Pelaajia min', this.formValues.playerCountMin, editorSnapshot.validationErrors.playerCountMin, {
                        inputType: 'number',
                        placeholder: '4',
                      })}
                      ${renderField('input', 'playerCountMax', 'Pelaajia max', this.formValues.playerCountMax, editorSnapshot.validationErrors.playerCountMax, {
                        inputType: 'number',
                        placeholder: '8',
                      })}
                      ${renderField('textarea', 'ageGroups', 'Ikaryhmat', this.formValues.ageGroups, editorSnapshot.validationErrors.ageGroups, {
                        rows: 4,
                        placeholder: 'U12\\nU14',
                      })}
                      ${renderField('textarea', 'skillTags', 'Taitotagit', this.formValues.skillTags, editorSnapshot.validationErrors.skillTags, {
                        rows: 4,
                        placeholder: 'syotto\\nskannaus',
                      })}
                      ${renderField('textarea', 'equipment', 'Valineet', this.formValues.equipment, editorSnapshot.validationErrors.equipment, {
                        rows: 4,
                        placeholder: 'Pallot\\nKartiot',
                      })}
                      ${renderField('textarea', 'setupInstructions', 'Alkuasettelu', this.formValues.setupInstructions, editorSnapshot.validationErrors.setupInstructions, {
                        width: 'wide',
                        rows: 4,
                        placeholder: 'Miten alue ja pelaajat asetellaan.',
                      })}
                      ${renderField('textarea', 'coachingPoints', 'Valmennuspisteet', this.formValues.coachingPoints, editorSnapshot.validationErrors.coachingPoints, {
                        width: 'wide',
                        rows: 4,
                        placeholder: 'Katse ennen syottoa\\nAvaa lapaa vastaanotossa',
                      })}
                      ${renderField('textarea', 'progressionIdeas', 'Progressiot', this.formValues.progressionIdeas, editorSnapshot.validationErrors.progressionIdeas, {
                        width: 'wide',
                        rows: 4,
                        placeholder: 'Lisaa puolustaja',
                      })}
                      ${renderField('textarea', 'variationIdeas', 'Variaatiot', this.formValues.variationIdeas, editorSnapshot.validationErrors.variationIdeas, {
                        width: 'wide',
                        rows: 4,
                        placeholder: 'Kaksi palloa',
                      })}
                      ${renderField('textarea', 'reviewNotes', 'Tarkastusmuistiinpanot', this.formValues.reviewNotes, editorSnapshot.validationErrors.reviewNotes, {
                        width: 'wide',
                        rows: 4,
                        placeholder: 'Kirjaa puuttuvat tiedot tai syy hylkayselle.',
                        hint: 'Tallennetaan review/reject/approve-toimintojen mukana.',
                      })}
                    </div>
                  </section>

                  <section class="planner-draft-panel">
                    <div class="planner-draft-section-heading">
                      <div>
                        <p class="planner-draft-section-kicker">Lahdedata</p>
                        <h3>Raakapoiminta vertailuun</h3>
                      </div>
                    </div>
                    <div class="editor-import-source-block">
                      <h4>Poimittu teksti</h4>
                      <pre>${escapeHtml(selectedDraft.extractedText || 'Ei raakatekstia saatavilla.')}</pre>
                    </div>
                    <div class="editor-import-source-block">
                      <h4>Poimitut kentat</h4>
                      <pre>${escapeHtml(suggestionFields)}</pre>
                    </div>
                  </section>
                `
                : `
                  <section class="planner-draft-panel">
                    ${renderViewState({
                      kind: 'empty',
                      title: 'Valitse importti jonosta',
                      message: 'Avaa yksi rivi vasemmalta, niin voit tarkistaa kentat ja julkaista valmiin harjoitteen.',
                    })}
                  </section>
                `
            }
          </div>
        </div>
      </section>
    `;

    restoreFocus(this.container, focusSnapshot);
  }
}
