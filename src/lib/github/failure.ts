import { ZodError } from "zod";

/**
 * A short reason for a failed sync step, safe for the function log. Our own
 * errors carry a fixed message and at most an HTTP status; anything that could
 * echo a response body (a parse error, a schema mismatch) is reduced to its
 * kind. Tokens and headers never reach an error message in this code.
 */
export function failureReason(error: unknown): string {
  if (error instanceof ZodError) return "unexpected response shape";
  if (error instanceof SyntaxError) return "invalid JSON response";
  if (!(error instanceof Error)) return "unknown error";
  const label =
    error.name && error.name !== "Error"
      ? `${error.name}: ${error.message}`
      : error.message;
  return label.slice(0, 160) || "unknown error";
}

/** Names the settings that are missing, never their values. */
export function missingConfig(settings: Record<string, unknown>): string {
  return Object.entries(settings)
    .filter(([, value]) => !value)
    .map(([name]) => name)
    .join(", ");
}
