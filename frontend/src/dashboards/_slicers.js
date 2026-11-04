import { MONTHS, fmtDate, workDays } from './_gen.js';

const y = new Date().getFullYear();

export const S = {
  date: (label = 'Date') => ({ key: 'date', label, type: 'select', options: workDays(12).reverse().map((d) => fmtDate(d)) }),
  lastDay: (label = 'Last Day') => ({ key: 'lastDay', label, type: 'select', options: workDays(6).reverse().map((d) => fmtDate(d)) }),
  day: () => ({ key: 'day', label: 'Day', type: 'select', options: Array.from({ length: 31 }, (_, i) => String(i + 1)) }),
  month: (label = 'Month') => ({ key: 'month', label, type: 'select', options: MONTHS }),
  year: () => ({ key: 'year', label: 'Year', type: 'select', options: [String(y - 1), String(y), String(y + 1)] }),
  fy: (label = 'Financial Year') => ({ key: 'fy', label, type: 'select', options: [`${y - 1}-${y}`, `${y}-${y + 1}`] }),
  shift: () => ({ key: 'shift', label: 'Shift', type: 'select', options: ['A', 'B'] }),
  shiftBtn: (side = false) => ({ key: 'shift', label: 'Shift', type: 'buttons', options: ['A', 'B'], side }),
  model: (options, label = 'Model Name') => ({ key: 'model', label, type: 'select', options, wide: true }),
  lines: (options, label = 'Line', side = true) => ({ key: 'line', label, type: 'buttons', options, side }),
  select: (key, label, options, extra = {}) => ({ key, label, type: 'select', options, ...extra }),
};

export const RAIL_MODELS = ['YTA Lower Rail(4CN)', 'YTA Upper Rail(4DN)', 'YY8 Upper Rail(4FN)', 'YY8 Lower Rail(4EN)', 'YFG Upper Rail(4D)', 'YFG Lower Rail(4C)'];
