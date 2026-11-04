const crypto = require('crypto');

const { NotFoundError } = require('../drills/errors');
const { createDrillService } = require('../drills/service');
const {
  assertImportStatusTransition,
  validateImportDraftInput,
  validateReviewInput,
} = require('./validation');

function createImportService({
  importRepository,
  drillRepository,
  now = () => new Date().toISOString(),
  createId = defaultCreateId,
} = {}) {
  const drillService = createDrillService({
    repository: drillRepository,
    now,
    createId,
  });

  return {
    async listImportDrafts(filters = {}) {
      const drafts = await importRepository.listImportDrafts();
      const reviewStatus = typeof filters.reviewStatus === 'string' ? filters.reviewStatus : undefined;
      const sourceType = typeof filters.sourceType === 'string' ? filters.sourceType : undefined;

      const items = drafts
        .filter((draft) => {
          if (reviewStatus && draft.reviewStatus !== reviewStatus) {
            return false;
          }
          if (sourceType && draft.sourceType !== sourceType) {
            return false;
          }
          return true;
        })
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

      return {
        items,
        total: items.length,
        filters: {
          reviewStatus,
          sourceType,
        },
      };
    },

    async getImportDraft(id) {
      const draft = await importRepository.getImportDraftById(id);
      if (!draft) {
        throw new NotFoundError('Import draft not found.');
      }

      return draft;
    },

    async createImportDraft(input) {
      const normalized = validateImportDraftInput(input, 'create');
      const timestamp = now();
      const draft = {
        id: createId('import_draft'),
        sourceType: normalized.sourceType,
        sourceFileId: normalized.sourceFileId,
        sourceFileName: normalized.sourceFileName,
        extractedTitle: normalized.extractedTitle,
        extractedText: normalized.extractedText,
        extractedFields: normalized.extractedFields || {},
        confidence: normalized.confidence || 'medium',
        reviewStatus: 'pending',
        convertedDrillId: undefined,
        reviewedByUserId: undefined,
        reviewNotes: undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      return importRepository.createImportDraft(draft);
    },

    async reviewImportDraft(id, input, actor) {
      const existing = await this.getImportDraft(id);
      assertImportStatusTransition(existing.reviewStatus, 'reviewed');
      const normalized = validateReviewInput(input);
      const timestamp = now();

      return importRepository.updateImportDraft({
        ...existing,
        reviewStatus: 'reviewed',
        reviewedByUserId: actor.userId,
        reviewNotes: normalized.reviewNotes !== undefined ? normalized.reviewNotes : existing.reviewNotes,
        updatedAt: timestamp,
      });
    },

    async rejectImportDraft(id, input, actor) {
      const existing = await this.getImportDraft(id);
      assertImportStatusTransition(existing.reviewStatus, 'rejected');
      const normalized = validateReviewInput(input);
      const timestamp = now();

      return importRepository.updateImportDraft({
        ...existing,
        reviewStatus: 'rejected',
        reviewedByUserId: actor.userId,
        reviewNotes: normalized.reviewNotes !== undefined ? normalized.reviewNotes : existing.reviewNotes,
        updatedAt: timestamp,
      });
    },

    async approveImportDraft(id, input, actor) {
      const existing = await this.getImportDraft(id);
      assertImportStatusTransition(existing.reviewStatus, 'converted');
      const normalizedReview = validateReviewInput(input);
      const drillInput = normalizeDrillPayload(existing, input?.drill);
      const createdDrill = await drillService.createDrill(drillInput, actor);
      const timestamp = now();

      await importRepository.updateImportDraft({
        ...existing,
        reviewStatus: 'converted',
        convertedDrillId: createdDrill.id,
        reviewedByUserId: actor.userId,
        reviewNotes: normalizedReview.reviewNotes !== undefined ? normalizedReview.reviewNotes : existing.reviewNotes,
        updatedAt: timestamp,
      });

      return createdDrill;
    },
  };
}

function normalizeDrillPayload(draft, override = {}) {
  const extractedFields = draft.extractedFields || {};
  const title = override.title || extractedFields.title || draft.extractedTitle || draft.sourceFileName;
  const summary = override.summary || extractedFields.summary || 'Imported drill draft';
  const description = override.description || extractedFields.description || draft.extractedText || summary;
  const category = override.category || extractedFields.category || 'imported';

  return {
    ...extractedFields,
    ...override,
    title,
    summary,
    description,
    category,
    sourceType: draft.sourceType === 'pdf' ? 'pdf-import' : 'drive-import',
    sourceFileId: override.sourceFileId || draft.sourceFileId || extractedFields.sourceFileId,
    attachments: Array.isArray(override.attachments)
      ? override.attachments
      : Array.isArray(extractedFields.attachments)
        ? extractedFields.attachments
        : [],
  };
}

function defaultCreateId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

module.exports = {
  createImportService,
};
