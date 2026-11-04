import { useEffect, useState } from 'react';
import { call, getApiUrl, getToken } from './api.js';
import { DEMO_MACHINES, matchMachines } from '../dashboards/_machines.js';

// Machine master ([zone, line, machine_no, machine_name] rows) for the Zone / Line / Machine No.
// slicers. It changes rarely, so it is fetched once per app session, kept on the device for
// TTL_MS, then revalidated with its ETag (an unchanged master costs the server a 304).
const LS = 'asakai.master.machines';
const TTL_MS = 12 * 60 * 60 * 1000;

let mem = null; // { rows, source, at, etag, server }
let inflight = null;

function readStored(server) {
  try {
    const s = JSON.parse(localStorage.getItem(LS));
    return s && s.server === server && Array.isArray(s.rows) ? s : null;
  } catch {
    return null;
  }
}

function store(entry) {
  mem = entry;
  try { localStorage.setItem(LS, JSON.stringify(entry)); } catch { /* storage full or blocked */ }
}

async function fetchMachines() {
  const server = getApiUrl();
  if (!server || getToken() === 'demo') return { rows: DEMO_MACHINES, source: 'demo' };
  const prev = mem?.server === server ? mem : readStored(server);
  if (prev && Date.now() - prev.at < TTL_MS) return (mem = prev);
  try {
    const r = await call('/api/masters/machines', { etag: prev?.etag });
    if (r.notModified && prev) {
      store({ ...prev, at: Date.now() });
    } else {
      store({ rows: r.json.rows || [], source: r.json.source || 'server', etag: r.etag, at: Date.now(), server });
    }
    return mem;
  } catch {
    // Maintenance DB not configured / unreachable: last known master, else the demo list.
    return prev || { rows: DEMO_MACHINES, source: 'demo' };
  }
}

export function loadMachines() {
  if (!inflight) inflight = fetchMachines().finally(() => { inflight = null; });
  return inflight;
}

/** Master rows once loaded ([] until then). `enabled` = the page has master slicers. */
export function useMachineMaster(enabled) {
  const [rows, setRows] = useState(() => (enabled && mem ? mem.rows : []));
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    loadMachines().then((m) => { if (alive) setRows(m.rows); });
    return () => { alive = false; };
  }, [enabled]);
  return rows;
}

const uniq = (arr) => [...new Set(arr)];

/** Options for a master slicer, narrowed by the parent slicers already chosen. */
export function masterOptions(rows, kind, f) {
  if (kind === 'zone') return uniq(rows.map((m) => m[0]));
  if (kind === 'line') return uniq(matchMachines(rows, { zone: f.zone }).map((m) => m[1]));
  const seen = new Set();
  return matchMachines(rows, { zone: f.zone, line: f.line }).filter((m) => !seen.has(m[2]) && seen.add(m[2]))
    .map((m) => ({ value: m[2], label: m[3] ? `${m[2]} · ${m[3]}` : m[2] }));
}
