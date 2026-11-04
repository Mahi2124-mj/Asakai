import { C, TARGET } from '../theme.js';
import { fmtDate, workDays } from './_gen.js';
import { S } from './_slicers.js';
import { W, bands, genManpower, genThreshold, genLosses, genRejections, genPareto, gen4m, genOits } from './_production.js';

const TYPES = ['4WAY', '6WAY', 'SA_LPS', 'WELD SHOP'];
const LINES = ['SA_4W_Y17', 'SA_4W_YHB', 'SA_4W_YNC', 'SA_4W_YRA', 'SA_4W_YSD', 'SA_6W_YNC', 'SA_6W_YRA', 'SA_LPS', 'WELD_SHOP'];
const MODELS = ['4 WAY INNER RH', '4 WAY INNER LH', '4 WAY OUTER 4DN', '6 WAY INNER RH', '6 WAY OUTER'];

export default {
  key: 'sub-assy',
  title: 'Sub-Assy Asakai Dashboard',
  back: '/portal/production',
  next: { key: 'seat-slider', label: 'Seat Slider' },
  slicers: [S.lines(TYPES, 'Type'), S.shiftBtn(), S.lastDay(), S.fy(), S.month(), S.date(), S.model(MODELS)],
  tabs: [
    {
      name: 'Overview',
      widgets: [
        { type: 'bar', title: 'Quality Status', titleStyle: 'big', d: 'quality', span: 3, h: 210, x: 'name', series: [{ key: 'value', name: 'Rej. Quantity', color: C.navy }], yLabel: 'Rej. Quantity', xLabel: 'Category' },
        { type: 'kpiStack', span: 2, items: [
          { label: 'Plan Manpower', d: 'planMp', fmt: 'k0' },
          { label: 'Actual manpower', d: 'actualMp', fmt: 'k0' },
          { label: 'Manpower Ratio', d: 'mpRatio', fmt: 'pct0' },
        ] },
        W.manpower('manpower', { title: 'Manpower Status Trend', span: 7, h: 210 }),
        W.threshold('productivity', 'Productivity Achievement', 100, bands(100, 80), { span: 5, h: 230 }),
        { type: 'bar', title: 'Plan vs Actual', d: 'planActual', span: 3, h: 230, x: 'x', series: [
          { key: 'plan', name: 'SubPlan', color: C.blue }, { key: 'actual', name: 'Actual', color: C.navy }, { key: 'gap', name: 'Sub Assy Backlog', color: C.orange },
        ], labelFmt: 'k2', yFmt: 'k', labelAngle: -90 },
        { type: 'kpi', label: 'TOTAL INHOUSE RAIL CONSUMPTION', d: 'railTotal', fmt: 'k2', span: 2, link: 'Inhouse Rail' },
        W.oits('oits', { span: 2, h: 230 }),
      ],
    },
    {
      name: 'Rejection',
      widgets: [
        W.pareto('pareto', 'Defect Pareto', { span: 5, h: 460 }),
        W.qualityTable('rejections', { span: 7, maxH: 500, columns: [
          { key: 'date', label: 'Date' }, { key: 'line', label: 'Line' }, { key: 'cat', label: 'Category' }, { key: 'shift', label: 'Shift' }, { key: 'defect', label: 'Defect Name' },
          { key: 'model', label: 'Model Name' }, { key: 'process', label: 'Process', w: 150 }, { key: 'reason', label: 'Reason' }, { key: 'qty', label: 'Qty', align: 'right' }, { key: 'img', label: 'Defect Image', type: 'img' },
        ] }),
      ],
    },
    {
      name: 'Loss Data',
      widgets: [
        W.threshold('productivity', 'Productivity Achievement', 100, bands(100, 80), { span: 12, h: 220, sort: true }),
        W.pie4m('cat4m', undefined, { span: 5, h: 260 }),
        W.lossTable('losses', { span: 7, maxH: 300, columns: [
          { key: 'date', label: 'Date' }, { key: 'shift', label: 'Shift' }, { key: 'line', label: 'Line' }, { key: 'loss', label: 'Losses (Min.)', align: 'right' }, { key: 'reason', label: 'Reason', w: 220 },
        ] }),
      ],
    },
    {
      name: 'Inhouse Rail',
      widgets: [
        { type: 'bar', title: 'INHOUSE RAIL CONSUMPTION DATA', d: 'rail', span: 6, h: 420, x: 'x', series: [
          { key: 'd4', name: '4D', color: C.blue, stack: 'r' }, { key: 'dn', name: '4DN', color: C.navy, stack: 'r' }, { key: 'fn', name: '4FN', color: C.orange, stack: 'r' },
        ], labelFmt: 'k1', yFmt: 'k', ref: { y: 23100, color: TARGET, label: '23,100' }, yLabel: '4D, 4DN and 4FN', xLabel: 'Date', minBarWidth: 60 },
        { type: 'table', title: 'Rail consumption (daily)', d: 'railTable', span: 6, maxH: 460, total: { label: 'Total', keys: ['d4', 'dn', 'fn', 'tot'] }, columns: [
          { key: 'date', label: 'Date', w: 200 }, { key: 'd4', label: 'M_total4D', align: 'right', fmt: 'dec2' }, { key: 'dn', label: 'M_total4DN', align: 'right', fmt: 'dec2' },
          { key: 'fn', label: 'M_total4FN', align: 'right', fmt: 'dec2' }, { key: 'tot', label: 'M_TOTAL_INHOUSE', align: 'right', fmt: 'dec2' },
        ] },
      ],
    },
    {
      name: 'Manpower Trend',
      widgets: [
        { type: 'bar', title: 'Manpower Status Trend', titleStyle: 'big', d: 'mpTrend', span: 12, h: 380, x: 'x', series: [
          { key: 'plan', name: 'Plan', color: C.blue }, { key: 'actual', name: 'Actual manpower', color: C.navy },
        ], xLabel: 'Date and shift', yLabel: 'Manpower', minBarWidth: 50, tooltipExtra: { key: 'ratio', name: 'Manpower Ratio', fmt: 'pct2' } },
      ],
    },
  ],
  demo(f, r) {
    const lineShift = LINES.flatMap((l) => ["A", "B"].map((s) => ({ x: s, x2: l })));
    const prod = genThreshold(r, lineShift, 72, 102);
    const rejections = genRejections(r, workDays(20), MODELS, ['Riser Bkt. Staking Inner M/C', 'Mag WELD Upr Brkt With T-Nut', 'BOLT STRENGTH CHECKING (4WAY)', 'Upr x Rinforce S/A PJW M/C'], ['PUNCH BROKEN', 'BLOW HOLE', 'CD NG', 'BURR IN HOLE', 'WELDING CUT'], 10)
      .map((x) => ({ ...x, line: r.pick(LINES) }));
    const railDays = workDays(8);
    const rail = railDays.map((d) => ({ x: fmtDate(d, 'dd-mon-yy'), d4: r.int(8000, 10000), dn: r.int(6800, 11800), fn: r.int(5800, 10200) }));
    const railTable = workDays(20).reverse().map((d) => {
      const d4 = r.int(3000, 11300), dn = r.int(7600, 12400), fn = r.int(6100, 10500);
      return { date: fmtDate(d, 'long'), d4, dn, fn, tot: d4 + dn + fn };
    });
    const mpTrend = workDays(9).flatMap((d) => ['A', 'B'].map((s) => {
      const plan = r.chance(0.08) ? 36 : 21;
      const actual = 21;
      return { x: `${fmtDate(d, 'dd-mon-yy').slice(0, 6)} ${s}`, plan, actual, ratio: +((actual / plan) * 100).toFixed(2) };
    }));
    return {
      quality: [{ name: 'Process Issue', value: rejections.reduce((s, x) => s + x.qty, 0) }],
      planMp: 1000, actualMp: 990, mpRatio: 99,
      manpower: genManpower(r, workDays(2).flatMap((d) => ['A', 'B'].map((s) => ({ x: `${fmtDate(d)} ${s}` }))), 21),
      productivity: prod,
      planActual: [{ x: fmtDate(workDays(1)[0]), plan: 5770, actual: 2850, gap: -208540 }],
      railTotal: railTable.reduce((s, x) => s + x.tot, 0),
      oits: genOits(r, 2, 3),
      pareto: genPareto(r, ['BLOW HOLE', 'CD NG', 'BURR IN HOLE', 'PUNCH BROKEN', 'WELDING CUT']),
      rejections,
      cat4m: gen4m(r, 146028, [0.47, 0.45, 0.056, 0.01, 0.005, 0.005]).map((x) => (x.name === 'Machine' ? { ...x, name: 'Man' } : x.name === 'Man' ? { ...x, name: 'Machine' } : x)),
      losses: genLosses(r, workDays(10), LINES, ['ALL'], ['ELECTRODE CHANGEOVER', 'LINE SETUP', 'MATERIAL SHORTAGE', 'ROBOT FAULT'], 14),
      rail, railTable, mpTrend,
    };
  },
};
