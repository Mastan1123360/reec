/**
 * lib/domain/errors/types.ts
 *
 * Implements Master Engineering Specification Section 24:
 * APPLICATION ERROR MODEL
 *
 * Distinguish authoritatively:
 * - ValidationError
 * - AuthenticationError
 * - VerificationError
 * - AuthorizationError
 * - NotFoundError
 * - ConflictError
 * - NetworkError
 * - ExternalServiceError
 * - PersistenceError
 * - RateLimitError
 * - UnknownError
 *
 * Invariant: Never convert failures into fake success.
 * Never silently swallow important failures.
 */

export type ErrorCategory =
  | "ValidationError"
  | "AuthenticationError"
  | "VerificationError"
  | "AuthorizationError"
  | "NotFoundError"
  | "ConflictError"
  | "NetworkError"
  | "ExternalServiceError"
  | "PersistenceError"
  | "RateLimitError"
  | "UnknownError";

export interface SerializedApplicationError {
  readonly success: false;
  readonly error: string;
  readonly category: ErrorCategory;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;
}

export abstract class ApplicationError extends Error {
  abstract readonly category: ErrorCategory;
  abstract readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): SerializedApplicationError {
    return {
      success: false,
      error: this.message,
      category: this.category,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

export class ValidationError extends ApplicationError {
  readonly category = "ValidationError";
  readonly statusCode = 400;
}

export class AuthenticationError extends ApplicationError {
  readonly category = "AuthenticationError";
  readonly statusCode = 401;
}

export class VerificationError extends ApplicationError {
  readonly category = "VerificationError";
  readonly statusCode = 403;
}

export class AuthorizationError extends ApplicationError {
  readonly category = "AuthorizationError";
  readonly statusCode = 403;
}

export class NotFoundError extends ApplicationError {
  readonly category = "NotFoundError";
  readonly statusCode = 404;
}

export class ConflictError extends ApplicationError {
  readonly category = "ConflictError";
  readonly statusCode = 409;
}

export class NetworkError extends ApplicationError {
  readonly category = "NetworkError";
  readonly statusCode = 502;
}

export class ExternalServiceError extends ApplicationError {
  readonly category = "ExternalServiceError";
  readonly statusCode = 502;
}

export class PersistenceError extends ApplicationError {
  readonly category = "PersistenceError";
  readonly statusCode = 500;
}

export class RateLimitError extends ApplicationError {
  readonly category = "RateLimitError";
  readonly statusCode = 429;
}

export class UnknownError extends ApplicationError {
  readonly category = "UnknownError";
  readonly statusCode = 500;
}

/**
 * Maps any caught exception or provider error into the canonical ApplicationError hierarchy.
 */
export function mapToApplicationError(err: unknown, fallbackCategory: ErrorCategory = "UnknownError"): ApplicationError {
  if (err instanceof ApplicationError) {
    return err;
  }

  const message = err instanceof Error ? err.message : String(err || "An unknown error occurred.");

  // Check common Supabase and network patterns
  const lower = message.toLowerCase();
  if (lower.includes("jwt") || lower.includes("unauthorized") || lower.includes("invalid login")) {
    return new AuthenticationError(message);
  }
  if (lower.includes("forbidden") || lower.includes("not allowed") || lower.includes("row-level security")) {
    return new AuthorizationError(message);
  }
  if (lower.includes("email not confirmed") || lower.includes("unverified")) {
    return new VerificationError(message);
  }
  if (lower.includes("rate limit") || lower.includes("too many requests") || lower.includes("429")) {
    return new RateLimitError(message);
  }
  if (lower.includes("not found") || lower.includes("404")) {
    return new NotFoundError(message);
  }
  if (lower.includes("already exists") || lower.includes("unique constraint") || lower.includes("conflict")) {
    return new ConflictError(message);
  }
  if (lower.includes("fetch failed") || lower.includes("network") || lower.includes("econnrefused")) {
    return new NetworkError(message);
  }

  switch (fallbackCategory) {
    case "ValidationError":
      return new ValidationError(message);
    case "AuthenticationError":
      return new AuthenticationError(message);
    case "VerificationError":
      return new VerificationError(message);
    case "AuthorizationError":
      return new AuthorizationError(message);
    case "NotFoundError":
      return new NotFoundError(message);
    case "ConflictError":
      return new ConflictError(message);
    case "NetworkError":
      return new NetworkError(message);
    case "ExternalServiceError":
      return new ExternalServiceError(message);
    case "PersistenceError":
      return new PersistenceError(message);
    case "RateLimitError":
      return new RateLimitError(message);
    default:
      return new UnknownError(message);
  }
}
