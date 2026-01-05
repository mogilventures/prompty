/**
 * Structured logging utility for Convex functions.
 * Provides consistent log formatting across all game modules.
 */

type LogData = Record<string, unknown>;

/**
 * Creates a logger instance for a specific module.
 * All logs are prefixed with the module name for easy filtering.
 *
 * @param module - The module name (e.g., "game:voting", "game:phases")
 *
 * @example
 * ```ts
 * const log = createLogger("game:voting");
 * log.info("vote_submitted", { playerId, imageId });
 * log.error("vote_failed", error, { playerId });
 * ```
 */
export function createLogger(module: string) {
  const formatMessage = (action: string) => `[${module}:${action}]`;

  return {
    /**
     * Log debug information (verbose, development only)
     */
    debug: (action: string, data?: LogData) => {
      console.log(formatMessage(action), data ?? "");
    },

    /**
     * Log general information
     */
    info: (action: string, data?: LogData) => {
      console.log(formatMessage(action), data ?? "");
    },

    /**
     * Log warnings (non-critical issues)
     */
    warn: (action: string, data?: LogData) => {
      console.warn(formatMessage(action), data ?? "");
    },

    /**
     * Log errors with optional error object
     */
    error: (action: string, error: unknown, data?: LogData) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(formatMessage(action), {
        error: errorMessage,
        ...data,
      });
    },

    /**
     * Log with timing information for performance tracking
     */
    timed: (action: string, startTime: number, data?: LogData) => {
      const duration = Date.now() - startTime;
      console.log(formatMessage(action), {
        durationMs: duration,
        ...data,
      });
    },
  };
}

/**
 * Pre-configured loggers for game modules.
 * Import these directly for convenience.
 */
export const gameLog = {
  lifecycle: createLogger("game:lifecycle"),
  phases: createLogger("game:phases"),
  prompts: createLogger("game:prompts"),
  voting: createLogger("game:voting"),
  generation: createLogger("game:generation"),
  scoring: createLogger("game:scoring"),
  rounds: createLogger("game:rounds"),
  state: createLogger("game:state"),
};
