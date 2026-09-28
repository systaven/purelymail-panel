// Browser-side fetch for the panel's API. Errors keep the server's error code
// so the UI can show them in the viewer's language (see useErrorText).

export class ApiClientError extends Error {
  constructor(message: string, public status: number, public code?: string, public params?: Record<string, string | number>) {
    super(message);
  }
}

export async function apiFetch<T = any>(url: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiClientError('Network error', 0, 'network_error');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.details ? `${data.error}: ${data.details}` : data.error || `Request failed (${response.status})`;
    throw new ApiClientError(message, response.status, data.code, data.params);
  }
  return data as T;
}
