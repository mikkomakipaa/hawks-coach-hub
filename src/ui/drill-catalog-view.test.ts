import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { DrillCatalogView, applyDrillCatalogFilters } from '@/ui/drill-catalog-view';
import { PlannerDraftState } from '@/state/planner-draft-state';
import { DrillDetailView } from '@/ui/drill-detail-view';
import { PlannerDraftView } from '@/ui/planner-draft-view';
import type { Drill, DrillCatalogPage, DrillCatalogQuery } from '@/types/drills';

const DRILLS: Drill[] = [
  {
    id: 'drill_1',
    slug: 'kulmataistelu',
    title: 'Kulmataistelu',
    summary: 'Nopea 1v1 kulmasta keskustaan.',
    description: 'Kuvaus',
    category: 'Kamppailu',
    intensityLevel: 'high',
    ageGroups: ['U12', 'U14'],
    skillTags: ['1v1', 'kulmapeli'],
    durationMin: 12,
    playerCountMin: 4,
    playerCountMax: 8,
    equipment: [],
    coachingPoints: [],
    setupInstructions: '',
    progressionIdeas: [],
    variationIdeas: [],
    status: 'published',
    sourceType: 'native',
    attachmentIds: [],
    createdAt: '2026-02-28T09:00:00.000Z',
    updatedAt: '2026-02-28T09:00:00.000Z',
  },
  {
    id: 'drill_2',
    slug: 'peruslaukaus',
    title: 'Peruslaukaus',
    summary: 'Laukaustekniikka liikkeesta.',
    description: 'Kuvaus',
    category: 'Laukaukset',
    intensityLevel: 'medium',
    ageGroups: ['U10', 'U12'],
    skillTags: ['laukaus'],
    durationMin: 10,
    playerCountMin: 3,
    playerCountMax: 6,
    equipment: [],
    coachingPoints: [],
    setupInstructions: '',
    progressionIdeas: [],
    variationIdeas: [],
    status: 'published',
    sourceType: 'native',
    attachmentIds: [],
    createdAt: '2026-02-28T09:00:00.000Z',
    updatedAt: '2026-02-28T09:00:00.000Z',
  },
  {
    id: 'drill_3',
    slug: 'syottokolmio',
    title: 'Syottokolmio',
    summary: 'Nopea syotto ja liike pienessa tilassa.',
    description: 'Kuvaus',
    category: 'Syotot',
    intensityLevel: 'low',
    ageGroups: ['U14'],
    skillTags: ['syotto', 'tempo'],
    durationMin: 8,
    playerCountMin: 3,
    playerCountMax: 5,
    equipment: [],
    coachingPoints: [],
    setupInstructions: '',
    progressionIdeas: [],
    variationIdeas: [],
    status: 'published',
    sourceType: 'native',
    attachmentIds: [],
    createdAt: '2026-02-28T09:00:00.000Z',
    updatedAt: '2026-02-28T09:00:00.000Z',
  },
];

