import type { CreateDrillInput, Drill } from '@/types/drills';

export type DrillImportSourceType = 'pdf' | 'drive-file';
export type DrillImportConfidence = 'high' | 'medium' | 'low';
export type DrillImportReviewStatus = 'pending' | 'reviewed' | 'rejected' | 'converted';

export interface DrillImportDraft {
  id: string;
  sourceType: DrillImportSourceType;
  sourceFileId?: string;
  sourceFileName?: string;
  extractedTitle?: string;
  extractedText?: string;
  extractedFields: Record<string, unknown>;
  confidence: DrillImportConfidence;
  reviewStatus: DrillImportReviewStatus;
  convertedDrillId?: string;
  reviewedByUserId?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DrillImportDraftPage {
  items: DrillImportDraft[];
  total: number;
  filters: {
    reviewStatus?: DrillImportReviewStatus;
    sourceType?: DrillImportSourceType;
  };
}

export interface CreateImportDraftInput {
  sourceType: DrillImportSourceType;
  sourceFileId?: string;
  sourceFileName?: string;
  extractedTitle?: string;
  extractedText?: string;
  extractedFields?: Record<string, unknown>;
  confidence?: DrillImportConfidence;
}

export interface ImportDraftQuery {
  reviewStatus?: DrillImportReviewStatus;
  sourceType?: DrillImportSourceType;
}

export interface ImportReviewInput {
  reviewNotes?: string;
}

export interface ImportApprovalInput extends ImportReviewInput {
  drill?: Partial<CreateDrillInput>;
}

export interface ImportApprovalResult {
  draft: DrillImportDraft;
  drill: Drill;
}
