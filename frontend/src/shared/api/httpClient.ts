/**
 * Central HTTP client — Naturgy React Standards
 * SSOT: _data/specs/react-standards.md
 *
 * Error mapping:
 *   400 → show server message
 *   404 → "Recurso no encontrado"
 *   500 → "Error interno del servidor"
 *   others → generic "Error {status}"
 *
 * Note: Do NOT log PII or sensitive data.
 */
const BASE = '/api/gas';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message: string;

    if (res.status === 404) {
      message = 'Recurso no encontrado (404)';
    } else if (res.status >= 500) {
      message = 'Error interno del servidor. Inténtelo de nuevo más tarde.';
    } else {
      // 400 / 422 / other 4xx → prefer server message
      message = `Error ${res.status}`;
      try {
        const body = await res.json() as Record<string, unknown>;
        const serverMsg = body['message'] ?? body['error'] ?? body['detail'];
        if (typeof serverMsg === 'string' && serverMsg.trim()) {
          message = serverMsg;
        }
      } catch {
        // response body is not JSON — keep the default message
      }
    }

    throw new Error(message);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const http = {
  get<T>(path: string): Promise<T> {
    return fetch(`${BASE}${path}`).then((r) => handleResponse<T>(r));
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then((r) => handleResponse<T>(r));
  },
  put<T>(path: string, body: unknown): Promise<T> {
    return fetch(`${BASE}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => handleResponse<T>(r));
  },
  del(path: string): Promise<void> {
    return fetch(`${BASE}${path}`, { method: 'DELETE' }).then((r) =>
      handleResponse<void>(r)
    );
  },
};

