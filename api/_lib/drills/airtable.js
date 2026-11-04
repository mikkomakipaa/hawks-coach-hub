const {
  ConfigurationError,
  NotFoundError,
} = require('./errors');

const DRILL_FIELDS = {
  appId: 'App ID',
  slug: 'Slug',
  title: 'Title',
  summary: 'Summary',
  description: 'Description',
  category: 'Category',
  intensityLevel: 'Intensity Level',
  ageGroups: 'Age Groups',
  skillTags: 'Skill Tags',
  durationMin: 'Duration Min',
  playerCountMin: 'Player Count Min',
  playerCountMax: 'Player Count Max',
  equipment: 'Equipment',
  coachingPoints: 'Coaching Points',
  setupInstructions: 'Setup Instructions',
  progressionIdeas: 'Progression Ideas',
  variationIdeas: 'Variation Ideas',
  status: 'Status',
  sourceType: 'Source Type',
  sourceFileId: 'Source File ID',
  primaryImageUrl: 'Primary Image URL',
  publishedAt: 'Published At',
  createdByUserId: 'Created By User ID',
  updatedByUserId: 'Updated By User ID',
  createdAt: 'Created At',
  updatedAt: 'Updated At',
};

const ATTACHMENT_FIELDS = {
  appId: 'App ID',
  drillId: 'Drill App ID',
  type: 'Type',
  title: 'Title',
  url: 'URL',
  sourceFileId: 'Source File ID',
  sortOrder: 'Sort Order',
  mimeType: 'MIME Type',
  thumbnailUrl: 'Thumbnail URL',
  createdAt: 'Created At',
  updatedAt: 'Updated At',
};

function createAirtableDrillRepository(options = {}) {
  const apiKey = options.apiKey || process.env.AIRTABLE_API_KEY;
  const baseId = options.baseId || process.env.AIRTABLE_BASE_ID;
  const drillsTable = options.drillsTable || process.env.AIRTABLE_DRILLS_TABLE || 'Drills';
  const attachmentsTable = options.attachmentsTable || process.env.AIRTABLE_DRILL_ATTACHMENTS_TABLE || 'Drill Attachments';
  const fetchImpl = options.fetchImpl || global.fetch;

  if (!apiKey || !baseId) {
    throw new ConfigurationError(
      'Airtable drill storage is not configured. Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID.',
    );
  }

  if (typeof fetchImpl !== 'function') {
    throw new ConfigurationError('A global fetch implementation is required for Airtable access.');
  }

  const client = createAirtableClient({
    apiKey,
    baseId,
    drillsTable,
    attachmentsTable,
    fetchImpl,
  });

  return {
    async listDrills() {
      const drillRecords = await client.listRecords(drillsTable);
      const drillIds = drillRecords.map((record) => record.fields[DRILL_FIELDS.appId]).filter(Boolean);
      const attachmentRecords = await client.listRecords(attachmentsTable, buildAttachmentFormula(drillIds));
      return mapDrillDetails(drillRecords, attachmentRecords);
    },

    async getDrillByIdOrSlug(idOrSlug) {
      const drillRecord = await client.findFirstRecord(
        drillsTable,
        `OR({${DRILL_FIELDS.appId}} = '${escapeFormulaValue(idOrSlug)}', {${DRILL_FIELDS.slug}} = '${escapeFormulaValue(idOrSlug)}')`,
      );

      if (!drillRecord) {
        return null;
      }

      const drillId = drillRecord.fields[DRILL_FIELDS.appId];
      const attachmentRecords = await client.listRecords(
        attachmentsTable,
        buildAttachmentFormula([drillId]),
      );

      return mapDrillDetail(drillRecord, attachmentRecords);
    },

    async createDrill(detail) {
      await client.createRecord(drillsTable, mapDrillToFields(detail));
      if (detail.attachments.length > 0) {
        await client.createRecords(
          attachmentsTable,
          detail.attachments.map((attachment) => mapAttachmentToFields(attachment)),
        );
      }

      return detail;
    },

    async updateDrill(detail) {
      const drillRecord = await client.findFirstRecord(
        drillsTable,
        `{${DRILL_FIELDS.appId}} = '${escapeFormulaValue(detail.id)}'`,
      );

      if (!drillRecord) {
        throw new NotFoundError('Drill not found.');
      }

      await client.updateRecord(drillsTable, drillRecord.id, mapDrillToFields(detail));
      await synchronizeAttachments(client, attachmentsTable, detail);
      return detail;
    },
  };
}

