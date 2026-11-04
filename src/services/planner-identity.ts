import type { PlannerIdentityHeaders, PlannerRole } from '@/types/planner';

export const PLANNER_IDENTITY_STORAGE_KEY = 'hawks.planner.identity.v1';

interface StoredPlannerIdentity {
  userId?: string;
  email?: string;
  role?: PlannerRole;
  displayName?: string;
}

function isPlannerRole(value: unknown): value is PlannerRole {
  return value === 'viewer' || value === 'editor' || value === 'admin';
}

function normalizeIdentity(input: unknown): PlannerIdentityHeaders | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const candidate = input as StoredPlannerIdentity;
  const userId = typeof candidate.userId === 'string' ? candidate.userId.trim() : '';
  if (!userId) {
    return null;
  }

  const identity: PlannerIdentityHeaders = { userId };
  const email = typeof candidate.email === 'string' && candidate.email.trim() ? candidate.email.trim() : '';
  const displayName =
    typeof candidate.displayName === 'string' && candidate.displayName.trim() ? candidate.displayName.trim() : '';

  if (email) {
    identity.email = email;
  }

  if (isPlannerRole(candidate.role)) {
    identity.role = candidate.role;
  }

  if (displayName) {
    identity.displayName = displayName;
  }

  return identity;
}

export function getStoredPlannerIdentity(): PlannerIdentityHeaders | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }

  const globalIdentity = normalizeIdentity((window as typeof window & { HAWKS_PLANNER_IDENTITY?: unknown }).HAWKS_PLANNER_IDENTITY);
  if (globalIdentity) {
    return globalIdentity;
  }

  const raw = window.localStorage.getItem(PLANNER_IDENTITY_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return normalizeIdentity(JSON.parse(raw));
  } catch {
    return null;
  }
}
