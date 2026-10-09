import { useCallback } from 'react';
import { useAuth } from '@clerk/expo';
import { API_URL } from './config';

// The web app's API routes read the Clerk session from the Authorization header,
// so the mobile app reuses every endpoint as-is.
export function useApi() {
  const { getToken, isSignedIn } = useAuth();

  const request = useCallback(
    async (path, { method = 'GET', body, headers = {} } = {}) => {
      const token = isSignedIn ? await getToken().catch(() => null) : null;
      const res = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
          ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text.slice(0, 120) }; }
      if (!res.ok) {
        const err = new Error(data.error || `Request failed (${res.status})`);
        err.status = res.status;
        throw err;
      }
      return data;
    },
    [getToken, isSignedIn]
  );

  return {
    get: (p) => request(p),
    post: (p, body) => request(p, { method: 'POST', body }),
    patch: (p, body) => request(p, { method: 'PATCH', body }),
    del: (p, body) => request(p, { method: 'DELETE', body }),
    request,
  };
}
