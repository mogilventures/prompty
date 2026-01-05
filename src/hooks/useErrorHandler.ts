import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { isAppError, getUserMessage } from "@/lib/errors";

interface ErrorHandlerOptions {
  /** Context label for logging (e.g., "submitPrompt", "joinRoom") */
  context?: string;
  /** Whether to show a toast notification (default: true) */
  showToast?: boolean;
  /** Custom title for the toast */
  title?: string;
}

/**
 * Hook for consistent error handling across the application.
 * Provides a unified way to log errors and show user-friendly notifications.
 *
 * @example
 * ```tsx
 * const { handleError } = useErrorHandler();
 *
 * try {
 *   await submitPrompt({ roomId, prompt });
 * } catch (error) {
 *   handleError(error, { context: "submitPrompt" });
 * }
 * ```
 */
export function useErrorHandler() {
  const { toast } = useToast();

  const handleError = useCallback(
    (error: unknown, options: ErrorHandlerOptions = {}) => {
      const { context, showToast = true, title = "Error" } = options;
      const userMessage = getUserMessage(error);

      // Log error with context for debugging
      const logPrefix = context ? `[${context}]` : "[Error]";
      console.error(logPrefix, error);

      // Log additional details for AppErrors
      if (isAppError(error)) {
        console.error(`${logPrefix} Code: ${error.code}`);
      }

      // Show toast notification
      if (showToast) {
        toast({
          title,
          description: userMessage,
          variant: "destructive",
        });
      }

      return userMessage;
    },
    [toast]
  );

  /**
   * Wrap an async function with error handling
   */
  const withErrorHandling = useCallback(
    <T extends (...args: unknown[]) => Promise<unknown>>(
      fn: T,
      options: ErrorHandlerOptions = {}
    ) => {
      return async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
        try {
          return await fn(...args) as ReturnType<T>;
        } catch (error) {
          handleError(error, options);
          return undefined;
        }
      };
    },
    [handleError]
  );

  return {
    handleError,
    withErrorHandling,
  };
}
