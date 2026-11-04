import { C } from '../theme.js';
import { fmtDate, workDays } from './_gen.js';
import { S } from './_slicers.js';
import { W, bands, genManpower, genLosses, genRejections, gen4m, genOits, genOitsRows } from './_production.js';

const LINES = ['YMC_SS', 'Y17_SS', 'YFG_SS', 'YJC_SS', 'YNC_SS', 'YRA_SS', 'YCA_SS', 'YSD_SS', 'YHB_SS'];
const MODELS = ['TRACK ASSY FRONT SEAT Y17 4 WAY INR LH', 'TRACK ASSY FRONT SEAT Y17 4 WAY OTR', 'TRACK ASSY FRONT SEAT YHB 4 WAY INR LH', 'TRACK ASSY FRONT SEAT Y17 4 WAY INR RH'];

export default {
  key: 'seat-slider',
  title: 'Seat Slider Assy Asakai Dashboard',
  back: '/portal/production',
  next: { key: 'recliner', label: 'Recliner' },
  slicers: [S.lines(LINES), S.shift(), S.lastDay(), S.month(), S.year(), S.date(), S.model(MODELS)],
  tabs: [
    {
      name: 'Overview',
      widgets: [
        W.quality('quality', [{ key: 'child', name: 'Child Part Issue', color: C.blue }, { key: 'process', name: 'Process Issue', color: C.navy }], { span: 3, yLabel: 'Sum of Rej. Quantity' }),
        W.manpower('manpower', { span: 4, yLabel: 'Plan Vs Actual' }),
        W.threshold('productivity', 'Productivity Achievement', 100, bands(100, 90, '≥ 100', '90 ~ 99', '< 90'), { span: 3, fmt: 'pct2', yLabel: 'Productivity Achievement %' }),
        { type: 'kpi', label: 'Target Man Sec Per Piece', d: 'targetManSec', fmt: 'dec1', span: 2 },
        { type: 'bar', title: 'Plan/Actual', titleStyle: 'big', subtitle: 'Total Seat Slider Zone Kanban Status', d: 'planActual', span: 3, h: 210, x: 'x', series: [
          { key: 'plan', name: 'Total Plan', color: C.blue }, { key: 'actual', name: 'Actual', color: '#D4A900' }, { key: 'gap', name: 'Cumulative Backlog', color: C.orange },
        ], labelFmt: 'k2', yFmt: 'k', labelAngle: -90, yLabel: 'Qty. Nos.' },
        W.oits('oits', { span: 3, h: 210 }),
        { type: 'bar', title: 'In-House Rail Consumption', titleStyle: 'big', d: 'rail', span: 4, h: 210, x: 'x', series: [
          { key: 'd4', name: '4D', color: C.blue, stack: 'r' }, { key: 'dn', name: '4DN', color: C.navy, stack: 'r' }, { key: 'fn', name: '4FN', color: C.pink, stack: 'r' }, { key: 'other', name: 'Other', color: C.purple, stack: 'r' },
        ], labelFmt: 'k0', yFmt: 'k', totalLabels: true },
        { type: 'kpiStack', span: 2, items: [
          { label: 'Last Day In-House Consumption', d: 'lastDayRail', fmt: 'k2' },
          { label: 'Cumulative Inhouse', d: 'cumRail', fmt: 'k2' },
        ] },
      ],
    },
    {
      name: 'Quality',
      widgets: [
        { type: 'bar', title: 'Quality Status', titleStyle: 'big', d: 'qualityCat', span: 4, h: 230, x: 'x', horizontal: true, series: [{ key: 'value', name: 'Sum of Rej. Quantity', color: C.navy }], xLabel: 'Sum of Rej. Quantity', colorKey: 'color' },
        W.qualityTable('rejections', { span: 8, rows: 2, maxH: 520 }),
        { type: 'bar', title: 'Sum of Rej. Quantity by Defect Name', d: 'defects', span: 4, h: 230, x: 'name', series: [{ key: 'value', name: 'Rej. Quantity', color: C.blue }], xLabel: 'Defect Name', tickAngle: -30 },
      ],
    },
    {
      name: 'Losses',
      widgets: [
        W.threshold('productivity', 'Productivity Achievement', 100, bands(100, 90, '≥ 100', '90 ~ 99', '< 90'), { span: 4, h: 220 }),
        W.lossTable('losses', { span: 8, rows: 2, maxH: 520, total: { label: 'Total', keys: ['freq', 'loss'] }, columns: [
          { key: 'date', label: 'Date' }, { key: 'shift', label: 'Shift' }, { key: 'line', label: 'Line' }, { key: 'cat', label: '4M Category' }, { key: 'process', label: 'Process Name', w: 170 },
          { key: 'reason', label: 'Reason', w: 200 }, { key: 'freq', label: 'Frequency', align: 'right' }, { key: 'loss', label: 'Losses in Minute', align: 'right', fmt: 'dec2' },
        ] }),
        W.pie4m('cat4m', undefined, { span: 4, h: 240 }),
      ],
    },
    { name: 'OITS', widgets: [W.oitsTable('oitsRows')] },
  ],
  demo(f, r) {
    const day = workDays(1)[0];
    const ds = fmtDate(day);
    const rejections = genRejections(r, [day], MODELS, ['FINAL INSPECTION', 'MANUAL MOVEMENT & FR LIGHTER EJECTOR FITMENT', 'SEAT TRACK 5'], ['BOLT THREAD DAMAGE', 'UPPER RAIL DENT/SCRATCH', 'HARD MOVEMENT', 'BALL GUIDE MISS', 'WRONG ASSEMBLY', 'BATCH CODE PRINT'], 12);
    const sumBy = (cat, s) => rejections.filter((x) => x.cat === cat && x.shift === s).reduce((t, x) => t + x.qty, 0);
    const defects = {};
    rejections.forEach((x) => { defects[x.defect] = (defects[x.defect] || 0) + x.qty; });
    const losses = genLosses(r, [day], LINES, ['FINAL INSPECTION', 'LOWER RAIL GREASING & TAB BENDING', 'RR LIGHTER EJECTOR FITMENT', 'SEMI AUTO', 'LOCK BAR MECHANISM', 'UPPER RAIL GREASING'], ['ALL GREASE POINT NOT COMING', 'AREA SENSOR NOT WORKING', 'BATCH CODE SENSOR NG', 'BELOW SPECIFICATION LIMIT', 'BOLT SENSOR-1 FAULT', 'CIRCLIP NG SENSOR FAULT'], 12)
      .map((x) => ({ ...x, freq: r.int(1, 3), loss: r.int(4, 25) }));
    const rail = workDays(5).map((d) => ({ x: fmtDate(d), d4: r.int(8500, 11500), dn: r.int(10000, 16000), fn: r.int(1500, 5000), other: 0 }));
    const total = rail.reduce((s, x) => s + x.d4 + x.dn + x.fn, 0);
    return {
      quality: [{ x: ds, child: sumBy('Child Part Issue', 'A') + sumBy('Child Part Issue', 'B'), process: sumBy('Process Issue', 'A') + sumBy('Process Issue', 'B') }],
      manpower: genManpower(r, ['A', 'B'].map((s) => ({ x: s, x2: ds })), 54),
      productivity: ['A', 'B'].map((s) => ({ x: s, x2: ds, value: r.float(85, 101) })),
      targetManSec: 85.8,
      planActual: [{ x: ds, plan: 0, actual: r.int(30000, 34000), gap: r.int(120000, 135000) }],
      oits: genOits(r, 3, 6),
      rail,
      lastDayRail: '--',
      cumRail: total,
      qualityCat: [
        { x: 'Process A', value: sumBy('Process Issue', 'A'), color: C.navy }, { x: 'Process B', value: sumBy('Process Issue', 'B'), color: C.navy },
        { x: 'Child Part B', value: sumBy('Child Part Issue', 'B'), color: C.blue }, { x: 'Child Part A', value: sumBy('Child Part Issue', 'A'), color: C.blue },
      ],
      defects: Object.entries(defects).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      rejections,
      losses,
      cat4m: gen4m(r, 615, [0.12, 0.79, 0.06, 0.02, 0.01, 0]),
      oitsRows: genOitsRows(r, workDays(60), LINES, [['LOCK BAR STUCK', 'Spring replaced', 'Daily check sheet updated'], ['GREASE NOT COMING', '', 'Nozzle cleaning added in PM']], 3),
    };
  },
};
