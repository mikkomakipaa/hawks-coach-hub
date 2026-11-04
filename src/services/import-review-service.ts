import { PlannerApiClient } from '@/services/planner-api-client';
import type { Drill } from '@/types/drills';
import type {
  CreateImportDraftInput,
  DrillImportDraft,
  DrillImportDraftPage,
  ImportApprovalInput,
  ImportDraftQuery,
  ImportReviewInput,
} from '@/types/imports';

export class ImportReviewService {
  constructor(private readonly client: PlannerApiClient = new PlannerApiClient()) {}

  async listDrafts(query: ImportDraftQuery = {}): Promise<DrillImportDraftPage> {
    return this.client.request<DrillImportDraftPage>('/api/editor/imports', {
      query: {
        reviewStatus: query.reviewStatus,
        sourceType: query.sourceType,
      },
    });
  }

  async getDraft(draftId: string): Promise<DrillImportDraft> {
    return this.client.request<DrillImportDraft>(`/api/editor/imports/${encodeURIComponent(draftId)}`);
  }

  async createDraft(input: CreateImportDraftInput): Promise<DrillImportDraft> {
    return this.client.request<DrillImportDraft>('/api/editor/imports', {
      method: 'POST',
      body: input,
    });
  }

  async reviewDraft(draftId: string, input: ImportReviewInput = {}): Promise<DrillImportDraft> {
    return this.client.request<DrillImportDraft>(`/api/editor/imports/${encodeURIComponent(draftId)}/review`, {
      method: 'POST',
      body: input,
    });
  }

  async rejectDraft(draftId: string, input: ImportReviewInput = {}): Promise<DrillImportDraft> {
    return this.client.request<DrillImportDraft>(`/api/editor/imports/${encodeURIComponent(draftId)}/reject`, {
      method: 'POST',
      body: input,
    });
  }

  async approveDraft(draftId: string, input: ImportApprovalInput = {}): Promise<Drill> {
    return this.client.request<Drill>(`/api/editor/imports/${encodeURIComponent(draftId)}/approve`, {
      method: 'POST',
      body: input,
    });
  }
}
