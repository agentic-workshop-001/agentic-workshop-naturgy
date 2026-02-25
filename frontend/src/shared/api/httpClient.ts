const BASE = '/api/gas';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = await res.json();
      message = body.message ?? body.error ?? message;
    } catch {
      // ignore
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
