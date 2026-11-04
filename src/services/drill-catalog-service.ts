import { PlannerApiClient } from '@/services/planner-api-client';
import type {
  CreateDrillInput,
  DrillCatalogPage,
  DrillCatalogQuery,
  DrillDetail,
  UpdateDrillInput,
} from '@/types/drills';

export class DrillCatalogService {
  constructor(private readonly client: PlannerApiClient = new PlannerApiClient()) {}

  async listDrills(query: DrillCatalogQuery = {}): Promise<DrillCatalogPage> {
    return this.client.request<DrillCatalogPage>('/api/drills', {
      query: {
        category: query.category,
        query: query.query,
        status: query.status,
        includeDrafts: query.includeDrafts,
      },
    });
  }

  async getDrill(drillIdOrSlug: string, includeDrafts: boolean = false): Promise<DrillDetail> {
    return this.client.request<DrillDetail>(`/api/drills/${encodeURIComponent(drillIdOrSlug)}`, {
      query: {
        includeDrafts,
      },
    });
  }
}

export class EditorDrillService {
  constructor(private readonly client: PlannerApiClient = new PlannerApiClient()) {}

  async getDraft(drillIdOrSlug: string): Promise<DrillDetail> {
    return this.client.request<DrillDetail>(`/api/drills/${encodeURIComponent(drillIdOrSlug)}`, {
      query: {
        includeDrafts: true,
      },
    });
  }

  async createDraft(input: CreateDrillInput): Promise<DrillDetail> {
    return this.client.request<DrillDetail>('/api/editor/drills', {
      method: 'POST',
      body: input,
    });
  }

  async updateDraft(drillId: string, input: UpdateDrillInput): Promise<DrillDetail> {
    return this.client.request<DrillDetail>(`/api/editor/drills/${encodeURIComponent(drillId)}`, {
      method: 'PATCH',
      body: input,
    });
  }

  async publishDrill(drillId: string): Promise<DrillDetail> {
    return this.client.request<DrillDetail>(`/api/editor/drills/${encodeURIComponent(drillId)}/publish`, {
      method: 'POST',
    });
  }
}
