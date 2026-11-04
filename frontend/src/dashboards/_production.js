// Shared widget builders + demo generators for the production-zone dashboards.
import { C, SERIES, STATUS, RAMP, NEUTRAL, TARGET } from '../theme.js';
import { fmtDate, pareto, PEOPLE } from './_gen.js';

export const bands = (hi, lo, hiLabel, midLabel, loLabel) => [
  { min: hi, color: STATUS.good, label: hiLabel || `≥ ${hi}` },
  ...(lo != null ? [{ min: lo, color: STATUS.warn, label: midLabel || `${lo} ~ ${hi}` }] : []),
  { min: -Infinity, color: STATUS.bad, label: loLabel || `< ${lo ?? hi}` },
];

export const LEVELS = [
  { key: 'ojt', name: 'OJT', color: RAMP[0] },
  { key: 'l1', name: 'L-1', color: RAMP[1] },
  { key: 'l2', name: 'L-2', color: RAMP[2] },
  { key: 'l3', name: 'L-3', color: RAMP[3] },
  { key: 'l4', name: 'L-4', color: RAMP[4] },
  { key: 'other', name: 'Other section', color: NEUTRAL },
];

export const W = {
  quality: (d, cats, extra = {}) => ({
    type: 'bar', title: 'Quality Status', titleStyle: 'big', d, x: 'x', x2: 'x2', span: 4, h: 210, yLabel: 'Rej. Qty.',
    series: cats.map((c, i) => ({ key: c.key, name: c.name, color: c.color || SERIES[i], stack: 'q' })),
    ...extra,
  }),
  manpower: (d, extra = {}) => ({
    type: 'bar', title: 'Manpower Status', titleStyle: 'big', d, x: 'x', x2: 'x2', span: 4, h: 210, yLabel: 'Manpower (Nos.)', minBarWidth: 26,
    series: [...LEVELS.map((l) => ({ ...l, stack: 'm', label: l.key === 'l2' || l.key === 'l3' })), { key: 'plan', name: 'Plan M/P', color: TARGET, type: 'line', dashed: true }],
    ...extra,
  }),
  threshold: (d, title, target, bnds, extra = {}) => ({
    type: 'threshold', title, titleStyle: 'big', d, x: 'x', x2: 'x2', key: 'value', target, bands: bnds, span: 4, h: 210, fmt: 'pct2', minBarWidth: 26, ...extra,
  }),
  planActual: (d, names = ['Plan Qty.', 'Actual Qty.', 'Cumulative Gap'], extra = {}) => ({
    type: 'bar', title: 'Plan vs Actual', titleStyle: 'big', d, x: 'x', x2: 'x2', span: 5, h: 220, yLabel: 'Quantity', labelFmt: 'k2', yFmt: 'k', labelAngle: -90, minBarWidth: 50,
    series: [
      { key: 'plan', name: names[0], color: C.blue },
      { key: 'actual', name: names[1], color: C.navy },
      { key: 'gap', name: names[2], color: C.orange },
    ],
    ...extra,
  }),
  oits: (d, extra = {}) => ({ type: 'donut', title: 'OITS Status', titleStyle: 'big', d, span: 3, h: 220, centerTotal: true, ...extra }),
  pie4m: (d, title = 'Sum of Losses in Minute by 4M Category', extra = {}) => ({ type: 'donut', title, d, span: 4, h: 240, inner: 0, fmt: 'kpct', ...extra }),
  lossTable: (d, extra = {}) => ({
    type: 'table', title: 'Losses', d, span: 8, maxH: 420, total: { label: 'Total', keys: ['loss'] },
    columns: [
      { key: 'date', label: 'Date', w: 80 }, { key: 'shift', label: 'Shift', w: 50 }, { key: 'line', label: 'Line', w: 100 },
      { key: 'cat', label: '4M Category', w: 90 }, { key: 'process', label: 'Process Name', w: 180 }, { key: 'reason', label: 'Reason', w: 220 },
      { key: 'loss', label: 'Losses in Minute', align: 'right', w: 90 },
    ],
    ...extra,
  }),
  qualityTable: (d, extra = {}) => ({
    type: 'table', title: 'Rejection Detail', d, span: 8, maxH: 460, total: { label: 'Total', keys: ['qty'] },
    columns: [
      { key: 'date', label: 'Date', w: 80 }, { key: 'shift', label: 'Shift', w: 50 }, { key: 'cat', label: 'Category', w: 100 },
      { key: 'model', label: 'Model Name', w: 170 }, { key: 'process', label: 'Process', w: 170 }, { key: 'defect', label: 'Defect Name', w: 160 },
      { key: 'qty', label: 'Rej. Qty.', align: 'right', w: 70 }, { key: 'reason', label: 'Reason', w: 130 }, { key: 'img', label: 'Defect Image', type: 'img', w: 90 },
    ],
    ...extra,
  }),
  oitsTable: (d, extra = {}) => ({
    type: 'table', title: 'OITS', d, span: 12, maxH: 520,
    columns: [
      { key: 'line', label: 'Line' }, { key: 'process', label: 'Process' }, { key: 'issue', label: 'Issue', w: 200 }, { key: 'action', label: 'Action Taken', w: 150 },
      { key: 'raisedBy', label: 'Raised By' }, { key: 'opened', label: 'Date Opened' }, { key: 'cm', label: 'Countermeasure', w: 200 },
      { key: 'status', label: 'Status', type: 'status' }, { key: 'closed', label: 'Date Closed' }, { key: 'pic', label: 'Person In Charge' }, { key: 'due', label: 'Due Date' },
    ],
    ...extra,
  }),
  pareto: (d, title, extra = {}) => ({ type: 'pareto', title, d, span: 12, h: 380, ...extra }),
};

