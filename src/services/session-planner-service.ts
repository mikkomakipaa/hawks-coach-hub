import { PlannerApiClient } from '@/services/planner-api-client';
import type {
  CreateSessionInput,
  Session,
  SessionListResponse,
  SessionShareResult,
  SharedSessionView,
  UpdateSessionInput,
} from '@/types/sessions';

export class SessionPlannerService {
  constructor(private readonly client: PlannerApiClient = new PlannerApiClient()) {}

  async listSessions(): Promise<SessionListResponse> {
    return this.client.request<SessionListResponse>('/api/sessions');
  }

  async getSession(sessionId: string): Promise<Session> {
    return this.client.request<Session>(`/api/sessions/${encodeURIComponent(sessionId)}`);
  }

  async createSession(input: CreateSessionInput): Promise<Session> {
    return this.client.request<Session>('/api/sessions', {
      method: 'POST',
      body: input,
    });
  }

  async updateSession(sessionId: string, input: UpdateSessionInput): Promise<Session> {
    return this.client.request<Session>(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'PATCH',
      body: input,
    });
  }

  async createShareLink(sessionId: string): Promise<SessionShareResult> {
    return this.client.request<SessionShareResult>(`/api/sessions/${encodeURIComponent(sessionId)}/share`, {
      method: 'POST',
    });
  }

  async getSharedSession(shareId: string): Promise<SharedSessionView> {
    return this.client.request<SharedSessionView>(`/api/shared-sessions/${encodeURIComponent(shareId)}`);
  }
}