function createCatalogPage(query: DrillCatalogQuery = {}): DrillCatalogPage {
  const filtered = DRILLS.filter(drill => {
    if (query.category && drill.category !== query.category) {
      return false;
    }

    if (query.query) {
      const haystack = `${drill.title} ${drill.summary} ${drill.category} ${drill.skillTags.join(' ')}`.toLowerCase();
      return haystack.includes(query.query.toLowerCase());
    }

    return true;
  });

  return {
    items: filtered,
    total: filtered.length,
    filters: {
      category: query.category,
      query: query.query,
    },
  };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function createDrillDetail(drill: Drill) {
  return {
    ...drill,
    attachments: [
      {
        id: `${drill.id}_attachment_1`,
        drillId: drill.id,
        type: 'pdf' as const,
        title: `${drill.title} PDF`,
        url: 'https://example.com/drill.pdf',
        sortOrder: 1,
      },
    ],
  };
}

describe('applyDrillCatalogFilters', () => {
  it('filters drills by query, age group, and intensity', () => {
    const filtered = applyDrillCatalogFilters(DRILLS, {
      query: 'laukaus',
      category: '',
      ageGroup: 'U12',
      skillTag: '',
      intensity: 'medium',
    });

    expect(filtered.map(drill => drill.id)).toEqual(['drill_2']);
  });
});

describe('DrillCatalogView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders drills and narrows results with local filters', async () => {
    const service = {
      listDrills: vi.fn(async (query: DrillCatalogQuery = {}) => createCatalogPage(query)),
    };
    const container = document.createElement('div');
    const view = new DrillCatalogView(container, {
      service: service as never,
    });

    await view.mount();

    expect(service.listDrills).toHaveBeenCalledWith({});
    expect(container.textContent).toContain('Seuraavaksi');
    expect(container.querySelectorAll('[data-drill-card]')).toHaveLength(3);

    const ageGroupSelect = container.querySelector('#drillCatalogAgeGroup');
    expect(ageGroupSelect).toBeInstanceOf(HTMLSelectElement);
    (ageGroupSelect as HTMLSelectElement).value = 'U12';
    ageGroupSelect?.dispatchEvent(new Event('change'));

    expect(container.querySelectorAll('[data-drill-card]')).toHaveLength(2);

    const intensitySelect = container.querySelector('#drillCatalogIntensity');
    expect(intensitySelect).toBeInstanceOf(HTMLSelectElement);
    (intensitySelect as HTMLSelectElement).value = 'high';
    intensitySelect?.dispatchEvent(new Event('change'));

    expect(container.querySelectorAll('[data-drill-card]')).toHaveLength(1);
    expect(container.textContent).toContain('Kulmataistelu');

    view.destroy();
  });

  it('applies tag filters and resets from the no-results state', async () => {
    const service = {
      listDrills: vi.fn(async (query: DrillCatalogQuery = {}) => createCatalogPage(query)),
    };
    const container = document.createElement('div');
    const view = new DrillCatalogView(container, {
      service: service as never,
    });

    await view.mount();

    const skillTagSelect = container.querySelector('#drillCatalogSkillTag');
    expect(skillTagSelect).toBeInstanceOf(HTMLSelectElement);
    (skillTagSelect as HTMLSelectElement).value = 'tempo';
    skillTagSelect?.dispatchEvent(new Event('change'));

    expect(container.querySelectorAll('[data-drill-card]')).toHaveLength(1);
    expect(container.textContent).toContain('Syottokolmio');

    const ageGroupSelect = container.querySelector('#drillCatalogAgeGroup');
    expect(ageGroupSelect).toBeInstanceOf(HTMLSelectElement);
    (ageGroupSelect as HTMLSelectElement).value = 'U10';
    ageGroupSelect?.dispatchEvent(new Event('change'));

    expect(container.textContent).toContain('Hakuehdoilla ei loytynyt harjoitteita');

    expect(container.querySelector('[data-view-state-action="reset-drill-catalog"]')).not.toBeNull();

    const clearButton = container.querySelector('#drillCatalogClear');
    clearButton?.dispatchEvent(new MouseEvent('click'));
    await flushPromises();

    expect(container.querySelectorAll('[data-drill-card]')).toHaveLength(3);

    view.destroy();
  });

  it('debounces search requests and clears filters back to the full list', async () => {
    const service = {
      listDrills: vi.fn(async (query: DrillCatalogQuery = {}) => createCatalogPage(query)),
    };
    const container = document.createElement('div');
    const view = new DrillCatalogView(container, {
      service: service as never,
    });

    await view.mount();

    const searchInput = container.querySelector('#drillCatalogSearch');
    expect(searchInput).toBeInstanceOf(HTMLInputElement);
    (searchInput as HTMLInputElement).value = 'syotto';
    searchInput?.dispatchEvent(new Event('input'));

    vi.advanceTimersByTime(149);
    await flushPromises();
    expect(service.listDrills).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    await flushPromises();
    expect(service.listDrills).toHaveBeenLastCalledWith({ query: 'syotto' });
    expect(container.querySelectorAll('[data-drill-card]')).toHaveLength(1);

    const clearButton = container.querySelector('#drillCatalogClear');
    clearButton?.dispatchEvent(new MouseEvent('click'));
    await flushPromises();

    expect(service.listDrills).toHaveBeenLastCalledWith({});
    expect(container.querySelectorAll('[data-drill-card]')).toHaveLength(3);

    view.destroy();
  });

  it('adds a drill from the catalog card into a planner draft and routes forward', async () => {
    const draftState = new PlannerDraftState();
    const service = {
      listDrills: vi.fn(async (query: DrillCatalogQuery = {}) => createCatalogPage(query)),
    };
    const container = document.createElement('div');
    const view = new DrillCatalogView(container, {
      service: service as never,
      plannerDraftState: draftState,
    });

    window.location.hash = '#/drills';
    await view.mount();

    const addButton = container.querySelector('[data-drill-add="drill_1"]');
    addButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(window.location.hash).toBe('#/plan/new');
    expect(draftState.getSnapshot()?.blocks).toHaveLength(1);
    expect(draftState.getSnapshot()?.blocks[0]?.drillId).toBe('drill_1');

    view.destroy();
  });
});

