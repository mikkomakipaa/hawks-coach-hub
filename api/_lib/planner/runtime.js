const { createOptionalAirtablePlannerProfileRepository } = require('../auth/airtable');
const { createPlannerAuth } = require('../auth/service');
const { createAirtableSessionRepository } = require('./airtable');
const { createSessionHttpHandlers, withErrorHandling } = require('./http');
const { createSessionService } = require('./service');

function createSessionRuntime(options = {}) {
  const repository = options.repository || createAirtableSessionRepository(options.airtable);
  const auth = options.auth || createPlannerAuth({
    profileRepository: options.profileRepository || createOptionalAirtablePlannerProfileRepository(options.airtable || {}),
    now: options.now,
  });
  const service = createSessionService({
    repository,
    now: options.now,
    createId: options.createId,
    createShareId: options.createShareId,
  });

  const handlers = createSessionHttpHandlers({ service, auth });

  return {
    service,
    handlers: {
      listSessions: withErrorHandling(handlers.listSessions),
      getSession: withErrorHandling(handlers.getSession),
      createSession: withErrorHandling(handlers.createSession),
      updateSession: withErrorHandling(handlers.updateSession),
      shareSession: withErrorHandling(handlers.shareSession),
      getSharedSession: withErrorHandling(handlers.getSharedSession),
    },
  };
}

module.exports = {
  createSessionRuntime,
};