// ---------- demo generators ----------

export function shiftRows(days, shifts = ['A', 'B']) {
  const out = [];
  for (const d of days) for (const s of shifts) out.push({ x: s, x2: fmtDate(d), _d: d, shift: s, date: fmtDate(d) });
  return out;
}

export function genManpower(r, rows, plan) {
  return rows.map(({ _d, ...row }) => {
    const total = plan - (r.chance(0.15) ? r.int(1, 6) : 0);
    const l3 = r.int(4, 13);
    const l1 = r.int(0, 1);
    const ojt = r.int(0, 1);
    const other = r.chance(0.2) ? 1 : 0;
    const l4 = 0;
    const l2 = Math.max(0, total - l3 - l1 - ojt - other);
    return { ...row, ojt, l1, l2, l3, l4, other, plan };
  });
}

export function genPlanActual(r, rows, base, { cumulative = true } = {}) {
  let cum = 0;
  return rows.map(({ _d, ...row }) => {
    const plan = Math.round(base * r.float(0.9, 1.1));
    const actual = Math.round(plan * r.float(0.95, 1.12));
    cum += actual - plan;
    return { ...row, plan, actual, gap: cumulative ? cum : actual - plan };
  });
}

export function genThreshold(r, rows, lo, hi, dp = 2) {
  return rows.map(({ _d, ...row }) => ({ ...row, value: r.float(lo, hi, dp) }));
}

export function genOits(r, open = 0, closed = 6) {
  return [
    { name: 'CLOSED', value: closed, color: STATUS.closed },
    ...(open ? [{ name: 'OPEN', value: open, color: STATUS.open }] : []),
  ];
}

const M4 = [
  { name: 'Method', color: C.blue }, { name: 'Machine', color: C.navy }, { name: 'Man', color: C.orange },
  { name: 'Other', color: C.aqua }, { name: 'Quality', color: C.violet }, { name: 'Material', color: C.pink },
];

export function gen4m(r, total, weights = [0.5, 0.25, 0.12, 0.06, 0.05, 0.02]) {
  return M4.map((m, i) => ({ ...m, value: Math.round(total * weights[i] * r.float(0.8, 1.2)) })).filter((x) => x.value > 0);
}

export function genLosses(r, days, lines, processes, reasons, n = 14) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      date: fmtDate(r.pick(days)), shift: r.pick(['A', 'B']), line: r.pick(lines),
      cat: r.pick(['MACHINE', 'MACHINE', 'MAN', 'METHOD', 'QUALITY']), process: r.pick(processes), reason: r.pick(reasons),
      loss: r.int(5, 160),
    });
  }
  return rows.sort((a, b) => b.loss - a.loss);
}

export function genRejections(r, days, models, processes, defects, n = 10) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      date: fmtDate(r.pick(days)), shift: r.pick(['A', 'B']), cat: r.pick(['Process Issue', 'Process Issue', 'Child Part Issue']),
      model: r.pick(models), process: r.pick(processes), defect: r.pick(defects), qty: r.int(1, 4), reason: r.pick(['R/B Error', 'Robot hold', 'Wire stuck in feeder', 'BOP', 'Not found', '-']), img: '',
    });
  }
  return rows.sort((a, b) => (a.date > b.date ? 1 : -1));
}

export function genPareto(r, defects, max = 14) {
  return pareto(defects.map((name) => ({ name, value: r.int(1, max) })));
}

export function genOitsRows(r, days, lines, issues, n = 6) {
  return Array.from({ length: n }, (_, i) => {
    const iss = issues[i % issues.length];
    const closed = r.chance(0.8);
    return {
      line: r.pick(lines), process: r.pick(['ALL', 'FINAL INSPECTION', 'PPP_03', '-']), issue: iss[0], action: iss[1] || '-', raisedBy: 'PRODUCTION',
      opened: fmtDate(r.pick(days), 'm/d/yyyy'), cm: iss[2] || '-', status: closed ? 'CLOSED' : 'OPEN', closed: closed ? fmtDate(r.pick(days)) : '-',
      pic: r.pick(PEOPLE), due: fmtDate(r.pick(days)),
    };
  });
}
