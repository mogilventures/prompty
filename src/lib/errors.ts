/**
 * Custom error types for structured error handling
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", message);
    this.name = "ValidationError";
  }
}

export class NetworkError extends AppError {
  constructor(message: string = "Network error") {
    super(message, "NETWORK_ERROR", "Connection failed. Please try again.");
    this.name = "NetworkError";
  }
}

export class AuthError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, "AUTH_ERROR", "Please sign in to continue.");
    this.name = "AuthError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, "NOT_FOUND", `${resource} could not be found.`);
    this.name = "NotFoundError";
  }
}

export class GameError extends AppError {
  constructor(message: string, userMessage?: string) {
    super(message, "GAME_ERROR", userMessage ?? message);
    this.name = "GameError";
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Extract a user-friendly message from any error
 */
export function getUserMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}
