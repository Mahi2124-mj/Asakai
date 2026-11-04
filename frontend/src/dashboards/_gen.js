// Deterministic demo-data helpers. Pure JS (no DOM) so the backend export script can import them.

export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed) {
  let a = typeof seed === 'number' ? seed : hashSeed(String(seed));
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.int = (min, max) => Math.floor(next() * (max - min + 1)) + min;
  next.float = (min, max, dp = 2) => +(next() * (max - min) + min).toFixed(dp);
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  next.chance = (p) => next() < p;
  return next;
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n) => String(n).padStart(2, '0');

export function fmtDate(d, style = 'dd-mm-yy') {
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yy = String(d.getFullYear()).slice(2);
  switch (style) {
    case 'dd-mon-yy': return `${dd}-${MON[d.getMonth()]}-${yy}`;
    case 'm/d/yyyy': return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    case 'dd-mm-yyyy': return `${dd}-${mm}-${d.getFullYear()}`;
    case 'long': return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: '2-digit', year: 'numeric' });
    case 'day': return String(d.getDate());
    default: return `${dd}-${mm}-${yy}`;
  }
}

/** Last `n` working days (Sundays skipped), oldest first, ending yesterday. */
export function workDays(n, end = new Date()) {
  const out = [];
  const d = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  d.setDate(d.getDate() - 1);
  while (out.length < n) {
    if (d.getDay() !== 0) out.push(new Date(d));
    d.setDate(d.getDate() - 1);
  }
  return out.reverse();
}

export function lastDay() {
  return workDays(1)[0];
}

/** Rows for every (day, shift) pair. */
export function dayShifts(days, shifts = ['A', 'B'], style = 'dd-mm-yy') {
  const rows = [];
  for (const d of days) for (const s of shifts) rows.push({ date: fmtDate(d, style), shift: s, x: `${s} ${fmtDate(d, style)}`, _d: d });
  return rows;
}

export const strip = (rows) => rows.map(({ _d, ...rest }) => rest);

export function pareto(items) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, i) => s + i.value, 0) || 1;
  let cum = 0;
  return sorted.map((i) => {
    cum += i.value;
    return { ...i, cum: +((cum / total) * 100).toFixed(1) };
  });
}

export const sum = (arr, k) => arr.reduce((s, r) => s + (k ? Number(r[k]) || 0 : Number(r) || 0), 0);

export const PEOPLE = ['Rakesh', 'Naveen', 'Dinesh', 'Rajesh', 'Akash', 'Ankit', 'Digvijay', 'Sanjeev', 'Himanshu', 'Ravi', 'Sunil', 'Anwar Khan', 'Ritesh', 'Jatin', 'Anuj', 'Davinder', 'I.K Panday', 'Chanderma'];
