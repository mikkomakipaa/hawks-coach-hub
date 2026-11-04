const { enforceMethod } = require('../../_lib/planner/http');
const { createSessionRuntime } = require('../../_lib/planner/runtime');

const runtime = createSessionRuntime();

module.exports = async function handler(req, res) {
  if (!enforceMethod(req, res, ['POST'])) {
    return;
  }

  return runtime.handlers.shareSession(req, res);
};
