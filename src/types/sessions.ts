export type SessionStatus = 'draft' | 'published' | 'archived';

export type SessionVisibility = 'private' | 'shared';

export type SessionBlockType = 'warmup' | 'drill' | 'break' | 'game' | 'cooldown' | 'custom';

export interface SessionBlock {
  id: string;
  order: number;
  type: SessionBlockType;
  title: string;
  durationMin: number;
  drillId?: string;
  notes: string;
  attachmentIds?: string[];
}

export interface Session {
  id: string;
  name: string;
  group: string;
  date: string;
  ownerUserId: string;
  coachLabel: string;
  targetDurationMin?: number;
  totalDurationMin?: number;
  status: SessionStatus;
  visibility: SessionVisibility;
  shareId?: string;
  blocks: SessionBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface SessionSummary {
  id: string;
  name: string;
  group: string;
  date: string;
  ownerUserId: string;
  coachLabel: string;
  targetDurationMin?: number;
  totalDurationMin?: number;
  status: SessionStatus;
  visibility: SessionVisibility;
  shareId?: string;
  blockCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SessionListResponse {
  items: SessionSummary[];
  total: number;
}

export interface SessionShareResult {
  sessionId: string;
  shareId: string;
  visibility: 'shared';
  shareUrl: string;
  updatedAt: string;
}

export interface SharedSessionView {
  shareId: string;
  sessionId: string;
  session: Session;
  canView: boolean;
}

export interface SharedSessionQuery {
  shareId: string;
}

export interface CreateSessionInput {
  name: string;
  group: string;
  date: string;
  coachLabel?: string;
  targetDurationMin?: number;
  totalDurationMin?: number;
  visibility?: SessionVisibility;
  blocks?: Array<{
    id?: string;
    order?: number;
    type: SessionBlockType;
    title: string;
    durationMin: number;
    drillId?: string;
    notes?: string;
    attachmentIds?: string[];
  }>;
}

export interface UpdateSessionInput {
  name?: string;
  group?: string;
  date?: string;
  coachLabel?: string;
  targetDurationMin?: number;
  totalDurationMin?: number;
  status?: SessionStatus;
  visibility?: SessionVisibility;
  blocks?: Array<{
    id?: string;
    order?: number;
    type: SessionBlockType;
    title: string;
    durationMin: number;
    drillId?: string;
    notes?: string;
    attachmentIds?: string[];
  }>;
}
