import type { Session } from '@/types/sessions';

const DRAFT_KEY = 'hawks.planner.session-draft.v1';
const RECOVERY_KEY = 'hawks.planner.session-recovery.v1';

interface StoredDraftPayload {
  savedAt: string;
  session: Session;
}

export interface StoredRecoveryPayload {
  savedAt: string;
  session: Session;
  reason: string;
  sessionId: string | null;
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function parseStoredPayload<T>(rawValue: string | null): T | null {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

export class PlannerSessionRecoveryStore {
  getDraft(): Session | null {
    if (!canUseStorage()) {
      return null;
    }

    const payload = parseStoredPayload<StoredDraftPayload>(window.localStorage.getItem(DRAFT_KEY));
    return payload?.session ?? null;
  }

  saveDraft(session: Session): void {
    if (!canUseStorage()) {
      return;
    }

    const payload: StoredDraftPayload = {
      savedAt: new Date().toISOString(),
      session,
    };

    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  }

  clearDraft(): void {
    if (!canUseStorage()) {
      return;
    }

    window.localStorage.removeItem(DRAFT_KEY);
  }

  getRecovery(): StoredRecoveryPayload | null {
    if (!canUseStorage()) {
      return null;
    }

    return parseStoredPayload<StoredRecoveryPayload>(window.localStorage.getItem(RECOVERY_KEY));
  }

  saveRecovery(session: Session, reason: string): void {
    if (!canUseStorage()) {
      return;
    }

    const payload: StoredRecoveryPayload = {
      savedAt: new Date().toISOString(),
      session,
      reason,
      sessionId: session.id === 'session_draft' ? null : session.id,
    };

    window.localStorage.setItem(RECOVERY_KEY, JSON.stringify(payload));
    this.saveDraft(session);
  }

  clearRecovery(): void {
    if (!canUseStorage()) {
      return;
    }

    window.localStorage.removeItem(RECOVERY_KEY);
  }
}

export const plannerSessionRecoveryStore = new PlannerSessionRecoveryStore();
