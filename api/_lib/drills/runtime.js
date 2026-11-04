const { createOptionalAirtablePlannerProfileRepository } = require('../auth/airtable');
const { createPlannerAuth } = require('../auth/service');
const { createAirtableDrillRepository } = require('./airtable');
const { createHttpHandlers, withErrorHandling } = require('./http');
const { createDrillService } = require('./service');

function createDrillRuntime(options = {}) {
  const repository = options.repository || createAirtableDrillRepository(options.airtable);
  const auth = options.auth || createPlannerAuth({
    profileRepository: options.profileRepository || createOptionalAirtablePlannerProfileRepository(options.airtable || {}),
    now: options.now,
  });
  const service = createDrillService({
    repository,
    now: options.now,
    createId: options.createId,
  });

  const handlers = createHttpHandlers({ service, auth });

  return {
    service,
    handlers: {
      listDrills: withErrorHandling(handlers.listDrills),
      getDrill: withErrorHandling(handlers.getDrill),
      createDrill: withErrorHandling(handlers.createDrill),
      updateDrill: withErrorHandling(handlers.updateDrill),
      publishDrill: withErrorHandling(handlers.publishDrill),
    },
  };
}

module.exports = {
  createDrillRuntime,
};
