const { createOptionalAirtablePlannerProfileRepository } = require('../auth/airtable');
const { createPlannerAuth } = require('../auth/service');
const { createAirtableDrillRepository } = require('../drills/airtable');
const { createAirtableImportDraftRepository } = require('./airtable');
const { createImportHttpHandlers, withErrorHandling } = require('./http');
const { createImportService } = require('./service');

function createImportRuntime(options = {}) {
  const importRepository = options.importRepository || createAirtableImportDraftRepository(options.airtable);
  const drillRepository = options.drillRepository || createAirtableDrillRepository(options.airtable);
  const auth = options.auth || createPlannerAuth({
    profileRepository: options.profileRepository || createOptionalAirtablePlannerProfileRepository(options.airtable || {}),
    now: options.now,
  });

  const service = createImportService({
    importRepository,
    drillRepository,
    now: options.now,
    createId: options.createId,
  });

  const handlers = createImportHttpHandlers({ service, auth });

  return {
    service,
    handlers: {
      listImportDrafts: withErrorHandling(handlers.listImportDrafts),
      getImportDraft: withErrorHandling(handlers.getImportDraft),
      createImportDraft: withErrorHandling(handlers.createImportDraft),
      reviewImportDraft: withErrorHandling(handlers.reviewImportDraft),
      rejectImportDraft: withErrorHandling(handlers.rejectImportDraft),
      approveImportDraft: withErrorHandling(handlers.approveImportDraft),
    },
  };
}

module.exports = {
  createImportRuntime,
};
