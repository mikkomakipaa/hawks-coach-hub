import type { DrillCatalogPage, DrillCatalogQuery, DrillDetail } from '@/types/drills';
import type { LoadState } from '@/state/request-state';
import {
  createIdleLoadState,
  failLoad,
  finishLoad,
  startLoad,
  toRecoverableError,
} from '@/state/request-state';

type DrillCatalogListener = (state: DrillCatalogViewState) => void;

export interface DrillCatalogViewState {
  query: DrillCatalogQuery;
  page: DrillCatalogPage | null;
  selectedDrillId: string | null;
  selectedDrill: DrillDetail | null;
  listState: LoadState;
  detailState: LoadState;
}

export class DrillCatalogState {
  private state: DrillCatalogViewState = {
    query: {},
    page: null,
    selectedDrillId: null,
    selectedDrill: null,
    listState: createIdleLoadState(),
    detailState: createIdleLoadState(),
  };

  private readonly listeners: DrillCatalogListener[] = [];

  getSnapshot(): DrillCatalogViewState {
    return this.state;
  }

  subscribe(listener: DrillCatalogListener): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  beginListLoad(query: DrillCatalogQuery): void {
    this.update({
      ...this.state,
      query,
      listState: startLoad(this.state.listState),
    });
  }

  completeListLoad(page: DrillCatalogPage): void {
    this.update({
      ...this.state,
      page,
      listState: finishLoad(this.state.listState),
    });
  }

  failListLoad(error: unknown): void {
    this.update({
      ...this.state,
      listState: failLoad(this.state.listState, toRecoverableError(error, 'drill-catalog:list')),
    });
  }

  beginDetailLoad(drillId: string): void {
    this.update({
      ...this.state,
      selectedDrillId: drillId,
      selectedDrill: null,
      detailState: startLoad(this.state.detailState),
    });
  }

  completeDetailLoad(detail: DrillDetail): void {
    this.update({
      ...this.state,
      selectedDrillId: detail.id,
      selectedDrill: detail,
      detailState: finishLoad(this.state.detailState),
    });
  }

  failDetailLoad(error: unknown): void {
    this.update({
      ...this.state,
      detailState: failLoad(this.state.detailState, toRecoverableError(error, 'drill-catalog:detail')),
    });
  }

  resetDetail(): void {
    this.update({
      ...this.state,
      selectedDrillId: null,
      selectedDrill: null,
      detailState: createIdleLoadState(),
    });
  }

  private update(nextState: DrillCatalogViewState): void {
    this.state = nextState;
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
