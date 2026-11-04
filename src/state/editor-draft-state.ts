import type { DrillDetail } from '@/types/drills';
import type { DrillImportDraft, DrillImportDraftPage } from '@/types/imports';
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

type EditorDraftListener = (state: EditorDraftViewState) => void;

export interface EditorDraftViewState {
  currentDrill: DrillDetail | null;
  importPage: DrillImportDraftPage | null;
  selectedImportDraft: DrillImportDraft | null;
  drillLoadState: LoadState;
  importLoadState: LoadState;
  saveState: SaveState;
  publishState: SaveState;
  importActionState: SaveState;
  validationErrors: Record<string, string>;
}

export class EditorDraftState {
  private state: EditorDraftViewState = {
    currentDrill: null,
    importPage: null,
    selectedImportDraft: null,
    drillLoadState: createIdleLoadState(),
    importLoadState: createIdleLoadState(),
    saveState: createIdleSaveState(),
    publishState: createIdleSaveState(),
    importActionState: createIdleSaveState(),
    validationErrors: {},
  };

  private readonly listeners: EditorDraftListener[] = [];

  getSnapshot(): EditorDraftViewState {
    return this.state;
  }

  subscribe(listener: EditorDraftListener): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  beginDrillLoad(): void {
    this.update({
      ...this.state,
      drillLoadState: startLoad(this.state.drillLoadState),
    });
  }

  completeDrillLoad(drill: DrillDetail): void {
    this.update({
      ...this.state,
      currentDrill: drill,
      drillLoadState: finishLoad(this.state.drillLoadState),
    });
  }

  failDrillLoad(error: unknown): void {
    this.update({
      ...this.state,
      currentDrill: null,
      drillLoadState: failLoad(this.state.drillLoadState, toRecoverableError(error, 'editor-draft:drill-load')),
    });
  }

  beginImportLoad(): void {
    this.update({
      ...this.state,
      importLoadState: startLoad(this.state.importLoadState),
    });
  }

  completeImportListLoad(page: DrillImportDraftPage): void {
    const selectedImportDraft = this.state.selectedImportDraft && page.items.some(item => item.id === this.state.selectedImportDraft?.id)
      ? this.state.selectedImportDraft
      : null;

    this.update({
      ...this.state,
      importPage: page,
      selectedImportDraft,
      importLoadState: finishLoad(this.state.importLoadState),
    });
  }

  completeImportDetailLoad(draft: DrillImportDraft): void {
    this.update({
      ...this.state,
      selectedImportDraft: draft,
      importLoadState: finishLoad(this.state.importLoadState),
    });
  }

  failImportLoad(error: unknown): void {
    this.update({
      ...this.state,
      importLoadState: failLoad(this.state.importLoadState, toRecoverableError(error, 'editor-draft:import-load')),
    });
  }

  beginSave(): void {
    this.update({
      ...this.state,
      saveState: startSave(this.state.saveState),
    });
  }

  completeSave(drill: DrillDetail): void {
    this.update({
      ...this.state,
      currentDrill: drill,
      validationErrors: {},
      saveState: finishSave(this.state.saveState),
    });
  }

  failSave(error: unknown): void {
    this.update({
      ...this.state,
      saveState: failSave(this.state.saveState, toRecoverableError(error, 'editor-draft:save')),
    });
  }

  beginPublish(): void {
    this.update({
      ...this.state,
      publishState: startSave(this.state.publishState),
    });
  }

  completePublish(drill: DrillDetail): void {
    this.update({
      ...this.state,
      currentDrill: drill,
      validationErrors: {},
      publishState: finishSave(this.state.publishState),
    });
  }

  failPublish(error: unknown): void {
    this.update({
      ...this.state,
      publishState: failSave(this.state.publishState, toRecoverableError(error, 'editor-draft:publish')),
    });
  }

  beginImportAction(): void {
    this.update({
      ...this.state,
      importActionState: startSave(this.state.importActionState),
    });
  }

  completeImportAction(draft: DrillImportDraft): void {
    this.update({
      ...this.state,
      selectedImportDraft: draft,
      importActionState: finishSave(this.state.importActionState),
    });
  }

  failImportAction(error: unknown): void {
    this.update({
      ...this.state,
      importActionState: failSave(this.state.importActionState, toRecoverableError(error, 'editor-draft:import-action')),
    });
  }

  clearSelectedImportDraft(): void {
    this.update({
      ...this.state,
      selectedImportDraft: null,
    });
  }

  setValidationErrors(errors: Record<string, string>): void {
    this.update({
      ...this.state,
      validationErrors: { ...errors },
    });
  }

  clearValidationErrors(): void {
    this.update({
      ...this.state,
      validationErrors: {},
    });
  }

  private update(nextState: EditorDraftViewState): void {
    this.state = nextState;
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
