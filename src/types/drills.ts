export type DrillStatus = 'draft' | 'published' | 'archived';

export type DrillIntensityLevel = 'low' | 'medium' | 'high';

export type DrillSourceType = 'native' | 'pdf-import' | 'drive-import';

export type DrillAttachmentType = 'image' | 'pdf' | 'drive-file' | 'link';

export interface DrillAttachment {
  id: string;
  drillId: string;
  type: DrillAttachmentType;
  title: string;
  url: string;
  sourceFileId?: string;
  sortOrder: number;
  mimeType?: string;
  thumbnailUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Drill {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  intensityLevel?: DrillIntensityLevel;
  ageGroups: string[];
  skillTags: string[];
  durationMin?: number;
  playerCountMin?: number;
  playerCountMax?: number;
  equipment: string[];
  coachingPoints: string[];
  setupInstructions?: string;
  progressionIdeas: string[];
  variationIdeas: string[];
  status: DrillStatus;
  sourceType: DrillSourceType;
  sourceFileId?: string;
  primaryImageUrl?: string;
  attachmentIds: string[];
  publishedAt?: string;
  createdByUserId?: string;
  updatedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DrillDetail extends Drill {
  attachments: DrillAttachment[];
}

export interface DrillCatalogPage {
  items: Drill[];
  total: number;
  filters: {
    category?: string;
    query?: string;
    status?: DrillStatus;
  };
}

export interface DrillCatalogQuery {
  category?: string;
  query?: string;
  status?: DrillStatus;
  includeDrafts?: boolean;
}

export interface DrillAttachmentInput {
  id?: string;
  type: DrillAttachmentType;
  title: string;
  url: string;
  sourceFileId?: string;
  sortOrder?: number;
  mimeType?: string;
  thumbnailUrl?: string;
}

export interface CreateDrillInput {
  slug?: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  intensityLevel?: DrillIntensityLevel;
  ageGroups?: string[];
  skillTags?: string[];
  durationMin?: number;
  playerCountMin?: number;
  playerCountMax?: number;
  equipment?: string[];
  coachingPoints?: string[];
  setupInstructions?: string;
  progressionIdeas?: string[];
  variationIdeas?: string[];
  sourceType: DrillSourceType;
  sourceFileId?: string;
  primaryImageUrl?: string;
  attachments?: DrillAttachmentInput[];
}

export interface UpdateDrillInput {
  slug?: string;
  title?: string;
  summary?: string;
  description?: string;
  category?: string;
  intensityLevel?: DrillIntensityLevel;
  ageGroups?: string[];
  skillTags?: string[];
  durationMin?: number;
  playerCountMin?: number;
  playerCountMax?: number;
  equipment?: string[];
  coachingPoints?: string[];
  setupInstructions?: string;
  progressionIdeas?: string[];
  variationIdeas?: string[];
  status?: DrillStatus;
  sourceType?: DrillSourceType;
  sourceFileId?: string;
  primaryImageUrl?: string;
  attachments?: DrillAttachmentInput[];
}
