import type { LoadState } from '@/state/request-state';
import { createIdleLoadState, failLoad, finishLoad, startLoad, toRecoverableError } from '@/state/request-state';
import type { PlannerPermissions, PlannerProfile } from '@/types/planner';

type PlannerAccessListener = (state: PlannerAccessViewState) => void;

export interface PlannerAccessViewState {
  profile: PlannerProfile | null;
  permissions: PlannerPermissions | null;
  loadState: LoadState;
}

export class PlannerAccessState {
  private state: PlannerAccessViewState = {
    profile: null,
    permissions: null,
    loadState: createIdleLoadState(),
  };

  private readonly listeners: PlannerAccessListener[] = [];

  getSnapshot(): PlannerAccessViewState {
    return this.state;
  }

  subscribe(listener: PlannerAccessListener): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  beginLoad(): void {
    this.update({
      ...this.state,
      loadState: startLoad(this.state.loadState),
    });
  }

  completeLoad(profile: PlannerProfile, permissions: PlannerPermissions): void {
    this.update({
      profile,
      permissions,
      loadState: finishLoad(this.state.loadState),
    });
  }

  failLoad(error: unknown): void {
    this.update({
      ...this.state,
      loadState: failLoad(this.state.loadState, toRecoverableError(error, 'planner-access:load')),
    });
  }

  clear(): void {
    this.update({
      profile: null,
      permissions: null,
      loadState: createIdleLoadState(),
    });
  }

  private update(nextState: PlannerAccessViewState): void {
    this.state = nextState;
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
