import type { Session, SessionShareResult, SessionSummary } from '@/types/sessions';
import type { LoadState, SaveState } from '@/state/request-state';
import {
  createIdleLoadState,
  createIdleSaveState,
  failLoad,
  failSave,
  finishLoad,
  finishSave,
  startLoad,
  startSave,
  toRecoverableError,
} from '@/state/request-state';

type PlannerSessionListener = (state: PlannerSessionViewState) => void;

export interface PlannerSessionViewState {
  sessions: SessionSummary[];
  currentSession: Session | null;
  listState: LoadState;
  detailState: LoadState;
  saveState: SaveState;
  shareState: SaveState;
  dirty: boolean;
}

export class PlannerSessionState {
  private state: PlannerSessionViewState = {
    sessions: [],
    currentSession: null,
    listState: createIdleLoadState(),
    detailState: createIdleLoadState(),
    saveState: createIdleSaveState(),
    shareState: createIdleSaveState(),
    dirty: false,
  };

  private readonly listeners: PlannerSessionListener[] = [];

  getSnapshot(): PlannerSessionViewState {
    return this.state;
  }

  subscribe(listener: PlannerSessionListener): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  beginListLoad(): void {
    this.update({
      ...this.state,
      listState: startLoad(this.state.listState),
    });
  }

  completeListLoad(sessions: SessionSummary[]): void {
    this.update({
      ...this.state,
      sessions,
      listState: finishLoad(this.state.listState),
    });
  }

  failListLoad(error: unknown): void {
    this.update({
      ...this.state,
      listState: failLoad(this.state.listState, toRecoverableError(error, 'planner-session:list')),
    });
  }

  beginSessionLoad(): void {
    this.update({
      ...this.state,
      detailState: startLoad(this.state.detailState),
    });
  }

  completeSessionLoad(session: Session): void {
    this.update({
      ...this.state,
      currentSession: session,
      dirty: false,
      detailState: finishLoad(this.state.detailState),
    });
  }

  failSessionLoad(error: unknown): void {
    this.update({
      ...this.state,
      detailState: failLoad(this.state.detailState, toRecoverableError(error, 'planner-session:detail')),
    });
  }

  markDirty(currentSession: Session): void {
    this.update({
      ...this.state,
      currentSession,
      dirty: true,
    });
  }

  beginSave(): void {
    this.update({
      ...this.state,
      saveState: startSave(this.state.saveState),
    });
  }

  completeSave(session: Session): void {
    this.update({
      ...this.state,
      currentSession: session,
      dirty: false,
      saveState: finishSave(this.state.saveState),
    });
  }

  failSave(error: unknown): void {
    this.update({
      ...this.state,
      saveState: failSave(this.state.saveState, toRecoverableError(error, 'planner-session:save')),
    });
  }

  beginShare(): void {
    this.update({
      ...this.state,
      shareState: startSave(this.state.shareState),
    });
  }

  completeShare(result: SessionShareResult): void {
    const currentSession = this.state.currentSession
      ? {
          ...this.state.currentSession,
          visibility: result.visibility,
          shareId: result.shareId,
        }
      : null;

    this.update({
      ...this.state,
      currentSession,
      shareState: finishSave(this.state.shareState),
    });
  }

  failShare(error: unknown): void {
    this.update({
      ...this.state,
      shareState: failSave(this.state.shareState, toRecoverableError(error, 'planner-session:share')),
    });
  }

  resetCurrentSession(): void {
    this.update({
      ...this.state,
      currentSession: null,
      detailState: createIdleLoadState(),
      saveState: createIdleSaveState(),
      shareState: createIdleSaveState(),
      dirty: false,
    });
  }

  private update(nextState: PlannerSessionViewState): void {
    this.state = nextState;
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
