const { NotFoundError } = require('./errors');

function createInMemoryDrillRepository(seed = {}) {
  const drills = new Map();
  const attachments = new Map();

  for (const detail of seed.drills || []) {
    drills.set(detail.id, { ...detail, attachments: undefined });
    attachments.set(
      detail.id,
      (detail.attachments || []).map((attachment) => ({ ...attachment })),
    );
  }

  return {
    async listDrills() {
      return Array.from(drills.values()).map((drill) => withAttachments(drill, attachments));
    },

    async getDrillByIdOrSlug(idOrSlug) {
      const byId = drills.get(idOrSlug);
      if (byId) {
        return withAttachments(byId, attachments);
      }

      const bySlug = Array.from(drills.values()).find((drill) => drill.slug === idOrSlug);
      return bySlug ? withAttachments(bySlug, attachments) : null;
    },

    async createDrill(detail) {
      drills.set(detail.id, { ...detail, attachments: undefined });
      attachments.set(
        detail.id,
        detail.attachments.map((attachment) => ({ ...attachment })),
      );
      return withAttachments(detail, attachments);
    },

    async updateDrill(detail) {
      if (!drills.has(detail.id)) {
        throw new NotFoundError('Drill not found.');
      }

      drills.set(detail.id, { ...detail, attachments: undefined });
      attachments.set(
        detail.id,
        detail.attachments.map((attachment) => ({ ...attachment })),
      );
      return withAttachments(detail, attachments);
    },
  };
}

function withAttachments(drill, attachmentsByDrillId) {
  const drillAttachments = (attachmentsByDrillId.get(drill.id) || [])
    .map((attachment) => ({ ...attachment }))
    .sort((left, right) => left.sortOrder - right.sortOrder);

  return {
    ...drill,
    attachmentIds: drillAttachments.map((attachment) => attachment.id),
    attachments: drillAttachments,
  };
}

module.exports = {
  createInMemoryDrillRepository,
};
