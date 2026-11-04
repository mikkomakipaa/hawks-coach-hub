const { enforceMethod } = require('../../../_lib/drills/http');
const { createDrillRuntime } = require('../../../_lib/drills/runtime');

const runtime = createDrillRuntime();

module.exports = async function handler(req, res) {
  if (!enforceMethod(req, res, ['POST'])) {
    return;
  }

  return runtime.handlers.publishDrill(req, res);
};