function createAirtableClient({ apiKey, baseId, drillsTable, attachmentsTable, fetchImpl }) {
  const allowedTables = new Set([drillsTable, attachmentsTable]);
  const baseUrl = `https://api.airtable.com/v0/${baseId}`;

  async function request(url, options = {}) {
    const response = await fetchImpl(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(`Airtable request failed: ${response.status} ${response.statusText} ${bodyText}`.trim());
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  function buildTableUrl(tableName, params = new URLSearchParams()) {
    if (!allowedTables.has(tableName)) {
      throw new Error(`Unexpected Airtable table ${tableName}.`);
    }

    const query = params.toString();
    return `${baseUrl}/${encodeURIComponent(tableName)}${query ? `?${query}` : ''}`;
  }

  return {
    async listRecords(tableName, filterByFormula) {
      const records = [];
      let offset;

      do {
        const params = new URLSearchParams();
        if (filterByFormula) {
          params.set('filterByFormula', filterByFormula);
        }
        if (offset) {
          params.set('offset', offset);
        }

        const payload = await request(buildTableUrl(tableName, params));
        records.push(...(payload.records || []));
        offset = payload.offset;
      } while (offset);

      return records;
    },

    async findFirstRecord(tableName, filterByFormula) {
      const params = new URLSearchParams({ maxRecords: '1' });
      if (filterByFormula) {
        params.set('filterByFormula', filterByFormula);
      }

      const payload = await request(buildTableUrl(tableName, params));
      return payload.records && payload.records[0] ? payload.records[0] : null;
    },

    async createRecord(tableName, fields) {
      const payload = await request(buildTableUrl(tableName), {
        method: 'POST',
        body: JSON.stringify({ fields }),
      });

      return payload;
    },

    async createRecords(tableName, fieldRows) {
      for (let index = 0; index < fieldRows.length; index += 10) {
        const batch = fieldRows.slice(index, index + 10).map((fields) => ({ fields }));
        await request(buildTableUrl(tableName), {
          method: 'POST',
          body: JSON.stringify({ records: batch }),
        });
      }
    },

    async updateRecord(tableName, recordId, fields) {
      return request(`${buildTableUrl(tableName)}/${recordId}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields }),
      });
    },

    async deleteRecords(tableName, recordIds) {
      for (let index = 0; index < recordIds.length; index += 10) {
        const batch = recordIds.slice(index, index + 10);
        const params = new URLSearchParams();
        batch.forEach((recordId) => params.append('records[]', recordId));
        await request(buildTableUrl(tableName, params), { method: 'DELETE' });
      }
    },
  };
}

async function synchronizeAttachments(client, attachmentsTable, detail) {
  const existingRecords = await client.listRecords(
    attachmentsTable,
    `{${ATTACHMENT_FIELDS.drillId}} = '${escapeFormulaValue(detail.id)}'`,
  );

  const existingByAppId = new Map(
    existingRecords.map((record) => [record.fields[ATTACHMENT_FIELDS.appId], record]),
  );

  const nextIds = new Set(detail.attachments.map((attachment) => attachment.id));
  const staleRecordIds = existingRecords
    .filter((record) => !nextIds.has(record.fields[ATTACHMENT_FIELDS.appId]))
    .map((record) => record.id);

  if (staleRecordIds.length > 0) {
    await client.deleteRecords(attachmentsTable, staleRecordIds);
  }

  const newAttachments = [];
  for (const attachment of detail.attachments) {
    const existing = existingByAppId.get(attachment.id);
    const fields = mapAttachmentToFields(attachment);

    if (existing) {
      await client.updateRecord(attachmentsTable, existing.id, fields);
    } else {
      newAttachments.push(fields);
    }
  }

  if (newAttachments.length > 0) {
    await client.createRecords(attachmentsTable, newAttachments);
  }
}

function buildAttachmentFormula(drillIds) {
  if (!drillIds || drillIds.length === 0) {
    return undefined;
  }

  if (drillIds.length === 1) {
    return `{${ATTACHMENT_FIELDS.drillId}} = '${escapeFormulaValue(drillIds[0])}'`;
  }

  return `OR(${drillIds
    .map((drillId) => `{${ATTACHMENT_FIELDS.drillId}} = '${escapeFormulaValue(drillId)}'`)
    .join(',')})`;
}

function mapDrillDetails(drillRecords, attachmentRecords) {
  const attachmentsByDrillId = groupAttachmentsByDrillId(attachmentRecords);
  return drillRecords.map((record) =>
    mapDrillRecord(record, attachmentsByDrillId.get(record.fields[DRILL_FIELDS.appId]) || []),
  );
}

function mapDrillDetail(drillRecord, attachmentRecords) {
  return mapDrillRecord(drillRecord, attachmentRecords.map(mapAttachmentRecord));
}

function mapDrillRecord(record, attachments) {
  const fields = record.fields;
  const sortedAttachments = attachments
    .map((attachment) => ({ ...attachment }))
    .sort((left, right) => left.sortOrder - right.sortOrder);

  return {
    id: fields[DRILL_FIELDS.appId],
    slug: fields[DRILL_FIELDS.slug],
    title: fields[DRILL_FIELDS.title] || '',
    summary: fields[DRILL_FIELDS.summary] || '',
    description: fields[DRILL_FIELDS.description] || '',
    category: fields[DRILL_FIELDS.category] || '',
    intensityLevel: fields[DRILL_FIELDS.intensityLevel] || undefined,
    ageGroups: normalizeStringArray(fields[DRILL_FIELDS.ageGroups]),
    skillTags: normalizeStringArray(fields[DRILL_FIELDS.skillTags]),
    durationMin: normalizeNumber(fields[DRILL_FIELDS.durationMin]),
    playerCountMin: normalizeNumber(fields[DRILL_FIELDS.playerCountMin]),
    playerCountMax: normalizeNumber(fields[DRILL_FIELDS.playerCountMax]),
    equipment: normalizeStringArray(fields[DRILL_FIELDS.equipment]),
    coachingPoints: normalizeStringArray(fields[DRILL_FIELDS.coachingPoints]),
    setupInstructions: fields[DRILL_FIELDS.setupInstructions] || undefined,
    progressionIdeas: normalizeStringArray(fields[DRILL_FIELDS.progressionIdeas]),
    variationIdeas: normalizeStringArray(fields[DRILL_FIELDS.variationIdeas]),
    status: fields[DRILL_FIELDS.status] || 'draft',
    sourceType: fields[DRILL_FIELDS.sourceType] || 'native',
    sourceFileId: fields[DRILL_FIELDS.sourceFileId] || undefined,
    primaryImageUrl: fields[DRILL_FIELDS.primaryImageUrl] || undefined,
    attachmentIds: sortedAttachments.map((attachment) => attachment.id),
    publishedAt: fields[DRILL_FIELDS.publishedAt] || undefined,
    createdByUserId: fields[DRILL_FIELDS.createdByUserId] || undefined,
    updatedByUserId: fields[DRILL_FIELDS.updatedByUserId] || undefined,
    createdAt: fields[DRILL_FIELDS.createdAt],
    updatedAt: fields[DRILL_FIELDS.updatedAt],
    attachments: sortedAttachments,
  };
}

function mapAttachmentRecord(record) {
  const fields = record.fields;
  return {
    id: fields[ATTACHMENT_FIELDS.appId],
    drillId: fields[ATTACHMENT_FIELDS.drillId],
    type: fields[ATTACHMENT_FIELDS.type],
    title: fields[ATTACHMENT_FIELDS.title] || '',
    url: fields[ATTACHMENT_FIELDS.url] || '',
    sourceFileId: fields[ATTACHMENT_FIELDS.sourceFileId] || undefined,
    sortOrder: normalizeNumber(fields[ATTACHMENT_FIELDS.sortOrder]) || 0,
    mimeType: fields[ATTACHMENT_FIELDS.mimeType] || undefined,
    thumbnailUrl: fields[ATTACHMENT_FIELDS.thumbnailUrl] || undefined,
    createdAt: fields[ATTACHMENT_FIELDS.createdAt] || undefined,
    updatedAt: fields[ATTACHMENT_FIELDS.updatedAt] || undefined,
  };
}

function mapDrillToFields(detail) {
  return {
    [DRILL_FIELDS.appId]: detail.id,
    [DRILL_FIELDS.slug]: detail.slug,
    [DRILL_FIELDS.title]: detail.title,
    [DRILL_FIELDS.summary]: detail.summary,
    [DRILL_FIELDS.description]: detail.description,
    [DRILL_FIELDS.category]: detail.category,
    [DRILL_FIELDS.intensityLevel]: detail.intensityLevel,
    [DRILL_FIELDS.ageGroups]: detail.ageGroups,
    [DRILL_FIELDS.skillTags]: detail.skillTags,
    [DRILL_FIELDS.durationMin]: detail.durationMin,
    [DRILL_FIELDS.playerCountMin]: detail.playerCountMin,
    [DRILL_FIELDS.playerCountMax]: detail.playerCountMax,
    [DRILL_FIELDS.equipment]: detail.equipment,
    [DRILL_FIELDS.coachingPoints]: detail.coachingPoints,
    [DRILL_FIELDS.setupInstructions]: detail.setupInstructions,
    [DRILL_FIELDS.progressionIdeas]: detail.progressionIdeas,
    [DRILL_FIELDS.variationIdeas]: detail.variationIdeas,
    [DRILL_FIELDS.status]: detail.status,
    [DRILL_FIELDS.sourceType]: detail.sourceType,
    [DRILL_FIELDS.sourceFileId]: detail.sourceFileId,
    [DRILL_FIELDS.primaryImageUrl]: detail.primaryImageUrl,
    [DRILL_FIELDS.publishedAt]: detail.publishedAt,
    [DRILL_FIELDS.createdByUserId]: detail.createdByUserId,
    [DRILL_FIELDS.updatedByUserId]: detail.updatedByUserId,
    [DRILL_FIELDS.createdAt]: detail.createdAt,
    [DRILL_FIELDS.updatedAt]: detail.updatedAt,
  };
}

function mapAttachmentToFields(attachment) {
  return {
    [ATTACHMENT_FIELDS.appId]: attachment.id,
    [ATTACHMENT_FIELDS.drillId]: attachment.drillId,
    [ATTACHMENT_FIELDS.type]: attachment.type,
    [ATTACHMENT_FIELDS.title]: attachment.title,
    [ATTACHMENT_FIELDS.url]: attachment.url,
    [ATTACHMENT_FIELDS.sourceFileId]: attachment.sourceFileId,
    [ATTACHMENT_FIELDS.sortOrder]: attachment.sortOrder,
    [ATTACHMENT_FIELDS.mimeType]: attachment.mimeType,
    [ATTACHMENT_FIELDS.thumbnailUrl]: attachment.thumbnailUrl,
    [ATTACHMENT_FIELDS.createdAt]: attachment.createdAt,
    [ATTACHMENT_FIELDS.updatedAt]: attachment.updatedAt,
  };
}

function groupAttachmentsByDrillId(attachmentRecords) {
  const grouped = new Map();
  for (const record of attachmentRecords) {
    const attachment = mapAttachmentRecord(record);
    const collection = grouped.get(attachment.drillId) || [];
    collection.push(attachment);
    grouped.set(attachment.drillId, collection);
  }
  return grouped;
}

function normalizeStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function normalizeNumber(value) {
  return typeof value === 'number' ? value : undefined;
}

function escapeFormulaValue(value) {
  return String(value).replace(/'/g, "\\'");
}

module.exports = {
  createAirtableDrillRepository,
};
