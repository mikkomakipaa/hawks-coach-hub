const { NotFoundError } = require('../drills/errors');

function createInMemoryImportDraftRepository(seed = {}) {
  const drafts = new Map();

  for (const draft of seed.importDrafts || []) {
    drafts.set(draft.id, { ...draft, extractedFields: { ...(draft.extractedFields || {}) } });
  }

  return {
    async listImportDrafts() {
      return Array.from(drafts.values()).map(cloneDraft);
    },

    async getImportDraftById(id) {
      return drafts.has(id) ? cloneDraft(drafts.get(id)) : null;
    },

    async createImportDraft(draft) {
      drafts.set(draft.id, cloneDraft(draft));
      return cloneDraft(draft);
    },

    async updateImportDraft(draft) {
      if (!drafts.has(draft.id)) {
        throw new NotFoundError('Import draft not found.');
      }

      drafts.set(draft.id, cloneDraft(draft));
      return cloneDraft(draft);
    },
  };
}

function cloneDraft(draft) {
  return {
    ...draft,
    extractedFields: { ...(draft.extractedFields || {}) },
  };
}

module.exports = {
  createInMemoryImportDraftRepository,
};
