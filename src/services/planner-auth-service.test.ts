import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PlannerApiClient } from '@/services/planner-api-client';
import { PlannerAuthService } from '@/services/planner-auth-service';
import { PLANNER_IDENTITY_STORAGE_KEY, getStoredPlannerIdentity } from '@/services/planner-identity';

describe('PlannerAuthService', () => {
  it('derives permission flags from the planner role ladder', () => {
    const service = new PlannerAuthService();

    expect(
      service.getPermissions({
        id: 'viewer_1',
        email: 'viewer@example.com',
        role: 'viewer',
        displayName: 'Viewer',
        status: 'active',
        createdAt: '2026-02-28T09:00:00.000Z',
        updatedAt: '2026-02-28T09:00:00.000Z',
      }),
    ).toMatchObject({
      canViewPlanner: true,
      canManageSessions: true,
      canEditDrills: false,
      canPublishDrills: false,
      canReviewImports: false,
      canApproveImports: false,
    });

    expect(
      service.getPermissions({
        id: 'admin_1',
        email: 'admin@example.com',
        role: 'admin',
        displayName: 'Admin',
        status: 'active',
        createdAt: '2026-02-28T09:00:00.000Z',
        updatedAt: '2026-02-28T09:00:00.000Z',
      }),
    ).toMatchObject({
      canViewPlanner: true,
      canManageSessions: true,
      canEditDrills: true,
      canPublishDrills: true,
      canReviewImports: true,
      canApproveImports: true,
    });
  });

  it('loads the current planner profile through the canonical /api/planner/me contract', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: 'editor_1',
          email: 'editor@example.com',
          role: 'editor',
          displayName: 'Editor',
          status: 'active',
          createdAt: '2026-02-28T09:00:00.000Z',
          updatedAt: '2026-02-28T09:00:00.000Z',
        }),
        { status: 200 },
      ),
    );

    const service = new PlannerAuthService(
      new PlannerApiClient({
        fetchImpl,
        getIdentityHeaders: () => ({
          userId: 'editor_1',
          email: 'editor@example.com',
          role: 'editor',
          displayName: 'Editor',
        }),
      }),
    );

    const { profile, permissions } = await service.getCurrentPermissions();

    expect(profile.role).toBe('editor');
    expect(permissions.canEditDrills).toBe(true);
    expect(permissions.canPublishDrills).toBe(false);
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/planner/me',
      expect.objectContaining({
        method: 'GET',
        headers: expect.any(Headers),
      }),
    );
  });
});

describe('getStoredPlannerIdentity', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete (window as typeof window & { HAWKS_PLANNER_IDENTITY?: unknown }).HAWKS_PLANNER_IDENTITY;
  });

  afterEach(() => {
    delete (window as typeof window & { HAWKS_PLANNER_IDENTITY?: unknown }).HAWKS_PLANNER_IDENTITY;
  });

  it('prefers the explicit window identity over localStorage', () => {
    window.localStorage.setItem(
      PLANNER_IDENTITY_STORAGE_KEY,
      JSON.stringify({
        userId: 'storage_user',
        role: 'viewer',
      }),
    );
    (window as typeof window & { HAWKS_PLANNER_IDENTITY?: unknown }).HAWKS_PLANNER_IDENTITY = {
      userId: 'window_user',
      email: 'window@example.com',
      role: 'admin',
      displayName: 'Window Admin',
    };

    expect(getStoredPlannerIdentity()).toEqual({
      userId: 'window_user',
      email: 'window@example.com',
      role: 'admin',
      displayName: 'Window Admin',
    });
  });

  it('rejects malformed stored identities instead of emitting partial auth headers', () => {
    window.localStorage.setItem(PLANNER_IDENTITY_STORAGE_KEY, JSON.stringify({ role: 'admin' }));
    expect(getStoredPlannerIdentity()).toBeNull();

    window.localStorage.setItem(
      PLANNER_IDENTITY_STORAGE_KEY,
      JSON.stringify({
        userId: 'coach_1',
        role: 'owner',
      }),
    );
    expect(getStoredPlannerIdentity()).toEqual({
      userId: 'coach_1',
    });
  });
});
