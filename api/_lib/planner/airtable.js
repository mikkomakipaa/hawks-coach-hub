const {
  ConfigurationError,
  NotFoundError,
} = require('../drills/errors');

const SESSION_FIELDS = {
  appId: 'App ID',
  name: 'Name',
  group: 'Group',
  date: 'Date',
  ownerUserId: 'Owner User ID',
  coachLabel: 'Coach Label',
  targetDurationMin: 'Target Duration Min',
  totalDurationMin: 'Total Duration Min',
  status: 'Status',
  visibility: 'Visibility',
  shareId: 'Share ID',
  blocksJson: 'Blocks JSON',
  createdAt: 'Created At',
  updatedAt: 'Updated At',
};

const SHARE_FIELDS = {
  sessionId: 'Session App ID',
  shareId: 'Share ID',
  createdAt: 'Created At',
  updatedAt: 'Updated At',
};

function createAirtableSessionRepository(options = {}) {
  const apiKey = options.apiKey || process.env.AIRTABLE_API_KEY;
  const baseId = options.baseId || process.env.AIRTABLE_BASE_ID;
  const sessionsTable = options.sessionsTable || process.env.AIRTABLE_SESSIONS_TABLE || 'Sessions';
  const sessionSharesTable = options.sessionSharesTable || process.env.AIRTABLE_SESSION_SHARES_TABLE || 'Session Shares';
  const fetchImpl = options.fetchImpl || global.fetch;

  if (!apiKey || !baseId) {
    throw new ConfigurationError(
      'Airtable session storage is not configured. Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID.',
    );
  }

  if (typeof fetchImpl !== 'function') {
    throw new ConfigurationError('A global fetch implementation is required for Airtable access.');
  }

  const client = createAirtableClient({
    apiKey,
    baseId,
    sessionsTable,
    sessionSharesTable,
    fetchImpl,
  });

  return {
    async listSessionsByOwner(ownerUserId) {
      const records = await client.listRecords(
        sessionsTable,
        `{${SESSION_FIELDS.ownerUserId}} = '${escapeFormulaValue(ownerUserId)}'`,
      );

      return records.map(mapSessionRecord);
    },

    async getSessionById(id) {
      const record = await client.findFirstRecord(
        sessionsTable,
        `{${SESSION_FIELDS.appId}} = '${escapeFormulaValue(id)}'`,
      );

      return record ? mapSessionRecord(record) : null;
    },

    async getSessionByShareId(shareId) {
      const shareRecord = await client.findFirstRecord(
        sessionSharesTable,
        `{${SHARE_FIELDS.shareId}} = '${escapeFormulaValue(shareId)}'`,
      );

      if (!shareRecord) {
        return null;
      }

      const sessionId = shareRecord.fields[SHARE_FIELDS.sessionId];
      if (!sessionId) {
        return null;
      }

      const sessionRecord = await client.findFirstRecord(
        sessionsTable,
        `{${SESSION_FIELDS.appId}} = '${escapeFormulaValue(sessionId)}'`,
      );

      return sessionRecord ? mapSessionRecord(sessionRecord) : null;
    },

    async createSession(session) {
      await client.createRecord(sessionsTable, mapSessionToFields(session));
      return session;
    },

    async updateSession(session) {
      const existing = await client.findFirstRecord(
        sessionsTable,
        `{${SESSION_FIELDS.appId}} = '${escapeFormulaValue(session.id)}'`,
      );

      if (!existing) {
        throw new NotFoundError('Session not found.');
      }

      await client.updateRecord(sessionsTable, existing.id, mapSessionToFields(session));
      return session;
    },

    async saveSessionShare(share) {
      const existingShares = await client.listRecords(
        sessionSharesTable,
        `{${SHARE_FIELDS.sessionId}} = '${escapeFormulaValue(share.sessionId)}'`,
      );

      const staleRecordIds = existingShares
        .filter((record) => record.fields[SHARE_FIELDS.shareId] !== share.shareId)
        .map((record) => record.id);

      if (staleRecordIds.length > 0) {
        await client.deleteRecords(sessionSharesTable, staleRecordIds);
      }

      const current = existingShares.find((record) => record.fields[SHARE_FIELDS.shareId] === share.shareId);
      if (current) {
        await client.updateRecord(sessionSharesTable, current.id, mapShareToFields(share));
      } else {
        await client.createRecord(sessionSharesTable, mapShareToFields(share));
      }

      return { ...share };
    },
  };
}

function createAirtableClient({ apiKey, baseId, sessionsTable, sessionSharesTable, fetchImpl }) {
  const allowedTables = new Set([sessionsTable, sessionSharesTable]);
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

function mapSessionRecord(record) {
  const blocks = parseBlocks(record.fields[SESSION_FIELDS.blocksJson]);

  return {
    id: record.fields[SESSION_FIELDS.appId],
    name: record.fields[SESSION_FIELDS.name],
    group: record.fields[SESSION_FIELDS.group],
    date: record.fields[SESSION_FIELDS.date],
    ownerUserId: record.fields[SESSION_FIELDS.ownerUserId],
    coachLabel: record.fields[SESSION_FIELDS.coachLabel],
    targetDurationMin: record.fields[SESSION_FIELDS.targetDurationMin],
    totalDurationMin: record.fields[SESSION_FIELDS.totalDurationMin],
    status: record.fields[SESSION_FIELDS.status],
    visibility: record.fields[SESSION_FIELDS.visibility],
    shareId: record.fields[SESSION_FIELDS.shareId],
    blocks,
    createdAt: record.fields[SESSION_FIELDS.createdAt],
    updatedAt: record.fields[SESSION_FIELDS.updatedAt],
  };
}

function mapSessionToFields(session) {
  return {
    [SESSION_FIELDS.appId]: session.id,
    [SESSION_FIELDS.name]: session.name,
    [SESSION_FIELDS.group]: session.group,
    [SESSION_FIELDS.date]: session.date,
    [SESSION_FIELDS.ownerUserId]: session.ownerUserId,
    [SESSION_FIELDS.coachLabel]: session.coachLabel,
    [SESSION_FIELDS.targetDurationMin]: session.targetDurationMin,
    [SESSION_FIELDS.totalDurationMin]: session.totalDurationMin,
    [SESSION_FIELDS.status]: session.status,
    [SESSION_FIELDS.visibility]: session.visibility,
    [SESSION_FIELDS.shareId]: session.shareId,
    [SESSION_FIELDS.blocksJson]: JSON.stringify(session.blocks || []),
    [SESSION_FIELDS.createdAt]: session.createdAt,
    [SESSION_FIELDS.updatedAt]: session.updatedAt,
  };
}

function mapShareToFields(share) {
  return {
    [SHARE_FIELDS.sessionId]: share.sessionId,
    [SHARE_FIELDS.shareId]: share.shareId,
    [SHARE_FIELDS.createdAt]: share.createdAt,
    [SHARE_FIELDS.updatedAt]: share.updatedAt,
  };
}

function parseBlocks(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function escapeFormulaValue(value) {
  return String(value).replace(/'/g, "\\'");
}

module.exports = {
  createAirtableSessionRepository,
};
