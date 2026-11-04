import { describe, expect, it } from 'vitest';

import { PlannerApiError } from '@/services/planner-api-client';
import { DrillCatalogState } from '@/state/drill-catalog-state';
import { calculateTotalDuration, PlannerDraftState } from '@/state/planner-draft-state';
import { EditorDraftState } from '@/state/editor-draft-state';
import { PlannerAccessState } from '@/state/planner-access-state';
import { PlannerSessionState } from '@/state/planner-session-state';
import type { Drill } from '@/types/drills';

const TEST_DRILL: Drill = {
  id: 'drill_state_1',
  slug: 'state-drill',
  title: 'State Drill',
  summary: 'Summary',
  description: 'Description',
  category: 'Passing',
  ageGroups: ['U14'],
  skillTags: ['tempo'],
  durationMin: 12,
  equipment: [],
  coachingPoints: [],
  progressionIdeas: [],
  variationIdeas: [],
  status: 'published',
  sourceType: 'native',
  attachmentIds: [],
  createdAt: '2026-02-28T09:00:00.000Z',
  updatedAt: '2026-02-28T09:00:00.000Z',
};

describe('planner state containers', () => {
  it('tracks drill catalog list and detail loading transitions', () => {
    const state = new DrillCatalogState();

    state.beginListLoad({ query: 'passing' });
    expect(state.getSnapshot().listState.status).toBe('loading');

    state.completeListLoad({
      items: [],
      total: 0,
      filters: { query: 'passing' },
    });
    expect(state.getSnapshot().listState.status).toBe('success');

    state.beginDetailLoad('drill_1');
    state.failDetailLoad(new PlannerApiError(404, 'NOT_FOUND', 'Drill not found.'));

    expect(state.getSnapshot().selectedDrillId).toBe('drill_1');
    expect(state.getSnapshot().detailState.status).toBe('error');
    expect(state.getSnapshot().detailState.error?.code).toBe('NOT_FOUND');
  });

  it('tracks session dirty, save, and share state separately', () => {
    const state = new PlannerSessionState();

    state.completeSessionLoad({
      id: 'session_1',
      name: 'Game Day',
      group: 'U14',
      date: '2026-03-10',
      ownerUserId: 'coach_1',
      coachLabel: 'Coach One',
      status: 'draft',
      visibility: 'private',
      blocks: [],
      createdAt: '2026-02-28T12:00:00.000Z',
      updatedAt: '2026-02-28T12:00:00.000Z',
    });
    state.markDirty({
      ...state.getSnapshot().currentSession!,
      name: 'Game Day Updated',
    });
    state.beginSave();
    state.completeSave({
      ...state.getSnapshot().currentSession!,
      updatedAt: '2026-02-28T12:05:00.000Z',
    });
    state.beginShare();
    state.completeShare({
      sessionId: 'session_1',
      shareId: 'share_1',
      visibility: 'shared',
      shareUrl: '/session/share_1',
      updatedAt: '2026-02-28T12:10:00.000Z',
    });

    expect(state.getSnapshot().dirty).toBe(false);
    expect(state.getSnapshot().saveState.status).toBe('saved');
    expect(state.getSnapshot().shareState.status).toBe('saved');
    expect(state.getSnapshot().currentSession?.shareId).toBe('share_1');
  });

  it('tracks editor drill and import recovery state independently', () => {
    const state = new EditorDraftState();

    state.beginDrillLoad();
    state.failDrillLoad(new Error('Draft load failed.'));
    state.beginImportAction();
    state.completeImportAction({
      id: 'import_draft_1',
      sourceType: 'pdf',
      extractedFields: {},
      confidence: 'medium',
      reviewStatus: 'reviewed',
      createdAt: '2026-02-28T13:00:00.000Z',
      updatedAt: '2026-02-28T13:10:00.000Z',
    });

    expect(state.getSnapshot().drillLoadState.status).toBe('error');
    expect(state.getSnapshot().drillLoadState.error?.message).toBe('Draft load failed.');
    expect(state.getSnapshot().importActionState.status).toBe('saved');
    expect(state.getSnapshot().selectedImportDraft?.reviewStatus).toBe('reviewed');
  });

  it('stores planner profile and permission state for route guards', () => {
    const state = new PlannerAccessState();

    state.beginLoad();
    state.completeLoad(
      {
        id: 'editor_1',
        email: 'editor@example.com',
        role: 'editor',
        displayName: 'Editor',
        status: 'active',
        createdAt: '2026-02-20T09:00:00.000Z',
        updatedAt: '2026-02-20T09:00:00.000Z',
      },
      {
        role: 'editor',
        canViewPlanner: true,
        canManageSessions: true,
        canEditDrills: true,
        canPublishDrills: false,
        canReviewImports: true,
        canApproveImports: false,
      },
    );

    expect(state.getSnapshot().loadState.status).toBe('success');
    expect(state.getSnapshot().permissions?.canEditDrills).toBe(true);
    expect(state.getSnapshot().permissions?.canPublishDrills).toBe(false);
  });

  it('edits planner draft blocks and keeps totals in sync', () => {
    const state = new PlannerDraftState();

    state.addDrill(TEST_DRILL);
    state.addCustomBlock();

    const initialSession = state.getSnapshot();
    expect(initialSession?.totalDurationMin).toBe(22);

    const customBlockId = initialSession?.blocks[1]?.id;
    expect(customBlockId).toBeDefined();

    state.updateSessionDetails({
      name: 'Iltajaat',
      targetDurationMin: 75,
    });
    state.updateBlock(customBlockId!, {
      title: 'Pienpelit',
      durationMin: 18,
      notes: '4v4 koko kentta',
      type: 'game',
    });
    state.moveBlock(customBlockId!, 'up');

    const updatedSession = state.getSnapshot();
    expect(updatedSession?.name).toBe('Iltajaat');
    expect(updatedSession?.targetDurationMin).toBe(75);
    expect(updatedSession?.blocks[0]?.title).toBe('Pienpelit');
    expect(updatedSession?.blocks[0]?.order).toBe(1);
    expect(updatedSession?.blocks[1]?.order).toBe(2);
    expect(updatedSession?.totalDurationMin).toBe(30);
    expect(calculateTotalDuration(updatedSession?.blocks ?? [])).toBe(30);

    state.removeBlock(customBlockId!);
    expect(state.getSnapshot()?.totalDurationMin).toBe(12);
  });
});
