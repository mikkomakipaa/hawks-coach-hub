const { ValidationError } = require('../drills/errors');

const SESSION_STATUSES = new Set(['draft', 'published', 'archived']);
const SESSION_VISIBILITIES = new Set(['private', 'shared']);
const SESSION_BLOCK_TYPES = new Set(['warmup', 'drill', 'break', 'game', 'cooldown', 'custom']);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function ensureNonNegativeInteger(value, fieldName, errors) {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || value < 0) {
    errors.push({ field: fieldName, message: 'Must be a non-negative integer.' });
    return undefined;
  }

  return value;
}

function ensureEnum(value, allowedValues, fieldName, errors) {
  if (value === undefined) {
    return undefined;
  }

  if (!allowedValues.has(value)) {
    errors.push({
      field: fieldName,
      message: `Must be one of: ${Array.from(allowedValues).join(', ')}.`,
    });
    return undefined;
  }

  return value;
}

function validateBlocks(inputBlocks, errors) {
  if (inputBlocks === undefined) {
    return undefined;
  }

  if (!Array.isArray(inputBlocks)) {
    errors.push({ field: 'blocks', message: 'Must be an array.' });
    return undefined;
  }

  return inputBlocks
    .map((block, index) => {
      if (!block || typeof block !== 'object' || Array.isArray(block)) {
        errors.push({ field: `blocks[${index}]`, message: 'Must be an object.' });
        return null;
      }

      const normalized = {
        id: isNonEmptyString(block.id) ? block.id.trim() : undefined,
        order: block.order === undefined ? index : ensureNonNegativeInteger(block.order, `blocks[${index}].order`, errors),
        type: ensureEnum(block.type, SESSION_BLOCK_TYPES, `blocks[${index}].type`, errors),
        title: isNonEmptyString(block.title) ? block.title.trim() : undefined,
        durationMin: ensureNonNegativeInteger(block.durationMin, `blocks[${index}].durationMin`, errors),
        drillId: isNonEmptyString(block.drillId) ? block.drillId.trim() : undefined,
        notes: block.notes === undefined ? '' : (typeof block.notes === 'string' ? block.notes.trim() : block.notes),
        attachmentIds: normalizeAttachmentIds(block.attachmentIds, index, errors),
      };

      if (!normalized.title) {
        errors.push({ field: `blocks[${index}].title`, message: 'Must be a non-empty string.' });
      }

      if (normalized.durationMin === undefined) {
        errors.push({ field: `blocks[${index}].durationMin`, message: 'Must be a non-negative integer.' });
      }

      if (typeof normalized.notes !== 'string') {
        errors.push({ field: `blocks[${index}].notes`, message: 'Must be a string.' });
      }

      return normalized;
    })
    .filter(Boolean);
}

function normalizeAttachmentIds(value, index, errors) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    errors.push({ field: `blocks[${index}].attachmentIds`, message: 'Must be an array of strings.' });
    return undefined;
  }

  const normalized = value.map((item) => (typeof item === 'string' ? item.trim() : item));
  if (normalized.some((item) => typeof item !== 'string' || item.length === 0)) {
    errors.push({ field: `blocks[${index}].attachmentIds`, message: 'Must contain only non-empty strings.' });
    return undefined;
  }

  return normalized;
}

function validateSessionInput(input, mode = 'create') {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('Request body must be a JSON object.', [
      { field: 'body', message: 'Expected an object.' },
    ]);
  }

  const errors = [];
  const normalized = {};

  const requiredStringFields = mode === 'create' ? ['name', 'group', 'date'] : [];
  for (const fieldName of requiredStringFields) {
    if (!isNonEmptyString(input[fieldName])) {
      errors.push({ field: fieldName, message: 'Must be a non-empty string.' });
    }
  }

  const optionalStringFields = ['name', 'group', 'date', 'coachLabel'];
  for (const fieldName of optionalStringFields) {
    const value = input[fieldName];
    if (value !== undefined) {
      if (!isNonEmptyString(value)) {
        errors.push({ field: fieldName, message: 'Must be a non-empty string.' });
      } else {
        normalized[fieldName] = value.trim();
      }
    }
  }

  normalized.targetDurationMin = ensureNonNegativeInteger(input.targetDurationMin, 'targetDurationMin', errors);
  normalized.totalDurationMin = ensureNonNegativeInteger(input.totalDurationMin, 'totalDurationMin', errors);
  normalized.status = ensureEnum(input.status, SESSION_STATUSES, 'status', errors);
  normalized.visibility = ensureEnum(input.visibility, SESSION_VISIBILITIES, 'visibility', errors);
  normalized.blocks = validateBlocks(input.blocks, errors);

  if (mode === 'create' && normalized.status && normalized.status !== 'draft') {
    errors.push({
      field: 'status',
      message: 'New sessions must be created as draft.',
    });
  }

  if (mode === 'create' && normalized.visibility === 'shared') {
    errors.push({
      field: 'visibility',
      message: 'New sessions cannot be created as shared. Use the share route after saving.',
    });
  }

  if (errors.length > 0) {
    throw new ValidationError('Session payload is invalid.', errors);
  }

  return normalized;
}

module.exports = {
  validateSessionInput,
};
