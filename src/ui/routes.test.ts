import { describe, expect, it } from 'vitest';

import { getTopLevelShell, parseHashRoute } from '@/ui/routes';

describe('parseHashRoute', () => {
  it('defaults empty hashes to browse mode', () => {
    expect(parseHashRoute(undefined)).toEqual({ kind: 'browse', path: '/' });
    expect(parseHashRoute('')).toEqual({ kind: 'browse', path: '/' });
    expect(parseHashRoute('#')).toEqual({ kind: 'browse', path: '/' });
    expect(parseHashRoute('#/')).toEqual({ kind: 'browse', path: '/' });
  });

  it('parses drill catalog and drill detail routes', () => {
    expect(parseHashRoute('#/drills')).toEqual({
      kind: 'drill-catalog',
      path: '/drills'
    });

    expect(parseHashRoute('#/drills/close-out')).toEqual({
      kind: 'drill-detail',
      path: '/drills/close-out',
      drillId: 'close-out'
    });
  });

  it('parses planner routes', () => {
    expect(parseHashRoute('#/plan')).toEqual({
      kind: 'planner-list',
      path: '/plan'
    });

    expect(parseHashRoute('#/plan/new')).toEqual({
      kind: 'planner-new',
      path: '/plan/new'
    });

    expect(parseHashRoute('#/plan/session_42')).toEqual({
      kind: 'planner-detail',
      path: '/plan/session_42',
      sessionId: 'session_42'
    });
  });

  it('parses share and editor routes', () => {
    expect(parseHashRoute('#/session/shareToken123')).toEqual({
      kind: 'shared-session',
      path: '/session/shareToken123',
      shareId: 'shareToken123'
    });

    expect(parseHashRoute('#/editor/drills/new')).toEqual({
      kind: 'editor-drill-new',
      path: '/editor/drills/new'
    });

    expect(parseHashRoute('#/editor/drills/drill_7/edit')).toEqual({
      kind: 'editor-drill-edit',
      path: '/editor/drills/drill_7/edit',
      drillId: 'drill_7'
    });

    expect(parseHashRoute('#/editor/imports')).toEqual({
      kind: 'editor-imports',
      path: '/editor/imports'
    });
  });

  it('returns a not-found route for unknown hashes', () => {
    expect(parseHashRoute('#/unknown/path')).toEqual({
      kind: 'not-found',
      path: '/unknown/path'
    });
  });
});

describe('getTopLevelShell', () => {
  it('maps parsed routes to the correct top-level shells', () => {
    expect(getTopLevelShell(parseHashRoute('#/'))).toBe('browse');
    expect(getTopLevelShell(parseHashRoute('#/drills/drill_1'))).toBe('drill');
    expect(getTopLevelShell(parseHashRoute('#/plan/new'))).toBe('planner');
    expect(getTopLevelShell(parseHashRoute('#/session/shareToken123'))).toBe('share');
    expect(getTopLevelShell(parseHashRoute('#/editor/imports'))).toBe('editor');
    expect(getTopLevelShell(parseHashRoute('#/unknown/path'))).toBe('not-found');
  });
});
