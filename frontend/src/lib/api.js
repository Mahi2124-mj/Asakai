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
  memo.clear();
}

/**
 * Low-level call. `etag` sends If-None-Match (a 304 comes back as { notModified: true }),
 * `signal` lets the caller cancel (e.g. the slicer changed again before the answer arrived).
 */
export async function call(path, { method = 'GET', body, auth = true, etag, signal } = {}) {
  const base = getApiUrl();
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, TIMEOUT_MS);
  const cancel = () => ctrl.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    const headers = { Accept: 'application/json' };
    if (body) headers['Content-Type'] = 'application/json';
    if (etag) headers['If-None-Match'] = etag;
    const token = getToken();
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: ctrl.signal });
    if (res.status === 304) return { notModified: true, etag };
    const json = await res.json().catch(() => ({}));
    if (res.status === 401 && auth) {
      clearSession();
      window.dispatchEvent(new Event('asakai:logout'));
    }
    if (!res.ok) throw new Error(json.detail || `Server error ${res.status}`);
    return { json, etag: res.headers.get('ETag') };
  } catch (e) {
    if (e.name === 'AbortError') {
      if (!timedOut) throw e; // cancelled by the caller: let it see the AbortError
      throw new Error('Server did not respond (timeout)');
    }
    throw e;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

async function request(path, opts) {
  return (await call(path, opts)).json;
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

// Recent answers per dashboard + filters. Moving back and forth through the meeting flow reuses
// them instead of asking the server again; after FRESH_MS they are revalidated with their ETag,
// so an unchanged dashboard costs the server a 304 with no body.
const memo = new Map();
const FRESH_MS = 60 * 1000;
const MEMO_MAX = 40;

function remember(ck, entry) {
  memo.delete(ck);
  memo.set(ck, entry);
  if (memo.size > MEMO_MAX) memo.delete(memo.keys().next().value);
}

/**
 * Load a dashboard. With a server configured, data comes from
 * GET /api/dashboards/{key}?filters; otherwise (or on failure) bundled demo data.
 * `force` skips the fresh-cache shortcut (auto-refresh / Refresh button).
 */
export async function getDashboard(key, filters = {}, { force = false, signal } = {}) {
  const active = Object.fromEntries(Object.entries(filters).filter(([, v]) => v && v !== 'All').sort());
  if (getApiUrl() && getToken() !== 'demo') {
    const qs = new URLSearchParams(active).toString();
    const ck = `${getApiUrl()}|${key}?${qs}`;
    const prev = memo.get(ck);
    if (prev && !force && Date.now() - prev.at < FRESH_MS) return prev.res;
    try {
      const r = await call(`/api/dashboards/${key}${qs ? `?${qs}` : ''}`, { etag: prev?.etag, signal });
      if (r.notModified && prev) {
        remember(ck, { ...prev, at: Date.now() });
        return prev.res;
      }
      const res = { data: r.json.data, source: r.json.source || 'server', updatedAt: r.json.updated_at };
      remember(ck, { res, etag: r.etag, at: Date.now() });
      return res;
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      // Last good server data beats demo data while the server is briefly unreachable.
      if (prev) return { ...prev.res, error: e.message };
      return { data: demoData(key, active), source: 'demo', error: e.message, updatedAt: new Date().toISOString() };
    }
  }
  return { data: demoData(key, active), source: 'demo', updatedAt: new Date().toISOString() };
}
