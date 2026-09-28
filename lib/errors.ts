// An error with an HTTP status that API routes return to the caller as-is.
// `code` (with `params`) lets the browser show the message in the viewer's
// language; `message` is the English fallback.
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public params?: Record<string, string | number>) {
    super(message);
  }
}
