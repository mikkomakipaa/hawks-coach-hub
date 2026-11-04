const { ConflictError, ValidationError } = require('./errors');

const DRILL_STATUSES = new Set(['draft', 'published', 'archived']);
const INTENSITY_LEVELS = new Set(['low', 'medium', 'high']);
const SOURCE_TYPES = new Set(['native', 'pdf-import', 'drive-import']);
const ATTACHMENT_TYPES = new Set(['image', 'pdf', 'drive-file', 'link']);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function ensureArrayOfStrings(value, fieldName, errors, { allowEmpty = true } = {}) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    errors.push({ field: fieldName, message: 'Must be an array of strings.' });
    return undefined;
  }

  const normalized = value.map((item) => (typeof item === 'string' ? item.trim() : item));
  const invalid = normalized.some((item) => typeof item !== 'string' || item.length === 0);

  if (invalid) {
    errors.push({ field: fieldName, message: 'Must contain only non-empty strings.' });
    return undefined;
  }

  if (!allowEmpty && normalized.length === 0) {
    errors.push({ field: fieldName, message: 'Must contain at least one item.' });
    return undefined;
  }

  return normalized;
}

function ensurePositiveInteger(value, fieldName, errors) {
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

function validateAttachments(inputAttachments, errors) {
  if (inputAttachments === undefined) {
    return undefined;
  }

  if (!Array.isArray(inputAttachments)) {
    errors.push({ field: 'attachments', message: 'Must be an array.' });
    return undefined;
  }

  return inputAttachments.map((attachment, index) => {
    if (!attachment || typeof attachment !== 'object') {
      errors.push({
        field: `attachments[${index}]`,
        message: 'Must be an object.',
      });
      return null;
    }

    const normalized = {
      id: isNonEmptyString(attachment.id) ? attachment.id.trim() : undefined,
      type: ensureEnum(attachment.type, ATTACHMENT_TYPES, `attachments[${index}].type`, errors),
      title: isNonEmptyString(attachment.title) ? attachment.title.trim() : undefined,
      url: isNonEmptyString(attachment.url) ? attachment.url.trim() : undefined,
      sourceFileId: isNonEmptyString(attachment.sourceFileId) ? attachment.sourceFileId.trim() : undefined,
      sortOrder: attachment.sortOrder === undefined ? index : ensurePositiveInteger(attachment.sortOrder, `attachments[${index}].sortOrder`, errors),
      mimeType: isNonEmptyString(attachment.mimeType) ? attachment.mimeType.trim() : undefined,
      thumbnailUrl: isNonEmptyString(attachment.thumbnailUrl) ? attachment.thumbnailUrl.trim() : undefined,
    };

    if (!normalized.title) {
      errors.push({
        field: `attachments[${index}].title`,
        message: 'Must be a non-empty string.',
      });
    }

    if (!normalized.url) {
      errors.push({
        field: `attachments[${index}].url`,
        message: 'Must be a non-empty string.',
      });
    }

    return normalized;
  }).filter(Boolean);
}

function validateDrillInput(input, mode = 'create') {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('Request body must be a JSON object.', [
      { field: 'body', message: 'Expected an object.' },
    ]);
  }

  const errors = [];
  const normalized = {};

  const requiredStringFields = mode === 'create'
    ? ['title', 'summary', 'description', 'category']
    : [];

  for (const fieldName of requiredStringFields) {
    if (!isNonEmptyString(input[fieldName])) {
      errors.push({ field: fieldName, message: 'Must be a non-empty string.' });
    }
  }

  const optionalStringFields = [
    'slug',
    'title',
    'summary',
    'description',
    'category',
    'setupInstructions',
    'sourceFileId',
    'primaryImageUrl',
  ];

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

  normalized.intensityLevel = ensureEnum(input.intensityLevel, INTENSITY_LEVELS, 'intensityLevel', errors);
  normalized.sourceType = ensureEnum(input.sourceType, SOURCE_TYPES, 'sourceType', errors);
  normalized.status = ensureEnum(input.status, DRILL_STATUSES, 'status', errors);
  normalized.ageGroups = ensureArrayOfStrings(input.ageGroups, 'ageGroups', errors);
  normalized.skillTags = ensureArrayOfStrings(input.skillTags, 'skillTags', errors);
  normalized.equipment = ensureArrayOfStrings(input.equipment, 'equipment', errors);
  normalized.coachingPoints = ensureArrayOfStrings(input.coachingPoints, 'coachingPoints', errors);
  normalized.progressionIdeas = ensureArrayOfStrings(input.progressionIdeas, 'progressionIdeas', errors);
  normalized.variationIdeas = ensureArrayOfStrings(input.variationIdeas, 'variationIdeas', errors);
  normalized.durationMin = ensurePositiveInteger(input.durationMin, 'durationMin', errors);
  normalized.playerCountMin = ensurePositiveInteger(input.playerCountMin, 'playerCountMin', errors);
  normalized.playerCountMax = ensurePositiveInteger(input.playerCountMax, 'playerCountMax', errors);
  normalized.attachments = validateAttachments(input.attachments, errors);

  if (mode === 'create' && !normalized.sourceType) {
    errors.push({ field: 'sourceType', message: 'Must be one of: native, pdf-import, drive-import.' });
  }

  if (
    normalized.playerCountMin !== undefined &&
    normalized.playerCountMax !== undefined &&
    normalized.playerCountMin > normalized.playerCountMax
  ) {
    errors.push({
      field: 'playerCountMax',
      message: 'Must be greater than or equal to playerCountMin.',
    });
  }

  if (mode === 'create' && normalized.status && normalized.status !== 'draft') {
    errors.push({
      field: 'status',
      message: 'New drills must be created as draft. Use the publish route to publish them.',
    });
  }

  if (errors.length > 0) {
    throw new ValidationError('Drill payload is invalid.', errors);
  }

  return normalized;
}

function assertPublishable(drill) {
  const missingFields = [];

  if (!isNonEmptyString(drill.title)) missingFields.push({ field: 'title', message: 'Title is required before publishing.' });
  if (!isNonEmptyString(drill.summary)) missingFields.push({ field: 'summary', message: 'Summary is required before publishing.' });
  if (!isNonEmptyString(drill.description)) missingFields.push({ field: 'description', message: 'Description is required before publishing.' });
  if (!isNonEmptyString(drill.category)) missingFields.push({ field: 'category', message: 'Category is required before publishing.' });

  if (missingFields.length > 0) {
    throw new ValidationError('Drill is missing required fields for publishing.', missingFields);
  }

  if (drill.status === 'archived') {
    throw new ConflictError('Archived drills cannot be published directly.');
  }
}

function assertAllowedStatusTransition(currentStatus, requestedStatus) {
  if (requestedStatus === undefined || requestedStatus === currentStatus) {
    return;
  }

  const allowed = {
    draft: new Set(['archived']),
    published: new Set(['archived']),
    archived: new Set(['draft']),
  };

  if (!allowed[currentStatus] || !allowed[currentStatus].has(requestedStatus)) {
    throw new ConflictError(
      `Status transition from ${currentStatus} to ${requestedStatus} is not allowed.`,
      [{ field: 'status', message: 'Use the publish route for draft to published transitions.' }],
    );
  }
}

module.exports = {
  validateDrillInput,
  assertPublishable,
  assertAllowedStatusTransition,
};
