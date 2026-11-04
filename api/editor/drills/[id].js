const { enforceMethod } = require('../../_lib/drills/http');
const { createDrillRuntime } = require('../../_lib/drills/runtime');

const runtime = createDrillRuntime();

module.exports = async function handler(req, res) {
  if (!enforceMethod(req, res, ['PATCH'])) {
    return;
  }

  return runtime.handlers.updateDrill(req, res);
};
