const { enforceMethod } = require('../_lib/planner/http');
const { createPlannerProfileRuntime } = require('../_lib/planner/profile-runtime');

const runtime = createPlannerProfileRuntime();

module.exports = async function handler(req, res) {
  if (!enforceMethod(req, res, ['GET'])) {
    return;
  }

  return runtime.handlers.getMe(req, res);
};
