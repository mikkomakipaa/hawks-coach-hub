class ApiError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

class ValidationError extends ApiError {
  constructor(message, details = []) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication is required for this route.') {
    super(401, 'UNAUTHORIZED', message);
  }
}

class ForbiddenError extends ApiError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(403, 'FORBIDDEN', message);
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'Resource not found.') {
    super(404, 'NOT_FOUND', message);
  }
}

class ConflictError extends ApiError {
  constructor(message, details = []) {
    super(409, 'CONFLICT', message, details);
  }
}

class ConfigurationError extends ApiError {
  constructor(message) {
    super(503, 'CONFIGURATION_ERROR', message);
  }
}

module.exports = {
  ApiError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ConfigurationError,
};
