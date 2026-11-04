const { enforceMethod } = require('../_lib/drills/http');
const { createDrillRuntime } = require('../_lib/drills/runtime');

const runtime = createDrillRuntime();

module.exports = async function handler(req, res) {
  if (!enforceMethod(req, res, ['GET'])) {
    return;
  }

  return runtime.handlers.listDrills(req, res);
};
