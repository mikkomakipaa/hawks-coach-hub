const {
  ConfigurationError,
  NotFoundError,
} = require('../drills/errors');

const IMPORT_FIELDS = {
  appId: 'App ID',
  sourceType: 'Source Type',
  sourceFileId: 'Source File ID',
  sourceFileName: 'Source File Name',
  extractedTitle: 'Extracted Title',
  extractedText: 'Extracted Text',
  extractedFieldsJson: 'Extracted Fields JSON',
  confidence: 'Confidence',
  reviewStatus: 'Review Status',
  convertedDrillId: 'Converted Drill App ID',
  reviewedByUserId: 'Reviewed By User ID',
  reviewNotes: 'Review Notes',
  createdAt: 'Created At',
  updatedAt: 'Updated At',
};

function createAirtableImportDraftRepository(options = {}) {
  const apiKey = options.apiKey || process.env.AIRTABLE_API_KEY;
  const baseId = options.baseId || process.env.AIRTABLE_BASE_ID;
  const importDraftsTable = options.importDraftsTable || process.env.AIRTABLE_IMPORT_DRAFTS_TABLE || 'Import Drafts';
  const fetchImpl = options.fetchImpl || global.fetch;

  if (!apiKey || !baseId) {
    throw new ConfigurationError(
      'Airtable import draft storage is not configured. Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID.',
    );
  }

  if (typeof fetchImpl !== 'function') {
    throw new ConfigurationError('A global fetch implementation is required for Airtable access.');
  }

  const client = createAirtableClient({
    apiKey,
    baseId,
    importDraftsTable,
    fetchImpl,
  });

  return {
    async listImportDrafts() {
      const records = await client.listRecords(importDraftsTable);
      return records.map(mapImportDraftRecord);
    },

    async getImportDraftById(id) {
      const record = await client.findFirstRecord(
        importDraftsTable,
        `{${IMPORT_FIELDS.appId}} = '${escapeFormulaValue(id)}'`,
      );

      return record ? mapImportDraftRecord(record) : null;
    },

    async createImportDraft(draft) {
      await client.createRecord(importDraftsTable, mapImportDraftToFields(draft));
      return { ...draft };
    },

    async updateImportDraft(draft) {
      const existing = await client.findFirstRecord(
        importDraftsTable,
        `{${IMPORT_FIELDS.appId}} = '${escapeFormulaValue(draft.id)}'`,
      );

      if (!existing) {
        throw new NotFoundError('Import draft not found.');
      }

      await client.updateRecord(importDraftsTable, existing.id, mapImportDraftToFields(draft));
      return { ...draft };
    },
  };
}

function createAirtableClient({ apiKey, baseId, importDraftsTable, fetchImpl }) {
  const allowedTables = new Set([importDraftsTable]);
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
      return request(buildTableUrl(tableName), {
        method: 'POST',
        body: JSON.stringify({ fields }),
      });
    },

    async updateRecord(tableName, recordId, fields) {
      return request(`${buildTableUrl(tableName)}/${recordId}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields }),
      });
    },
  };
}

function mapImportDraftRecord(record) {
  return {
    id: record.fields[IMPORT_FIELDS.appId],
    sourceType: record.fields[IMPORT_FIELDS.sourceType],
    sourceFileId: record.fields[IMPORT_FIELDS.sourceFileId],
    sourceFileName: record.fields[IMPORT_FIELDS.sourceFileName],
    extractedTitle: record.fields[IMPORT_FIELDS.extractedTitle],
    extractedText: record.fields[IMPORT_FIELDS.extractedText],
    extractedFields: parseJsonObject(record.fields[IMPORT_FIELDS.extractedFieldsJson]),
    confidence: record.fields[IMPORT_FIELDS.confidence] || 'medium',
    reviewStatus: record.fields[IMPORT_FIELDS.reviewStatus] || 'pending',
    convertedDrillId: record.fields[IMPORT_FIELDS.convertedDrillId],
    reviewedByUserId: record.fields[IMPORT_FIELDS.reviewedByUserId],
    reviewNotes: record.fields[IMPORT_FIELDS.reviewNotes],
    createdAt: record.fields[IMPORT_FIELDS.createdAt],
    updatedAt: record.fields[IMPORT_FIELDS.updatedAt],
  };
}

function mapImportDraftToFields(draft) {
  return {
    [IMPORT_FIELDS.appId]: draft.id,
    [IMPORT_FIELDS.sourceType]: draft.sourceType,
    [IMPORT_FIELDS.sourceFileId]: draft.sourceFileId,
    [IMPORT_FIELDS.sourceFileName]: draft.sourceFileName,
    [IMPORT_FIELDS.extractedTitle]: draft.extractedTitle,
    [IMPORT_FIELDS.extractedText]: draft.extractedText,
    [IMPORT_FIELDS.extractedFieldsJson]: JSON.stringify(draft.extractedFields || {}),
    [IMPORT_FIELDS.confidence]: draft.confidence,
    [IMPORT_FIELDS.reviewStatus]: draft.reviewStatus,
    [IMPORT_FIELDS.convertedDrillId]: draft.convertedDrillId,
    [IMPORT_FIELDS.reviewedByUserId]: draft.reviewedByUserId,
    [IMPORT_FIELDS.reviewNotes]: draft.reviewNotes,
    [IMPORT_FIELDS.createdAt]: draft.createdAt,
    [IMPORT_FIELDS.updatedAt]: draft.updatedAt,
  };
}

function parseJsonObject(value) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function escapeFormulaValue(value) {
  return String(value).replace(/'/g, "\\'");
}

module.exports = {
  createAirtableImportDraftRepository,
};
