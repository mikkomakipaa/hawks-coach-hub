import { renderDrillCard } from '@/components/drill-card';
import { renderViewState, showViewFeedback } from '@/components/view-state';
import { DrillCatalogService } from '@/services/drill-catalog-service';
import { DrillCatalogState } from '@/state/drill-catalog-state';
import { plannerDraftState, PlannerDraftState } from '@/state/planner-draft-state';
import type { Drill, DrillCatalogQuery, DrillIntensityLevel } from '@/types/drills';
import { parseHashRoute } from '@/ui/routes';
import { renderShellSupportPanels, selectViewShell } from '@/ui/view-shells';

const SEARCH_DEBOUNCE_MS = 150;

export interface DrillCatalogUiFilters {
  query: string;
  category: string;
  ageGroup: string;
  skillTag: string;
  intensity: '' | DrillIntensityLevel;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toUniqueOptions(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, 'fi'));
}

function renderOptions(values: string[], selectedValue: string, label: string): string {
  const options = values
    .map(value => {
      const selected = value === selectedValue ? ' selected' : '';
      return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(value)}</option>`;
    })
    .join('');

  return `<option value="">${label}</option>${options}`;
}

function getIntensityOptions(): Array<{ value: DrillCatalogUiFilters['intensity']; label: string }> {
  return [
    { value: '', label: 'Kaikki tehot' },
    { value: 'low', label: 'Matala' },
    { value: 'medium', label: 'Keskitaso' },
    { value: 'high', label: 'Korkea' },
  ];
}

export function applyDrillCatalogFilters(drills: Drill[], filters: DrillCatalogUiFilters): Drill[] {
  const normalizedQuery = filters.query.trim().toLocaleLowerCase('fi');

  return drills.filter(drill => {
    if (filters.category && drill.category !== filters.category) {
      return false;
    }

    if (filters.ageGroup && !drill.ageGroups.includes(filters.ageGroup)) {
      return false;
    }

    if (filters.skillTag && !drill.skillTags.includes(filters.skillTag)) {
      return false;
    }

    if (filters.intensity && drill.intensityLevel !== filters.intensity) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      drill.title,
      drill.summary,
      drill.category,
      ...drill.skillTags,
      ...drill.ageGroups,
    ]
      .join(' ')
      .toLocaleLowerCase('fi');

    return haystack.includes(normalizedQuery);
  });
}

export class DrillCatalogView {
  private readonly state: DrillCatalogState;
  private readonly service: DrillCatalogService;
  private readonly filters: DrillCatalogUiFilters = {
    query: '',
    category: '',
    ageGroup: '',
    skillTag: '',
    intensity: '',
  };

  private unsubscribeState: (() => void) | null = null;
  private searchTimer: number | null = null;
  private activeRequestId = 0;

  constructor(
    private readonly container: HTMLElement,
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

  private readonly plannerDraftState: PlannerDraftState;

  async mount(): Promise<void> {
    this.container.dataset.shell = 'drill';
    this.container.dataset.view = 'drill-catalog';
    this.renderFrame();

    this.unsubscribeState = this.state.subscribe(() => {
      this.renderFilters();
      this.renderResults();
    });

    this.bindEvents();
    this.renderFilters();
    this.renderResults();
    await this.loadCatalog();
  }

  destroy(): void {
    if (this.unsubscribeState) {
      this.unsubscribeState();
      this.unsubscribeState = null;
    }

    if (this.searchTimer !== null) {
      window.clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
  }

  private renderFrame(): void {
    const view = selectViewShell(parseHashRoute('#/drills'));

    this.container.innerHTML = `
      <section class="view-shell view-shell-${view.shell} drill-catalog-view" aria-labelledby="drillCatalogTitle">
        <div class="drill-catalog-hero">
          <div>
            <p class="view-shell-eyebrow">${view.eyebrow}</p>
            <h2 id="drillCatalogTitle" class="view-shell-title">${view.title}</h2>
            <p class="view-shell-description">Etsi julkaistu harjoite nopeasti nimen, kategorian, ikaryhman ja tehon perusteella.</p>
          </div>
          <div class="drill-catalog-actions">
            <a class="view-shell-link" href="#/">Avaa selaustila</a>
          </div>
        </div>
        ${renderShellSupportPanels(parseHashRoute('#/drills'))}
        <form class="drill-catalog-filters" aria-label="Harjoitehaun rajaukset">
          <label class="drill-catalog-field drill-catalog-field-search">
            <span class="drill-catalog-field-label">Etsi harjoite</span>
            <input
              id="drillCatalogSearch"
              class="drill-catalog-input"
              type="search"
              inputmode="search"
              autocomplete="off"
              placeholder="Syota nimi, kategoria tai tagi"
            />
          </label>
          <label class="drill-catalog-field">
            <span class="drill-catalog-field-label">Kategoria</span>
            <select id="drillCatalogCategory" class="drill-catalog-select"></select>
          </label>
          <label class="drill-catalog-field">
            <span class="drill-catalog-field-label">Ikaryhma</span>
            <select id="drillCatalogAgeGroup" class="drill-catalog-select"></select>
          </label>
          <label class="drill-catalog-field">
            <span class="drill-catalog-field-label">Taitotagi</span>
            <select id="drillCatalogSkillTag" class="drill-catalog-select"></select>
          </label>
          <label class="drill-catalog-field">
            <span class="drill-catalog-field-label">Teho</span>
            <select id="drillCatalogIntensity" class="drill-catalog-select"></select>
          </label>
          <button type="button" id="drillCatalogClear" class="drill-catalog-clear">Tyhjenna</button>
        </form>
        <div class="drill-catalog-quick-filters" id="drillCatalogQuickFilters" aria-label="Nopeat rajaukset"></div>
        <div class="drill-catalog-status" id="drillCatalogStatus" aria-live="polite"></div>
        <div class="drill-catalog-results" id="drillCatalogResults"></div>
      </section>
    `;
  }

  private bindEvents(): void {
    const searchInput = this.getRequiredElement<HTMLInputElement>('#drillCatalogSearch');
    const categorySelect = this.getRequiredElement<HTMLSelectElement>('#drillCatalogCategory');
    const ageGroupSelect = this.getRequiredElement<HTMLSelectElement>('#drillCatalogAgeGroup');
    const skillTagSelect = this.getRequiredElement<HTMLSelectElement>('#drillCatalogSkillTag');
    const intensitySelect = this.getRequiredElement<HTMLSelectElement>('#drillCatalogIntensity');
    const clearButton = this.getRequiredElement<HTMLButtonElement>('#drillCatalogClear');

    searchInput.addEventListener('input', () => {
      this.filters.query = searchInput.value;
      this.scheduleLoad();
      this.renderResults();
    });

    categorySelect.addEventListener('change', () => {
      this.filters.category = categorySelect.value;
      void this.loadCatalog();
    });

    ageGroupSelect.addEventListener('change', () => {
      this.filters.ageGroup = ageGroupSelect.value;
      this.renderResults();
    });

    skillTagSelect.addEventListener('change', () => {
      this.filters.skillTag = skillTagSelect.value;
      this.renderResults();
    });

    intensitySelect.addEventListener('change', () => {
      this.filters.intensity = intensitySelect.value as DrillCatalogUiFilters['intensity'];
      this.renderResults();
    });

    clearButton.addEventListener('click', () => {
      this.filters.query = '';
      this.filters.category = '';
      this.filters.ageGroup = '';
      this.filters.skillTag = '';
      this.filters.intensity = '';

      searchInput.value = '';
      categorySelect.value = '';
      ageGroupSelect.value = '';
      skillTagSelect.value = '';
      intensitySelect.value = '';

      this.renderFilters();
      this.renderResults();
      void this.loadCatalog();
    });

    this.container.addEventListener('click', event => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (target.closest<HTMLElement>('[data-view-state-action="retry-drill-catalog"]')) {
        void this.loadCatalog();
        return;
      }

      if (target.closest<HTMLElement>('[data-view-state-action="reset-drill-catalog"]')) {
        clearButton.click();
        return;
      }

      const quickFilterButton = target.closest<HTMLElement>('[data-drill-quick-filter]');
      if (quickFilterButton) {
        const filterType = quickFilterButton.dataset.filterType;
        const filterValue = quickFilterButton.dataset.filterValue ?? '';
        const isActive = quickFilterButton.dataset.active === 'true';
        const nextValue = isActive ? '' : filterValue;

        if (filterType === 'category') {
          this.filters.category = nextValue;
          categorySelect.value = nextValue;
          void this.loadCatalog();
        } else if (filterType === 'age') {
          this.filters.ageGroup = nextValue;
          ageGroupSelect.value = nextValue;
          this.renderResults();
        } else if (filterType === 'intensity') {
          this.filters.intensity = nextValue as DrillCatalogUiFilters['intensity'];
          intensitySelect.value = nextValue;
          this.renderResults();
        }

        return;
      }

      const drillId = target.dataset.drillAdd;
      if (!drillId) {
        return;
      }

      const drill = this.state.getSnapshot().page?.items.find(candidate => candidate.id === drillId);
      if (!drill) {
        return;
      }

      this.plannerDraftState.addDrill(drill);
      showViewFeedback('Harjoite lisatty', `${drill.title} siirrettiin plannerin luonnokseen.`, 'success');
      window.location.hash = '#/plan/new';
    });
  }

  private scheduleLoad(): void {
    if (this.searchTimer !== null) {
      window.clearTimeout(this.searchTimer);
    }

    this.searchTimer = window.setTimeout(() => {
      this.searchTimer = null;
      void this.loadCatalog();
    }, SEARCH_DEBOUNCE_MS);
  }

  private async loadCatalog(): Promise<void> {
    const query: DrillCatalogQuery = {};

    if (this.filters.query.trim()) {
      query.query = this.filters.query.trim();
    }

    if (this.filters.category) {
      query.category = this.filters.category;
    }

    const requestId = ++this.activeRequestId;

    this.state.beginListLoad(query);

    try {
      const page = await this.service.listDrills(query);

      if (requestId !== this.activeRequestId) {
        return;
      }

      this.state.completeListLoad(page);
    } catch (error) {
      if (requestId !== this.activeRequestId) {
        return;
      }

      this.state.failListLoad(error);
    }
  }

  private renderFilters(): void {
    const page = this.state.getSnapshot().page;
    const drills = page?.items ?? [];
    const categorySelect = this.getRequiredElement<HTMLSelectElement>('#drillCatalogCategory');
    const ageGroupSelect = this.getRequiredElement<HTMLSelectElement>('#drillCatalogAgeGroup');
    const skillTagSelect = this.getRequiredElement<HTMLSelectElement>('#drillCatalogSkillTag');
    const intensitySelect = this.getRequiredElement<HTMLSelectElement>('#drillCatalogIntensity');
    const clearButton = this.getRequiredElement<HTMLButtonElement>('#drillCatalogClear');
    const quickFilters = this.getRequiredElement<HTMLDivElement>('#drillCatalogQuickFilters');

    const categories = toUniqueOptions(drills.map(drill => drill.category));
    const ageGroups = toUniqueOptions(drills.flatMap(drill => drill.ageGroups));
    const skillTags = toUniqueOptions(drills.flatMap(drill => drill.skillTags));

    categorySelect.innerHTML = renderOptions(categories, this.filters.category, 'Kaikki kategoriat');
    ageGroupSelect.innerHTML = renderOptions(ageGroups, this.filters.ageGroup, 'Kaikki ikaryhmat');
    skillTagSelect.innerHTML = renderOptions(skillTags, this.filters.skillTag, 'Kaikki tagit');
    intensitySelect.innerHTML = getIntensityOptions()
      .map(option => {
        const selected = option.value === this.filters.intensity ? ' selected' : '';
        return `<option value="${option.value}"${selected}>${option.label}</option>`;
      })
      .join('');

    quickFilters.innerHTML = this.renderQuickFilters(categories, ageGroups);

    clearButton.disabled =
      !this.filters.query &&
      !this.filters.category &&
      !this.filters.ageGroup &&
      !this.filters.skillTag &&
      !this.filters.intensity;
  }

  private renderResults(): void {
    const snapshot = this.state.getSnapshot();
    const results = this.getRequiredElement<HTMLDivElement>('#drillCatalogResults');
    const status = this.getRequiredElement<HTMLDivElement>('#drillCatalogStatus');

    if (snapshot.listState.status === 'loading' && !snapshot.page) {
      status.innerHTML = `
        <p class="drill-catalog-status-copy">
          <strong>Rakennetaan harjoitekirjastoa</strong>
          <span>Julkaistut harjoitteet ja testiversion placeholderit latautuvat.</span>
        </p>
      `;
      results.innerHTML = `
        <div class="drill-catalog-grid" aria-hidden="true">
          ${Array.from({ length: 6 }, () => '<div class="drill-card drill-card-skeleton"></div>').join('')}
        </div>
      `;
      return;
    }

    if (snapshot.listState.status === 'error') {
      status.innerHTML = `<p class="drill-catalog-status-copy">Harjoitteiden lataus epaonnistui.</p>`;
      results.innerHTML = renderViewState({
        kind: 'error',
        title: 'Yhteys katkesi',
        message: snapshot.listState.error?.message || 'Yrita hetken paasta uudelleen.',
        compact: true,
        actions: [{ action: 'retry-drill-catalog', label: 'Yrita uudelleen' }],
      });
      return;
    }

    const drills = snapshot.page?.items ?? [];
    const filteredDrills = applyDrillCatalogFilters(drills, this.filters);
    const loadingCopy = snapshot.listState.status === 'loading' ? 'Paivitetaan...' : '';
    const activeFilters = [
      this.filters.category,
      this.filters.ageGroup,
      this.filters.skillTag,
      this.filters.intensity,
      this.filters.query.trim() ? `Haku: ${this.filters.query.trim()}` : '',
    ].filter(Boolean);

    status.innerHTML = `
      <p class="drill-catalog-status-copy">
        <strong>${filteredDrills.length}</strong> / ${snapshot.page?.total ?? drills.length} harjoitetta
        ${
          activeFilters.length > 0
            ? `<span class="drill-catalog-status-inline">${escapeHtml(activeFilters.join(' · '))}</span>`
            : '<span class="drill-catalog-status-inline">Rajaa ian, kategorian, tagin tai tehon mukaan.</span>'
        }
        ${loadingCopy ? `<span class="drill-catalog-status-inline">${loadingCopy}</span>` : ''}
      </p>
    `;

    if (drills.length === 0) {
      results.innerHTML = renderViewState({
        kind: 'empty',
        title: 'Harjoitteita ei ole viela julkaistu',
        message: 'Kun katalogi taydentyy, loydat harjoitteet taalta haku- ja rajausvalinien avulla. Testiversio varautuu myos osittaisiin Airtable-tietoihin.',
        compact: true,
      });
      return;
    }

    if (filteredDrills.length === 0) {
      results.innerHTML = renderViewState({
        kind: 'empty',
        title: 'Hakuehdoilla ei loytynyt harjoitteita',
        message: 'Kokeile laajempaa hakusanaa tai poista yksi rajaus kerrallaan. Yksi napin painallus palauttaa koko listan.',
        compact: true,
        actions: [{ action: 'reset-drill-catalog', label: 'Nayta kaikki harjoitteet' }],
      });
      return;
    }

    results.innerHTML = `
      <div class="drill-catalog-grid">
        ${filteredDrills.map(renderDrillCard).join('')}
      </div>
    `;
  }

  private getRequiredElement<T extends HTMLElement>(selector: string): T {
    const element = this.container.querySelector(selector);

    if (!(element instanceof HTMLElement)) {
      throw new Error(`Missing drill catalog element: ${selector}`);
    }

    return element as T;
  }

  private renderQuickFilters(categories: string[], ageGroups: string[]): string {
    const quickFilters: Array<{ label: string; type: 'category' | 'age' | 'intensity'; value: string }> = [];

    for (const category of categories.slice(0, 3)) {
      quickFilters.push({ label: category, type: 'category', value: category });
    }

    for (const ageGroup of ageGroups.slice(0, 2)) {
      quickFilters.push({ label: ageGroup, type: 'age', value: ageGroup });
    }

    quickFilters.push({ label: 'Korkea teho', type: 'intensity', value: 'high' });

    if (quickFilters.length === 0) {
      return '';
    }

    return `
      <div class="drill-catalog-quick-filter-list">
        ${quickFilters
          .map(filter => {
            const isActive =
              (filter.type === 'category' && this.filters.category === filter.value) ||
              (filter.type === 'age' && this.filters.ageGroup === filter.value) ||
              (filter.type === 'intensity' && this.filters.intensity === filter.value);

            return `
              <button
                type="button"
                class="drill-catalog-filter-chip${isActive ? ' is-active' : ''}"
                data-drill-quick-filter="true"
                data-filter-type="${filter.type}"
                data-filter-value="${escapeHtml(filter.value)}"
                data-active="${isActive ? 'true' : 'false'}"
              >
                ${escapeHtml(filter.label)}
              </button>
            `;
          })
          .join('')}
      </div>
    `;
  }
}
