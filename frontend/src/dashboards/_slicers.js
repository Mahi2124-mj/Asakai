import { MONTHS, fmtDate, lastDay, workDays } from './_gen.js';

// `options` is an array or a function, re-evaluated on every render so a board left running for
// days keeps current dates. `def` is the value a slicer opens with and returns to on
// "Clear all slicers". `master` slicers take their options from the machine master.

const yesterday = () => fmtDate(lastDay()); // last working day: on Monday this is Saturday
const year = () => new Date().getFullYear();

export const S = {
  date: (label = 'Date') => ({ key: 'date', label, type: 'select', options: () => workDays(12).reverse().map((d) => fmtDate(d)), def: yesterday }),
  lastDay: (label = 'Last Day') => ({ key: 'lastDay', label, type: 'select', options: () => workDays(6).reverse().map((d) => fmtDate(d)) }),
  day: () => ({ key: 'day', label: 'Day', type: 'select', options: Array.from({ length: 31 }, (_, i) => String(i + 1)) }),
  month: (label = 'Month') => ({ key: 'month', label, type: 'select', options: MONTHS }),
  year: () => ({ key: 'year', label: 'Year', type: 'select', options: () => [String(year() - 1), String(year()), String(year() + 1)] }),
  fy: (label = 'Financial Year') => ({ key: 'fy', label, type: 'select', options: () => [`${year() - 1}-${year()}`, `${year()}-${year() + 1}`] }),
  shift: () => ({ key: 'shift', label: 'Shift', type: 'select', options: ['A', 'B'] }),
  shiftBtn: (side = false) => ({ key: 'shift', label: 'Shift', type: 'buttons', options: ['A', 'B'], side }),
  model: (options, label = 'Model Name') => ({ key: 'model', label, type: 'select', options, wide: true }),
  lines: (options, label = 'Line', side = true) => ({ key: 'line', label, type: 'buttons', options, side }),
  select: (key, label, options, extra = {}) => ({ key, label, type: 'select', options, ...extra }),
  // Machine master (maintenance_db): Zone -> Line -> Machine No., each one narrows the next.
  zone: (label = 'Zone') => ({ key: 'zone', label, type: 'select', master: 'zone' }),
  masterLine: (label = 'Line') => ({ key: 'line', label, type: 'select', master: 'line' }),
  machine: (label = 'Machine No.') => ({ key: 'machine', label, type: 'select', master: 'machine', wide: true }),
};

/** Last working day as Day / Month / Year, for dashboards sliced that way instead of by Date. */
export const YESTERDAY = {
  day: () => String(lastDay().getDate()),
  month: () => MONTHS[lastDay().getMonth()],
  year: () => String(lastDay().getFullYear()),
};

export function defaultFilters(slicers) {
  const f = {};
  for (const s of slicers) {
    const v = typeof s.def === 'function' ? s.def() : s.def;
    if (v) f[s.key] = v;
  }
  return f;
}

/** Changing a parent slicer clears the ones it narrows. */
export const CASCADE = { zone: ['line', 'machine'], line: ['machine'] };

export const RAIL_MODELS = ['YTA Lower Rail(4CN)', 'YTA Upper Rail(4DN)', 'YY8 Upper Rail(4FN)', 'YY8 Lower Rail(4EN)', 'YFG Upper Rail(4D)', 'YFG Lower Rail(4C)'];
