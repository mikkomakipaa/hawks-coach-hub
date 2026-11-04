import { escapeHtml } from '@/components/drill-presenters';
import { renderViewStateSection, showViewFeedback } from '@/components/view-state';
import { EditorDrillService } from '@/services/drill-catalog-service';
import { isPlannerApiError } from '@/services/planner-api-client';
import { PlannerAuthService } from '@/services/planner-auth-service';
import { PlannerAccessState } from '@/state/planner-access-state';
import { EditorDraftState } from '@/state/editor-draft-state';
import type { CreateDrillInput, DrillDetail, DrillIntensityLevel, UpdateDrillInput } from '@/types/drills';
import { parseHashRoute } from '@/ui/routes';
import { renderShellSupportPanels, selectViewShell } from '@/ui/view-shells';

type EditorDrillMode = 'new' | 'edit';

interface FocusSnapshot {
  selector: string;
  selectionStart?: number | null;
  selectionEnd?: number | null;
}

export interface EditorDrillFormValues {
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
}

export interface EditorDrillValidationResult {
  errors: Record<string, string>;
  summary: string | null;
}

interface ReadinessChecklistItem {
  label: string;
  done: boolean;
}

function createEmptyFormValues(): EditorDrillFormValues {
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

function toFieldErrorMap(detailErrors: Array<{ field?: string; message: string }> = []): Record<string, string> {
  return detailErrors.reduce<Record<string, string>>((errors, detail) => {
    if (detail.field && !errors[detail.field]) {
      errors[detail.field] = detail.message;
    }
    return errors;
  }, {});
}

function drillDetailToFormValues(detail: DrillDetail): EditorDrillFormValues {
  return {
    title: detail.title || '',
    slug: detail.slug || '',
    summary: detail.summary || '',
    description: detail.description || '',
    category: detail.category || '',
    intensityLevel: detail.intensityLevel || '',
    ageGroups: listToFieldValue(detail.ageGroups),
    skillTags: listToFieldValue(detail.skillTags),
    durationMin: detail.durationMin === undefined ? '' : String(detail.durationMin),
    playerCountMin: detail.playerCountMin === undefined ? '' : String(detail.playerCountMin),
    playerCountMax: detail.playerCountMax === undefined ? '' : String(detail.playerCountMax),
    equipment: listToFieldValue(detail.equipment),
    coachingPoints: listToFieldValue(detail.coachingPoints),
    setupInstructions: detail.setupInstructions || '',
    progressionIdeas: listToFieldValue(detail.progressionIdeas),
    variationIdeas: listToFieldValue(detail.variationIdeas),
    primaryImageUrl: detail.primaryImageUrl || '',
  };
}

function buildDrillReadinessChecklist(values: EditorDrillFormValues): ReadinessChecklistItem[] {
  return [
    { label: 'Otsikko ja yhteenveto', done: Boolean(values.title.trim() && values.summary.trim()) },
    { label: 'Kategoria ja ikaryhma', done: Boolean(values.category.trim() && values.ageGroups.trim()) },
    {
      label: 'Kesto ja pelaajamaara',
      done: Boolean(values.durationMin.trim() && values.playerCountMin.trim() && values.playerCountMax.trim()),
    },
    { label: 'Kuvaus ja valmennuspisteet', done: Boolean(values.description.trim() && values.coachingPoints.trim()) },
    { label: 'Liite- tai kuvaviite', done: Boolean(values.primaryImageUrl.trim()) },
  ];
}

function renderReadinessChecklist(items: ReadinessChecklistItem[]): string {
  return `
    <div class="editor-review-checklist" aria-label="Julkaisuvalmiuden tarkistuslista">
      ${items
        .map(
          item => `
            <div class="editor-review-checklist-item${item.done ? ' is-complete' : ''}">
              <span>${item.done ? 'Valmis' : 'Puuttuu'}</span>
              <strong>${escapeHtml(item.label)}</strong>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

export function validateEditorDrillForm(
  values: EditorDrillFormValues,
  options: { forPublish?: boolean } = {},
): EditorDrillValidationResult {
  const errors: Record<string, string> = {};
  const isPublish = options.forPublish === true;

  const requiredFields: Array<keyof Pick<
    EditorDrillFormValues,
    'title' | 'summary' | 'description' | 'category'
  >> = ['title', 'summary', 'description', 'category'];

  for (const fieldName of requiredFields) {
    if (!values[fieldName].trim()) {
      errors[fieldName] = 'Tama kentta on pakollinen.';
    }
  }

  const durationMin = parseOptionalNonNegativeInteger(values.durationMin);
  const playerCountMin = parseOptionalNonNegativeInteger(values.playerCountMin);
  const playerCountMax = parseOptionalNonNegativeInteger(values.playerCountMax);

  if (Number.isNaN(durationMin)) {
    errors.durationMin = 'Kayta kokonaislukua 0 tai suurempi.';
  }

  if (Number.isNaN(playerCountMin)) {
    errors.playerCountMin = 'Kayta kokonaislukua 0 tai suurempi.';
  }

  if (Number.isNaN(playerCountMax)) {
    errors.playerCountMax = 'Kayta kokonaislukua 0 tai suurempi.';
  }

  if (
    playerCountMin !== undefined &&
    playerCountMax !== undefined &&
    !Number.isNaN(playerCountMin) &&
    !Number.isNaN(playerCountMax) &&
    playerCountMin > playerCountMax
  ) {
    errors.playerCountMax = 'Enimmaispelaajamaara ei voi olla pienempi kuin minimimaara.';
  }

  const summary = Object.keys(errors).length
    ? isPublish
      ? 'Korjaa pakolliset kentat ennen julkaisua.'
      : 'Korjaa virheelliset kentat ennen tallennusta.'
    : null;

  return {
    errors,
    summary,
  };
}

export function buildCreateDrillInput(values: EditorDrillFormValues): CreateDrillInput {
  const payload = buildUpdateDrillInput(values);
  return {
    ...payload,
    title: payload.title || '',
    summary: payload.summary || '',
    description: payload.description || '',
    category: payload.category || '',
    sourceType: 'native',
  };
}

export function buildUpdateDrillInput(values: EditorDrillFormValues): UpdateDrillInput {
  const durationMin = parseOptionalNonNegativeInteger(values.durationMin);
  const playerCountMin = parseOptionalNonNegativeInteger(values.playerCountMin);
  const playerCountMax = parseOptionalNonNegativeInteger(values.playerCountMax);
  const payload: UpdateDrillInput = {
    ageGroups: fieldValueToList(values.ageGroups),
    skillTags: fieldValueToList(values.skillTags),
    equipment: fieldValueToList(values.equipment),
    coachingPoints: fieldValueToList(values.coachingPoints),
    progressionIdeas: fieldValueToList(values.progressionIdeas),
    variationIdeas: fieldValueToList(values.variationIdeas),
    sourceType: 'native',
  };
  const title = values.title.trim();
  const slug = values.slug.trim();
  const summary = values.summary.trim();
  const description = values.description.trim();
  const category = values.category.trim();
  const setupInstructions = values.setupInstructions.trim();
  const primaryImageUrl = values.primaryImageUrl.trim();

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

function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    title: 'Nimi',
    slug: 'Slug',
    summary: 'Yhteenveto',
    description: 'Kuvaus',
    category: 'Kategoria',
    intensityLevel: 'Teho',
    ageGroups: 'Ikaryhmat',
    skillTags: 'Taitotagit',
    durationMin: 'Kesto',
    playerCountMin: 'Pelaajamaara min',
    playerCountMax: 'Pelaajamaara max',
    equipment: 'Valineet',
    coachingPoints: 'Valmennuspisteet',
    setupInstructions: 'Alkuasettelu',
    progressionIdeas: 'Progressiot',
    variationIdeas: 'Variaatiot',
    primaryImageUrl: 'Kuva',
  };

  return labels[fieldName] || fieldName;
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

  const field = activeElement.dataset.editorField;
  if (!field) {
    return null;
  }

  return {
    selector: `[data-editor-field="${field}"]`,
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
  name: keyof EditorDrillFormValues,
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
  const describedBy = error ? `editorDrillError-${name}` : '';
  const invalid = error ? 'true' : 'false';
  const fieldClass = options.width === 'wide' ? 'planner-draft-field planner-draft-field-wide' : 'planner-draft-field';

  let control = '';
  if (type === 'textarea') {
    control = `<textarea data-editor-field="${name}" rows="${options.rows || 4}" aria-invalid="${invalid}" ${
      describedBy ? `aria-describedby="${describedBy}"` : ''
    } placeholder="${escapeHtml(options.placeholder || '')}">${escapeHtml(value)}</textarea>`;
  } else if (type === 'select') {
    control = `
      <select data-editor-field="${name}" aria-invalid="${invalid}" ${describedBy ? `aria-describedby="${describedBy}"` : ''}>
        ${(options.selectOptions || [])
          .map(option => `<option value="${escapeHtml(option.value)}"${option.value === value ? ' selected' : ''}>${escapeHtml(option.label)}</option>`)
          .join('')}
      </select>
    `;
  } else {
    control = `<input data-editor-field="${name}" type="${options.inputType || 'text'}" value="${escapeHtml(value)}" aria-invalid="${invalid}" ${
      describedBy ? `aria-describedby="${describedBy}"` : ''
    } placeholder="${escapeHtml(options.placeholder || '')}" />`;
  }

  return `
    <label class="${fieldClass}">
      <span>${label}</span>
      ${control}
      ${options.hint ? `<small class="editor-drill-field-hint">${escapeHtml(options.hint)}</small>` : ''}
      ${error ? `<small class="editor-drill-field-error" id="editorDrillError-${name}">${escapeHtml(error)}</small>` : ''}
    </label>
  `;
}

export class EditorDrillView {
  private readonly editorState: EditorDraftState;
  private readonly accessState: PlannerAccessState;
  private readonly drillService: EditorDrillService;
  private readonly authService: PlannerAuthService;
  private readonly drillId: string | undefined;
  private readonly mode: EditorDrillMode;

  private formValues: EditorDrillFormValues = createEmptyFormValues();
  private unsubscribeEditorState: (() => void) | null = null;
  private unsubscribeAccessState: (() => void) | null = null;
  private activeLoadId = 0;
  private pendingNotice: string | null = null;

  constructor(
    private readonly container: HTMLElement,
    options: {
      mode: EditorDrillMode;
      drillId?: string;
      editorState?: EditorDraftState;
      accessState?: PlannerAccessState;
      drillService?: EditorDrillService;
      authService?: PlannerAuthService;
    },
  ) {
    this.mode = options.mode;
    this.drillId = options.drillId;
    this.editorState = options.editorState ?? new EditorDraftState();
    this.accessState = options.accessState ?? new PlannerAccessState();
    this.drillService = options.drillService ?? new EditorDrillService();
    this.authService = options.authService ?? new PlannerAuthService();
  }

  async mount(): Promise<void> {
    this.container.dataset.shell = 'editor';
    this.container.dataset.view = 'editor-drill';

    this.unsubscribeEditorState = this.editorState.subscribe(() => this.render());
    this.unsubscribeAccessState = this.accessState.subscribe(() => this.render());

    this.container.addEventListener('click', this.handleClick);
    this.container.addEventListener('input', this.handleFieldInput);
    this.container.addEventListener('change', this.handleFieldInput);

    this.render();
    await this.loadAccess();

    const permissions = this.accessState.getSnapshot().permissions;
    if (this.mode === 'edit' && this.drillId && permissions?.canEditDrills) {
      await this.loadDrill(this.drillId);
    }
  }

  destroy(): void {
    this.unsubscribeEditorState?.();
    this.unsubscribeAccessState?.();
    this.unsubscribeEditorState = null;
    this.unsubscribeAccessState = null;
    this.container.removeEventListener('click', this.handleClick);
    this.container.removeEventListener('input', this.handleFieldInput);
    this.container.removeEventListener('change', this.handleFieldInput);
  }

  private readonly handleFieldInput = (event: Event): void => {
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)
    ) {
      return;
    }

    const field = target.dataset.editorField as keyof EditorDrillFormValues | undefined;
    if (!field) {
      return;
    }

    this.formValues = {
      ...this.formValues,
      [field]: target.value,
    };

    const currentErrors = this.editorState.getSnapshot().validationErrors;
    if (currentErrors[field]) {
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      this.editorState.setValidationErrors(nextErrors);
    }
  };

  private readonly handleClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const actionTarget = target.closest<HTMLElement>('[data-editor-action], [data-view-state-action]');
    if (!actionTarget) {
      return;
    }

    const action = actionTarget.dataset.editorAction;
    if (action === 'retry-access' || actionTarget.dataset.viewStateAction === 'retry-editor-access') {
      void this.loadAccess();
      return;
    }

    if ((action === 'retry-drill' || actionTarget.dataset.viewStateAction === 'retry-editor-drill') && this.drillId) {
      void this.loadDrill(this.drillId);
      return;
    }

    if (action === 'save') {
      void this.saveDraft();
      return;
    }

    if (action === 'publish') {
      void this.publishDrill();
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

  private async loadDrill(drillId: string): Promise<void> {
    const requestId = ++this.activeLoadId;
    this.editorState.beginDrillLoad();

    try {
      const detail = await this.drillService.getDraft(drillId);
      if (requestId !== this.activeLoadId) {
        return;
      }

      this.formValues = drillDetailToFormValues(detail);
      this.pendingNotice = null;
      this.editorState.completeDrillLoad(detail);
      this.editorState.clearValidationErrors();
    } catch (error) {
      if (requestId !== this.activeLoadId) {
        return;
      }

      this.editorState.failDrillLoad(error);
    }
  }

  private async saveDraft(): Promise<void> {
    if (!this.accessState.getSnapshot().permissions?.canEditDrills) {
      showViewFeedback('Muokkaus estetty', 'Harjoitteiden muokkaus vaatii editori- tai admin-roolin.', 'warning');
      return;
    }

    const validation = validateEditorDrillForm(this.formValues);
    if (Object.keys(validation.errors).length > 0) {
      this.pendingNotice = validation.summary;
      this.editorState.setValidationErrors(validation.errors);
      return;
    }

    this.pendingNotice = null;
    this.editorState.clearValidationErrors();
    this.editorState.beginSave();

    try {
      const detail = this.editorState.getSnapshot().currentDrill
        ? await this.drillService.updateDraft(
            this.editorState.getSnapshot().currentDrill!.id,
            buildUpdateDrillInput(this.formValues),
          )
        : await this.drillService.createDraft(buildCreateDrillInput(this.formValues));

      this.formValues = drillDetailToFormValues(detail);
      this.editorState.completeSave(detail);
      this.pendingNotice = 'Luonnos tallennettiin.';
      showViewFeedback('Luonnos tallennettu', `${detail.title} tallennettiin editorin testiversioon.`, 'success');

      if (this.mode === 'new') {
        window.location.hash = `#/editor/drills/${encodeURIComponent(detail.id)}/edit`;
      }
    } catch (error) {
      if (isPlannerApiError(error) && error.details.length > 0) {
        this.editorState.setValidationErrors(toFieldErrorMap(error.details));
      }

      this.editorState.failSave(error);
    }
  }

  private async publishDrill(): Promise<void> {
    const permissions = this.accessState.getSnapshot().permissions;
    if (!permissions?.canPublishDrills) {
      this.pendingNotice = 'Julkaisu vaatii admin-oikeuden.';
      showViewFeedback('Julkaisu estetty', 'Julkaisu vaatii admin-oikeuden myos testiversiossa.', 'warning');
      this.render();
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
    this.editorState.beginPublish();

    try {
      let detail = this.editorState.getSnapshot().currentDrill;
      if (!detail) {
        detail = await this.drillService.createDraft(buildCreateDrillInput(this.formValues));
        this.editorState.completeSave(detail);
      } else {
        detail = await this.drillService.updateDraft(detail.id, buildUpdateDrillInput(this.formValues));
        this.editorState.completeSave(detail);
      }

      const published = await this.drillService.publishDrill(detail.id);
      this.formValues = drillDetailToFormValues(published);
      this.editorState.completePublish(published);
      this.pendingNotice = 'Harjoite julkaistiin.';
      showViewFeedback('Harjoite julkaistu', `${published.title} siirtyi valmentajien katalogiin.`, 'success');

      if (this.mode === 'new') {
        window.location.hash = `#/editor/drills/${encodeURIComponent(published.id)}/edit`;
      }
    } catch (error) {
      if (isPlannerApiError(error)) {
        if (error.details.length > 0) {
          this.editorState.setValidationErrors(toFieldErrorMap(error.details));
        }

        if (error.status === 401) {
          this.pendingNotice = 'Kirjaudu editoriksi ennen julkaisua.';
        } else if (error.status === 403) {
          this.pendingNotice = 'Sinulla ei ole oikeutta julkaista harjoitteita.';
        }
      }

      this.editorState.failPublish(error);
    }
  }

  private render(): void {
    const focusSnapshot = getFocusSnapshot(this.container);
    const accessSnapshot = this.accessState.getSnapshot();
    const editorSnapshot = this.editorState.getSnapshot();
    const routeHash = this.mode === 'new' ? '#/editor/drills/new' : `#/editor/drills/${this.drillId}/edit`;
    const route = parseHashRoute(routeHash);
    const view = selectViewShell(route);
    const canEdit = Boolean(accessSnapshot.permissions?.canEditDrills);
    const canPublish = Boolean(accessSnapshot.permissions?.canPublishDrills);

    if (accessSnapshot.loadState.status === 'loading' && !accessSnapshot.permissions) {
      this.container.innerHTML = renderViewStateSection({
        shell: view.shell,
        eyebrow: view.eyebrow,
        title: view.title,
        description: 'Editorin oikeudet tarkistetaan ennen kuin kirjoituskentat ja julkaisuohjaimet avataan.',
        state: {
          kind: 'loading',
          title: 'Tarkistetaan editorin oikeuksia',
          message: 'Rooli, julkaisuvaltuudet ja luonnoksen tallennuspolku varmistetaan testiversiota varten.',
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
        description: 'Editorin sisainen kirjoituspolku pysyy lukittuna kunnes kayttajan oikeudet saadaan vahvistettua.',
        state: {
          kind: 'error',
          title: isAuthError ? 'Kirjautuminen puuttuu' : 'Editoriin ei paasty',
          message: isAuthError
            ? 'Kirjaudu planner/editor-kayttajana ennen kirjoitustoimintoja.'
            : accessSnapshot.loadState.error?.message || 'Yrita hetken paasta uudelleen.',
          actions: [{ action: 'retry-editor-access', label: 'Yrita uudelleen' }],
        },
      });
      return;
    }

    if (!canEdit) {
      this.container.innerHTML = renderViewStateSection({
        shell: view.shell,
        eyebrow: view.eyebrow,
        title: view.title,
        description: 'Editorin kirjoitustoiminnot naytetaan vain kayttajille, joilla on oikeus muokata kanonista harjoitesisaltoa.',
        state: {
          kind: 'permission',
          title: 'Ei oikeutta muokata harjoitteita',
          message: 'Kirjoitustoiminnot ovat piilotettu ilman editori-roolia.',
          actions: [{ href: '#/drills', label: 'Palaa harjoitteisiin' }],
        },
      });
      return;
    }

    if (this.mode === 'edit' && editorSnapshot.drillLoadState.status === 'loading' && !editorSnapshot.currentDrill) {
      this.container.innerHTML = renderViewStateSection({
        shell: view.shell,
        eyebrow: view.eyebrow,
        title: view.title,
        description: 'Luonnoksen kentat, liitepaikat ja julkaisuvalmius haetaan ennen editorin avaamista.',
        state: {
          kind: 'loading',
          title: 'Ladataan harjoiteluonnosta',
          message: 'Valmistellaan harjoitteen perustiedot, liitteet ja validointitila muokkausta varten.',
        },
      });
      return;
    }

    if (this.mode === 'edit' && editorSnapshot.drillLoadState.status === 'error' && !editorSnapshot.currentDrill) {
      this.container.innerHTML = renderViewStateSection({
        shell: view.shell,
        eyebrow: view.eyebrow,
        title: view.title,
        description: 'Editorin muokkausnakyma ei avaudu ilman luonnosta, mutta retry-polku pysyy heti tarjolla.',
        state: {
          kind: 'error',
          title: 'Luonnoksen lataus epaonnistui',
          message: editorSnapshot.drillLoadState.error?.message || 'Yrita hetken paasta uudelleen.',
          actions: [{ action: 'retry-editor-drill', label: 'Yrita uudelleen' }],
        },
      });
      return;
    }

    const statusCopy = editorSnapshot.currentDrill?.status === 'published' ? 'Julkaistu' : 'Luonnos';
    const saveError = editorSnapshot.saveState.error?.message;
    const publishError = editorSnapshot.publishState.error?.message;
    const bannerCopy = this.pendingNotice || saveError || publishError;
    const bannerTone = saveError || publishError
      ? 'warning'
      : this.pendingNotice === 'Harjoite julkaistiin.' || this.pendingNotice === 'Luonnos tallennettiin.'
        ? 'success'
        : 'neutral';
    const readinessChecklist = buildDrillReadinessChecklist(this.formValues);
    const readinessCompleted = readinessChecklist.filter(item => item.done).length;
    const readinessLabel = readinessCompleted === readinessChecklist.length ? 'Valmis julkaisuun' : 'Vaatii taydennysta';
    const readinessCopy = readinessCompleted === readinessChecklist.length
      ? 'Kaikki sisaisen testiversion julkaisuvalmiuden kohdat nayttavat olevan mukana.'
      : `Taydenna ${readinessChecklist.length - readinessCompleted} kohtaa ennen julkaisua.`;
    const attachments = editorSnapshot.currentDrill?.attachments || [];

    this.container.innerHTML = `
      <section class="view-shell view-shell-${view.shell} planner-draft-view editor-drill-view" aria-labelledby="editorDrillTitle">
        <div class="planner-draft-header">
          <div>
            <p class="view-shell-eyebrow">${view.eyebrow}</p>
            <h2 id="editorDrillTitle" class="view-shell-title">${escapeHtml(this.formValues.title || view.title)}</h2>
            <p class="view-shell-description">Rakenna natiivi harjoite editorissa, tallenna luonnoksena ja julkaise vasta kun pakolliset tiedot ovat kunnossa.</p>
          </div>
          <div class="planner-draft-actions">
            <a class="view-shell-link" href="#/drills">Palaa harjoitteisiin</a>
            <button type="button" class="planner-draft-save-button planner-draft-save-button-secondary" data-editor-action="save" ${
              editorSnapshot.saveState.status === 'saving' || editorSnapshot.publishState.status === 'saving' ? 'disabled' : ''
            }>Tallenna luonnos</button>
            <button type="button" class="planner-draft-save-button" data-editor-action="publish" ${
              !canPublish || editorSnapshot.saveState.status === 'saving' || editorSnapshot.publishState.status === 'saving' ? 'disabled' : ''
            }>Julkaise</button>
          </div>
        </div>

        ${renderShellSupportPanels(route)}

        <section class="editor-review-split-banner" aria-label="Editorin testiversion rajaus">
          <div class="editor-review-split-card">
            <span class="editor-review-split-label">Editorin testiversio</span>
            <strong>Sisainen kirjoitusnakyma</strong>
            <p>Nakyma on tarkoitettu sisaiselle sisallontuotannolle, ei valmentajien selauspolkuun.</p>
          </div>
          <div class="editor-review-split-card">
            <span class="editor-review-split-label">Valmentajille ei nay</span>
            <strong>Julkaistu harjoite vasta katalogissa</strong>
            <p>Luonnos-, validointi- ja tarkastusviestit pysyvat editoripuolella kunnes julkaisu on tehty.</p>
          </div>
        </section>

        <section class="planner-draft-save-strip">
          <div>
            <p class="planner-draft-save-label">Tila</p>
            <strong>${escapeHtml(statusCopy)}</strong>
            <p class="planner-draft-save-copy">
              ${escapeHtml(
                canPublish
                  ? 'Admin voi julkaista harjoitteen suoraan editorista.'
                  : 'Julkaisu on estetty kunnes admin-oikeus on kaytossa.',
              )}
            </p>
          </div>
          <div>
            <p class="planner-draft-save-label">Rooli</p>
            <strong>${escapeHtml(accessSnapshot.permissions?.role || '-')}</strong>
            <p class="planner-draft-save-copy">${escapeHtml(accessSnapshot.profile?.displayName || accessSnapshot.profile?.email || '')}</p>
          </div>
          <div>
            <p class="planner-draft-save-label">Julkaisuvalmius</p>
            <strong>${escapeHtml(readinessLabel)}</strong>
            <p class="planner-draft-save-copy">${escapeHtml(readinessCopy)}</p>
          </div>
        </section>

        ${
          bannerCopy
            ? `<div class="planner-inline-banner planner-inline-banner-${bannerTone}" role="status"><p>${escapeHtml(bannerCopy)}</p></div>`
            : ''
        }

        <div class="planner-draft-builder editor-drill-builder">
          <section class="planner-draft-panel editor-review-sidebar">
            <div class="planner-draft-section-heading">
              <div>
                <p class="planner-draft-section-kicker">Validointi</p>
                <h3>Julkaisun tarkistus</h3>
              </div>
            </div>
            <div class="editor-review-status-stack">
              <div class="editor-review-status-card">
                <span class="editor-review-status-label">Pakolliset kentat</span>
                <strong>${Object.keys(editorSnapshot.validationErrors).length ? 'Korjauksia tarvitaan' : 'Ei avoimia virheita'}</strong>
                <p>${escapeHtml(
                  Object.keys(editorSnapshot.validationErrors).length
                    ? 'Kenttakohtaiset virheet naytetaan lomakkeessa heti ennen tallennusta tai julkaisua.'
                    : 'Selainvalidointi ei loytanyt avoimia pakollisten kenttien virheita.',
                )}</p>
              </div>
              <div class="editor-review-status-card">
                <span class="editor-review-status-label">Tarkistuslista</span>
                <strong>${readinessCompleted} / ${readinessChecklist.length} valmiina</strong>
                <p>Stakeholder-demoa varten naytetaan julkaisuvalmiuden eteneminen ilman erillista backend-tyonkulkua.</p>
              </div>
            </div>
            ${renderReadinessChecklist(readinessChecklist)}
          </section>

          <section class="planner-draft-panel">
            <div class="planner-draft-section-heading">
              <div>
                <p class="planner-draft-section-kicker">Perustiedot</p>
                <h3>Julkaisukelpoinen runko</h3>
              </div>
            </div>
            <div class="planner-draft-form-grid">
              ${renderField('input', 'title', 'Nimi', this.formValues.title, editorSnapshot.validationErrors.title, {
                width: 'wide',
                placeholder: 'Esim. Syottokolmio paineessa',
              })}
              ${renderField('input', 'slug', 'Slug', this.formValues.slug, editorSnapshot.validationErrors.slug, {
                placeholder: 'valinnainen-url-tunniste',
                hint: 'Jata tyhjaksi, jos haluat slugiin automaattisen muodostuksen.',
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
            </div>
          </section>

          <section class="planner-draft-panel">
            <div class="planner-draft-section-heading">
              <div>
                <p class="planner-draft-section-kicker">Kohderyhma</p>
                <h3>Kuormitus ja rajaukset</h3>
              </div>
            </div>
            <div class="planner-draft-form-grid">
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
                placeholder: 'U12\nU14',
                hint: 'Yksi arvo per rivi tai pilkulla eroteltuna.',
              })}
              ${renderField('textarea', 'skillTags', 'Taitotagit', this.formValues.skillTags, editorSnapshot.validationErrors.skillTags, {
                rows: 4,
                placeholder: 'syotto\nskannaus',
                hint: 'Kaytetaan haussa ja katalogin rajauksissa.',
              })}
              ${renderField('textarea', 'equipment', 'Valineet', this.formValues.equipment, editorSnapshot.validationErrors.equipment, {
                rows: 4,
                placeholder: 'Pallot\nKartiot',
              })}
            </div>
          </section>

          <section class="planner-draft-panel">
            <div class="planner-draft-section-heading">
              <div>
                <p class="planner-draft-section-kicker">Valmennussisalto</p>
                <h3>Ohjeet ja jatkokehitys</h3>
              </div>
            </div>
            <div class="planner-draft-form-grid">
              ${renderField('textarea', 'setupInstructions', 'Alkuasettelu', this.formValues.setupInstructions, editorSnapshot.validationErrors.setupInstructions, {
                width: 'wide',
                rows: 5,
                placeholder: 'Miten alue, pelaajat ja valineet asetellaan ennen aloitusta.',
              })}
              ${renderField('textarea', 'coachingPoints', 'Valmennuspisteet', this.formValues.coachingPoints, editorSnapshot.validationErrors.coachingPoints, {
                width: 'wide',
                rows: 5,
                placeholder: 'Avaa lapaa vastaanotossa\nKatse ennen syottoa',
              })}
              ${renderField('textarea', 'progressionIdeas', 'Progressiot', this.formValues.progressionIdeas, editorSnapshot.validationErrors.progressionIdeas, {
                width: 'wide',
                rows: 4,
                placeholder: 'Lisaa puolustaja\nPienennä tilaa',
              })}
              ${renderField('textarea', 'variationIdeas', 'Variaatiot', this.formValues.variationIdeas, editorSnapshot.validationErrors.variationIdeas, {
                width: 'wide',
                rows: 4,
                placeholder: 'Tee harjoite kahdella pallolla\nMuuta syottosuuntaa',
              })}
            </div>
          </section>

          <section class="planner-draft-panel">
            <div class="planner-draft-section-heading">
              <div>
                <p class="planner-draft-section-kicker">Liitteet</p>
                <h3>Mockattu liitealue sisaiselle testille</h3>
              </div>
            </div>
            <div class="editor-attachment-mock-list" aria-label="Liitteiden testiversio">
              ${
                attachments.length
                  ? attachments
                      .map(
                        attachment => `
                          <article class="editor-attachment-mock-card">
                            <span>${escapeHtml(attachment.type)}</span>
                            <strong>${escapeHtml(attachment.title)}</strong>
                            <p>${escapeHtml(attachment.url)}</p>
                          </article>
                        `,
                      )
                      .join('')
                  : `
                    <article class="editor-attachment-mock-card is-placeholder">
                      <span>mock</span>
                      <strong>Liitteita ei ole viela kytketty</strong>
                      <p>Tassa testiversiossa naytetaan vain tulevan liiteosion rakenne. Varsinainen upload- ja jarjestelylogiikka on viela mockattu.</p>
                    </article>
                  `
              }
            </div>
            <p class="editor-review-footnote">Liitteet eivat viela siirry backendille tassa ensimmaisessa UI-testiversiossa. Tavoite on validoida osion paikka ja odotettu kayttotapa.</p>
          </section>
        </div>
      </section>
    `;

    for (const fieldName of Object.keys(editorSnapshot.validationErrors)) {
      const field = this.container.querySelector<HTMLElement>(`[data-editor-field="${fieldName}"]`);
      if (field) {
        field.setAttribute('title', `${getFieldLabel(fieldName)}: ${editorSnapshot.validationErrors[fieldName]}`);
      }
    }

    restoreFocus(this.container, focusSnapshot);
  }
}
