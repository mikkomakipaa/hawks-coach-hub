import { isPlannerApiError } from '@/services/planner-api-client';
import type { PlannerApiErrorDetail } from '@/types/planner';

export type LoadStatus = 'idle' | 'loading' | 'success' | 'error';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface RecoverableError {
  scope: string;
  code: string;
  message: string;
  details: PlannerApiErrorDetail[];
  retryable: boolean;
  timestamp: string;
}

export interface LoadState {
  status: LoadStatus;
  error: RecoverableError | null;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
}

export interface SaveState {
  status: SaveStatus;
  error: RecoverableError | null;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
}

export function createIdleLoadState(): LoadState {
  return {
    status: 'idle',
    error: null,
    lastStartedAt: null,
    lastFinishedAt: null,
  };
}

export function createIdleSaveState(): SaveState {
  return {
    status: 'idle',
    error: null,
    lastStartedAt: null,
    lastFinishedAt: null,
  };
}

export function startLoad(state: LoadState, at: string = new Date().toISOString()): LoadState {
  return {
    ...state,
    status: 'loading',
    error: null,
    lastStartedAt: at,
  };
}

export function finishLoad(state: LoadState, at: string = new Date().toISOString()): LoadState {
  return {
    ...state,
    status: 'success',
    error: null,
    lastFinishedAt: at,
  };
}

export function failLoad(state: LoadState, error: RecoverableError, at: string = new Date().toISOString()): LoadState {
  return {
    ...state,
    status: 'error',
    error,
    lastFinishedAt: at,
  };
}

export function startSave(state: SaveState, at: string = new Date().toISOString()): SaveState {
  return {
    ...state,
    status: 'saving',
    error: null,
    lastStartedAt: at,
  };
}

export function finishSave(state: SaveState, at: string = new Date().toISOString()): SaveState {
  return {
    ...state,
    status: 'saved',
    error: null,
    lastFinishedAt: at,
  };
}

export function failSave(state: SaveState, error: RecoverableError, at: string = new Date().toISOString()): SaveState {
  return {
    ...state,
    status: 'error',
    error,
    lastFinishedAt: at,
  };
}

export function toRecoverableError(error: unknown, scope: string, at: string = new Date().toISOString()): RecoverableError {
  if (isPlannerApiError(error)) {
    return {
      scope,
      code: error.code,
      message: error.message,
      details: error.details,
      retryable: error.retryable,
      timestamp: at,
    };
  }

  const message = error instanceof Error ? error.message : 'Unexpected error.';

  return {
    scope,
    code: 'UNKNOWN_ERROR',
    message,
    details: [],
    retryable: true,
    timestamp: at,
  };
}
