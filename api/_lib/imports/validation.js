const { ConflictError, ValidationError } = require('../drills/errors');

const IMPORT_SOURCE_TYPES = new Set(['pdf', 'drive-file']);
const IMPORT_CONFIDENCE_LEVELS = new Set(['high', 'medium', 'low']);
const IMPORT_REVIEW_STATUSES = new Set(['pending', 'reviewed', 'rejected', 'converted']);

function validateImportDraftInput(input, mode = 'create') {
  const payload = input && typeof input === 'object' ? input : {};
  const errors = [];

  const normalized = {
    sourceType: payload.sourceType,
    sourceFileId: payload.sourceFileId,
    sourceFileName: payload.sourceFileName,
    extractedTitle: payload.extractedTitle,
    extractedText: payload.extractedText,
    extractedFields: payload.extractedFields,
    confidence: payload.confidence,
  };

  if (mode === 'create') {
    if (!IMPORT_SOURCE_TYPES.has(normalized.sourceType)) {
      errors.push({ field: 'sourceType', message: 'Must be one of: pdf, drive-file.' });
    }
  } else if (normalized.sourceType && !IMPORT_SOURCE_TYPES.has(normalized.sourceType)) {
    errors.push({ field: 'sourceType', message: 'Must be one of: pdf, drive-file.' });
  }

  if (normalized.sourceFileId !== undefined && typeof normalized.sourceFileId !== 'string') {
    errors.push({ field: 'sourceFileId', message: 'Must be a string when provided.' });
  }

  if (normalized.sourceFileName !== undefined && typeof normalized.sourceFileName !== 'string') {
    errors.push({ field: 'sourceFileName', message: 'Must be a string when provided.' });
  }

  if (normalized.extractedTitle !== undefined && typeof normalized.extractedTitle !== 'string') {
    errors.push({ field: 'extractedTitle', message: 'Must be a string when provided.' });
  }

  if (normalized.extractedText !== undefined && typeof normalized.extractedText !== 'string') {
    errors.push({ field: 'extractedText', message: 'Must be a string when provided.' });
  }

  if (normalized.extractedFields !== undefined) {
    if (!normalized.extractedFields || typeof normalized.extractedFields !== 'object' || Array.isArray(normalized.extractedFields)) {
      errors.push({ field: 'extractedFields', message: 'Must be an object.' });
    }
  }

  if (mode === 'create') {
    normalized.extractedFields = normalized.extractedFields || {};
  }

  if (normalized.confidence !== undefined && !IMPORT_CONFIDENCE_LEVELS.has(normalized.confidence)) {
    errors.push({ field: 'confidence', message: 'Must be one of: high, medium, low.' });
  }

  if (errors.length > 0) {
    throw new ValidationError('Import draft payload is invalid.', errors);
  }

  return normalized;
}

function validateReviewInput(input) {
  const payload = input && typeof input === 'object' ? input : {};
  const errors = [];

  if (payload.reviewNotes !== undefined && typeof payload.reviewNotes !== 'string') {
    errors.push({ field: 'reviewNotes', message: 'Must be a string when provided.' });
  }

  if (errors.length > 0) {
    throw new ValidationError('Import draft review payload is invalid.', errors);
  }

  return {
    reviewNotes: payload.reviewNotes,
  };
}

function assertImportStatusTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) {
    return;
  }

  const allowedTransitions = {
    pending: new Set(['reviewed', 'rejected', 'converted']),
    reviewed: new Set(['rejected', 'converted']),
    rejected: new Set(['reviewed']),
    converted: new Set([]),
  };

  if (!IMPORT_REVIEW_STATUSES.has(nextStatus)) {
    throw new ConflictError('Unsupported import draft review status.');
  }

  if (!allowedTransitions[currentStatus] || !allowedTransitions[currentStatus].has(nextStatus)) {
    throw new ConflictError(`Cannot move import draft from ${currentStatus} to ${nextStatus}.`, [
      { field: 'reviewStatus', message: 'Requested review status transition is not allowed.' },
    ]);
  }
}

module.exports = {
  assertImportStatusTransition,
  validateImportDraftInput,
  validateReviewInput,
};
