const {
  ConfigurationError,
} = require('../drills/errors');

const PROFILE_FIELDS = {
  id: 'App ID',
  email: 'Email',
  role: 'Role',
  displayName: 'Display Name',
  status: 'Status',
  createdAt: 'Created At',
  updatedAt: 'Updated At',
};

function createAirtablePlannerProfileRepository(options = {}) {
  const apiKey = options.apiKey || process.env.AIRTABLE_API_KEY;
  const baseId = options.baseId || process.env.AIRTABLE_BASE_ID;
  const profilesTable = options.profilesTable || process.env.AIRTABLE_PLANNER_PROFILES_TABLE || 'Planner Profiles';
  const fetchImpl = options.fetchImpl || global.fetch;

  if (!apiKey || !baseId) {
    throw new ConfigurationError(
      'Airtable planner profile storage is not configured. Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID.',
    );
  }

  if (typeof fetchImpl !== 'function') {
    throw new ConfigurationError('A global fetch implementation is required for Airtable access.');
  }

  const client = createAirtableClient({
    apiKey,
    baseId,
    profilesTable,
    fetchImpl,
  });

  return {
    async getProfile({ userId, email } = {}) {
      if (!userId && !email) {
        return null;
      }

      const formulas = [];
      if (userId) {
        formulas.push(`{${PROFILE_FIELDS.id}} = '${escapeFormulaValue(userId)}'`);
      }
      if (email) {
        formulas.push(`LOWER({${PROFILE_FIELDS.email}}) = LOWER('${escapeFormulaValue(email)}')`);
      }

      const record = await client.findFirstRecord(
        profilesTable,
        formulas.length === 1 ? formulas[0] : `OR(${formulas.join(', ')})`,
      );

      return record ? mapProfileRecord(record) : null;
    },
  };
}

function createOptionalAirtablePlannerProfileRepository(options = {}) {
  const apiKey = options.apiKey || process.env.AIRTABLE_API_KEY;
  const baseId = options.baseId || process.env.AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    return null;
  }

  return createAirtablePlannerProfileRepository(options);
}

function createAirtableClient({ apiKey, baseId, profilesTable, fetchImpl }) {
  const allowedTables = new Set([profilesTable]);
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
    async findFirstRecord(tableName, filterByFormula) {
      const params = new URLSearchParams({ maxRecords: '1' });
      if (filterByFormula) {
        params.set('filterByFormula', filterByFormula);
      }

      const payload = await request(buildTableUrl(tableName, params));
      return payload.records && payload.records[0] ? payload.records[0] : null;
    },
  };
}

function mapProfileRecord(record) {
  return {
    id: record.fields[PROFILE_FIELDS.id],
    email: record.fields[PROFILE_FIELDS.email],
    role: record.fields[PROFILE_FIELDS.role],
    displayName: record.fields[PROFILE_FIELDS.displayName],
    status: record.fields[PROFILE_FIELDS.status] || 'active',
    createdAt: record.fields[PROFILE_FIELDS.createdAt],
    updatedAt: record.fields[PROFILE_FIELDS.updatedAt],
  };
}

function escapeFormulaValue(value) {
  return String(value).replace(/'/g, "\\'");
}

module.exports = {
  createAirtablePlannerProfileRepository,
  createOptionalAirtablePlannerProfileRepository,
};