describe('DrillDetailView and PlannerDraftView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.location.hash = '#/';
  });

  it('renders drill detail metadata and moves the drill into the planner draft', async () => {
    const draftState = new PlannerDraftState();
    const detail = createDrillDetail(DRILLS[0]);
    const service = {
      getDrill: vi.fn(async () => detail),
    };
    const container = document.createElement('div');
    const view = new DrillDetailView(container, detail.slug, {
      service: service as never,
      plannerDraftState: draftState,
    });

    await view.mount();

    expect(container.textContent).toContain('Kulmataistelu');
    expect(container.textContent).toContain('Valitse harjoite session rungoksi');
    expect(container.textContent).toContain('Valmennuspisteet');
    expect(container.textContent).toContain('Liitteet');

    const addButton = container.querySelector('[data-drill-detail-action="add-to-plan"]');
    addButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(window.location.hash).toBe('#/plan/new');
    expect(draftState.getSnapshot()?.blocks).toHaveLength(1);
    expect(draftState.getSnapshot()?.blocks[0]?.title).toBe('Kulmataistelu');

    view.destroy();
  });

  it('shows intentional placeholders when drill media or setup details are missing', async () => {
    const detail = {
      ...createDrillDetail(DRILLS[1]),
      primaryImageUrl: undefined,
      setupInstructions: '',
      description: '',
      attachments: [],
    };
    const service = {
      getDrill: vi.fn(async () => detail),
    };
    const container = document.createElement('div');
    const view = new DrillDetailView(container, detail.slug, {
      service: service as never,
    });

    await view.mount();

    expect(container.textContent).toContain('Visuaali tulossa');
    expect(container.textContent).toContain('Ei erillista asettelukuvausta');
    expect(container.textContent).toContain('jokainen harjoite ei viela sisalla mediaa');

    view.destroy();
  });

  it('renders the planner draft builder, updates totals, and reorders blocks', async () => {
    const draftState = new PlannerDraftState();
    draftState.addDrill(DRILLS[1]);
    draftState.addDrill(DRILLS[2]);

    const container = document.createElement('div');
    const view = new PlannerDraftView(container, draftState);

    await view.mount();

    expect(container.textContent).toContain('Yhteensa');
    expect(container.querySelectorAll('[data-planner-block-id]')).toHaveLength(2);
    const blockTitleInputs = [...container.querySelectorAll('[data-block-field="title"]')] as HTMLInputElement[];
    expect(blockTitleInputs.map(input => input.value)).toEqual(['Peruslaukaus', 'Syottokolmio']);

    const targetDurationInput = container.querySelector('[data-session-field="targetDurationMin"]');
    expect(targetDurationInput).toBeInstanceOf(HTMLInputElement);
    (targetDurationInput as HTMLInputElement).value = '40';
    targetDurationInput?.dispatchEvent(new Event('input', { bubbles: true }));

    const secondBlockId = draftState.getSnapshot()?.blocks[1]?.id;
    const secondBlockDurationInput = container.querySelector(
      `[data-block-field="durationMin"][data-block-id="${secondBlockId}"]`,
    );
    expect(secondBlockDurationInput).toBeInstanceOf(HTMLInputElement);
    (secondBlockDurationInput as HTMLInputElement).value = '16';
    secondBlockDurationInput?.dispatchEvent(new Event('input', { bubbles: true }));

    const moveUpButton = container.querySelector(
      `[data-planner-action="move-up"][data-block-id="${secondBlockId}"]`,
    );
    moveUpButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(draftState.getSnapshot()?.totalDurationMin).toBe(26);
    expect(draftState.getSnapshot()?.blocks[0]?.title).toBe('Syottokolmio');
    expect(container.textContent).toContain('26 min');
    expect(container.textContent).toContain('14 min jaljella');

    view.destroy();
  });
});
