import axios from 'axios';
import { debugLog } from '../utils/debugLog';

function getDefaultApiBaseUrl() {
  // Prefer an explicit env var (works in dev/prod).
  const explicit = (import.meta.env.VITE_API_URL || '').trim();
  if (explicit) return explicit;

  if (typeof window !== 'undefined') {
    const { port } = window.location;
    // Vite dev (incl. Docker on :5173): use same-origin /api proxy — avoids CORS when
    // the UI is opened as http://127.0.0.1:5173 but API was hardcoded to localhost:5000.
    if (import.meta.env.DEV || port === '5173') {
      return '/api';
    }
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `${window.location.protocol}//${host}:5000/api`;
    }
  }

  return '/api';
}

const API_URL = getDefaultApiBaseUrl();

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  // If we're sending FormData, do not force a JSON content-type.
  // Let the browser/axios set `multipart/form-data; boundary=...` automatically.
  if (config.data instanceof FormData) {
    if (config.headers) {
      // AxiosHeader types vary across versions; use best-effort deletes.
      delete (config.headers as any)['Content-Type'];
      delete (config.headers as any)['content-type'];
    }
  } else {
    config.headers = config.headers ?? {};
    (config.headers as any)['Content-Type'] = (config.headers as any)['Content-Type'] || 'application/json';
  }

  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = String(error.config?.url || '');
      const isAuthAttempt = /\/auth\/(login|register)$/.test(url);
      if (!isAuthAttempt) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    const status = error.response?.status;
    const url = String(error.config?.url || '');
    const method = String(error.config?.method || '').toUpperCase();
    if (status && status >= 400) {
      debugLog({
        location: 'axios.ts:response',
        message: 'API error',
        hypothesisId: 'api-error',
        data: {
          status,
          method,
          url,
          apiMessage: error.response?.data?.message,
        },
      });
    }
    return Promise.reject(error);
  }
);

export default api;
