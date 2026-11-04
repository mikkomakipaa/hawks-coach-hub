const crypto = require('crypto');

const {
  ConflictError,
  NotFoundError,
} = require('./errors');
const {
  assertAllowedStatusTransition,
  assertPublishable,
  validateDrillInput,
} = require('./validation');

function createDrillService({ repository, now = () => new Date().toISOString(), createId = defaultCreateId }) {
  return {
    async listDrills(filters = {}) {
      const drills = await repository.listDrills();
      const includeDrafts = Boolean(filters.includeDrafts);
      const query = typeof filters.query === 'string' ? filters.query.trim().toLowerCase() : '';
      const category = typeof filters.category === 'string' ? filters.category.trim().toLowerCase() : '';
      const requestedStatus = typeof filters.status === 'string' ? filters.status : undefined;

      const items = drills
        .filter((drill) => {
          if (!includeDrafts && drill.status !== 'published') {
            return false;
          }
          if (requestedStatus && drill.status !== requestedStatus) {
            return false;
          }
          if (category && drill.category.toLowerCase() !== category) {
            return false;
          }
          if (!query) {
            return true;
          }

          const haystack = [
            drill.title,
            drill.summary,
            drill.description,
            drill.category,
            ...(drill.skillTags || []),
            ...(drill.coachingPoints || []),
          ].join(' ').toLowerCase();

          return haystack.includes(query);
        })
        .sort((left, right) => {
          if (left.status === right.status) {
            return right.updatedAt.localeCompare(left.updatedAt);
          }

          return left.status === 'published' ? -1 : 1;
        })
        .map(stripAttachments);

      return {
        items,
        total: items.length,
        filters: {
          category: filters.category,
          query: filters.query,
          status: requestedStatus,
        },
      };
    },

    async getDrill(idOrSlug, options = {}) {
      const detail = await repository.getDrillByIdOrSlug(idOrSlug);
      if (!detail) {
        throw new NotFoundError('Drill not found.');
      }

      if (!options.includeDrafts && detail.status !== 'published') {
        throw new NotFoundError('Drill not found.');
      }

      return detail;
    },

    async createDrill(input, actor = {}) {
      const normalized = validateDrillInput(input, 'create');
      const timestamp = now();
      const drillId = createId('drill');
      const slug = normalized.slug || slugify(normalized.title);

      const detail = buildDetail({
        ...normalized,
        id: drillId,
        slug,
        status: 'draft',
        createdByUserId: actor.userId,
        updatedByUserId: actor.userId,
        createdAt: timestamp,
        updatedAt: timestamp,
        publishedAt: undefined,
      }, normalized.attachments || [], createId, timestamp);

      return repository.createDrill(detail);
    },

    async updateDrill(id, input, actor = {}) {
      const existing = await repository.getDrillByIdOrSlug(id);
      if (!existing) {
        throw new NotFoundError('Drill not found.');
      }

      const normalized = validateDrillInput(input, 'update');
      assertAllowedStatusTransition(existing.status, normalized.status);

      if (normalized.sourceType && existing.status === 'published' && normalized.sourceType !== existing.sourceType) {
        throw new ConflictError('Published drill sourceType cannot be changed.');
      }

      const nextStatus = normalized.status || existing.status;
      const nextTitle = normalized.title || existing.title;
      const nextSlug = normalized.slug || existing.slug || slugify(nextTitle);
      const timestamp = now();

      const detail = buildDetail({
        ...existing,
        ...normalized,
        id: existing.id,
        slug: nextSlug,
        title: nextTitle,
        status: nextStatus,
        createdAt: existing.createdAt,
        createdByUserId: existing.createdByUserId,
        updatedByUserId: actor.userId || existing.updatedByUserId,
        updatedAt: timestamp,
        publishedAt: nextStatus === 'published' ? existing.publishedAt : undefined,
      }, normalized.attachments !== undefined ? normalized.attachments : existing.attachments, createId, timestamp);

      return repository.updateDrill(detail);
    },

    async publishDrill(id, actor = {}) {
      const existing = await repository.getDrillByIdOrSlug(id);
      if (!existing) {
        throw new NotFoundError('Drill not found.');
      }

      assertPublishable(existing);

      if (existing.status === 'published') {
        return existing;
      }

      const timestamp = now();
      const detail = buildDetail({
        ...existing,
        status: 'published',
        publishedAt: existing.publishedAt || timestamp,
        updatedByUserId: actor.userId || existing.updatedByUserId,
        updatedAt: timestamp,
      }, existing.attachments, createId, timestamp);

      return repository.updateDrill(detail);
    },
  };
}

function buildDetail(drillFields, rawAttachments, createId, timestamp) {
  const attachments = (rawAttachments || [])
    .map((attachment, index) => ({
      id: attachment.id || createId('attachment'),
      drillId: drillFields.id,
      type: attachment.type,
      title: attachment.title,
      url: attachment.url,
      sourceFileId: attachment.sourceFileId,
      sortOrder: attachment.sortOrder ?? index,
      mimeType: attachment.mimeType,
      thumbnailUrl: attachment.thumbnailUrl,
      createdAt: attachment.createdAt || timestamp,
      updatedAt: timestamp,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const primaryImageUrl = drillFields.primaryImageUrl
    || attachments.find((attachment) => attachment.type === 'image')?.url;

  return {
    id: drillFields.id,
    slug: drillFields.slug,
    title: drillFields.title,
    summary: drillFields.summary,
    description: drillFields.description,
    category: drillFields.category,
    intensityLevel: drillFields.intensityLevel,
    ageGroups: drillFields.ageGroups || [],
    skillTags: drillFields.skillTags || [],
    durationMin: drillFields.durationMin,
    playerCountMin: drillFields.playerCountMin,
    playerCountMax: drillFields.playerCountMax,
    equipment: drillFields.equipment || [],
    coachingPoints: drillFields.coachingPoints || [],
    setupInstructions: drillFields.setupInstructions,
    progressionIdeas: drillFields.progressionIdeas || [],
    variationIdeas: drillFields.variationIdeas || [],
    status: drillFields.status,
    sourceType: drillFields.sourceType,
    sourceFileId: drillFields.sourceFileId,
    primaryImageUrl,
    attachmentIds: attachments.map((attachment) => attachment.id),
    attachments,
    publishedAt: drillFields.publishedAt,
    createdByUserId: drillFields.createdByUserId,
    updatedByUserId: drillFields.updatedByUserId,
    createdAt: drillFields.createdAt,
    updatedAt: drillFields.updatedAt,
  };
}

function stripAttachments(detail) {
  return {
    ...detail,
    attachments: undefined,
  };
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'drill';
}

function defaultCreateId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

module.exports = {
  createDrillService,
  slugify,
};
