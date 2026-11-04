import { demoData } from '../dashboards/index.js';

const LS = { api: 'asakai.apiUrl', token: 'asakai.token', user: 'asakai.user' };
const TIMEOUT_MS = 12000;

/** Server base URL. Empty string = offline demo mode (bundled sample data). */
export function getApiUrl() {
  const saved = localStorage.getItem(LS.api);
  if (saved !== null) return saved;
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

export function setApiUrl(url) {
  localStorage.setItem(LS.api, (url || '').trim().replace(/\/$/, ''));
}

export const getToken = () => localStorage.getItem(LS.token);
export const getUser = () => {
  try { return JSON.parse(localStorage.getItem(LS.user)); } catch { return null; }
};

function saveSession(token, user) {
  localStorage.setItem(LS.token, token);
  localStorage.setItem(LS.user, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(LS.token);
  localStorage.removeItem(LS.user);
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const base = getApiUrl();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const headers = { Accept: 'application/json' };
    if (body) headers['Content-Type'] = 'application/json';
    const token = getToken();
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: ctrl.signal });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401 && auth) {
      clearSession();
      window.dispatchEvent(new Event('asakai:logout'));
    }
    if (!res.ok) throw new Error(json.detail || `Server error ${res.status}`);
    return json;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Server did not respond (timeout)');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function login(username, password) {
  if (!username || !password) throw new Error('Enter username and password');
  if (!getApiUrl()) {
    // Demo mode: no server configured yet.
    const user = { username, full_name: username, role: 'viewer', demo: true };
    saveSession('demo', user);
    return user;
  }
  const res = await request('/api/auth/login', { method: 'POST', body: { username, password }, auth: false });
  saveSession(res.access_token, res.user);
  return res.user;
}

export async function health(url) {
  const base = (url ?? getApiUrl()).replace(/\/$/, '');
  const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Load a dashboard. With a server configured, data comes from
 * GET /api/dashboards/{key}?filters; otherwise (or on failure) bundled demo data.
 */
export async function getDashboard(key, filters = {}) {
  const active = Object.fromEntries(Object.entries(filters).filter(([, v]) => v && v !== 'All'));
  if (getApiUrl() && getToken() !== 'demo') {
    try {
      const qs = new URLSearchParams(active).toString();
      const res = await request(`/api/dashboards/${key}${qs ? `?${qs}` : ''}`);
      return { data: res.data, source: res.source || 'server', updatedAt: res.updated_at };
    } catch (e) {
      return { data: demoData(key, active), source: 'demo', error: e.message, updatedAt: new Date().toISOString() };
    }
  }
  return { data: demoData(key, active), source: 'demo', updatedAt: new Date().toISOString() };
}
