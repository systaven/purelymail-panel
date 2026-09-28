// An error with an HTTP status that API routes return to the caller as-is.
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}
