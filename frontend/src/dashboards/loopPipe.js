import { C } from '../theme.js';
import { fmtDate, workDays, MONTHS } from './_gen.js';
import { S } from './_slicers.js';
import { W, bands, shiftRows, genPlanActual, genThreshold, genLosses } from './_production.js';

const LINES = ['LOOP_PIPE_1', 'LOOP_PIPE_2', 'LOOP_PIPE_3'];

export default {
  key: 'loop-pipe',
  title: 'Loop Pipe Asakai Dashboard',
  back: '/portal/production',
  next: { key: 'sub-assy', label: 'Sub Assy.' },
  slicers: [S.lines(LINES), S.shiftBtn(true), S.lastDay(), S.date(), S.month(), S.year(), S.model(['YHB Loop Handle', 'YTA Loop Handle', 'YWD Loop Handle'])],
  tabs: [
    {
      name: 'Overview',
      widgets: [
        { type: 'kpi', label: 'PPM', d: 'ppm', fmt: 'dec3', span: 2, small: true },
        { type: 'kpi', label: 'Model in Backlog', d: 'backlog', span: 2, small: true },
        { type: 'kpi', label: 'Model in Excess', d: 'excess', span: 2, small: true },
        { type: 'kpi', label: 'Line Losses (min)', d: 'lossTotal', span: 2, small: true, link: 'Losses' },
        { type: 'kpi', label: 'Average Productivity', d: 'avgProd', fmt: 'pct2', span: 4, small: true },
        W.quality('quality', [
          { key: 'child', name: 'Child Part Issue' }, { key: 'maint', name: 'Maintenance' }, { key: 'man', name: 'Man Issue' },
        ], { yLabel: 'Rej. Quantity', minBarWidth: 22 }),
        { type: 'bar', title: 'Manpower Status', titleStyle: 'big', d: 'manpower', span: 4, h: 210, x: 'x', series: [
          { key: 'plan', name: 'Plan Manpower', color: C.blue },
          { key: 'actual', name: 'Actual manpower', color: C.navy },
        ], yLabel: 'Manpower (Nos.)', xLabel: 'Date', tooltipExtra: { key: 'ratio', name: 'Loop Manpower Ratio', fmt: 'pct0' } },
        W.threshold('productivity', 'Productivity Achievement', 100, bands(100, 80), { yLabel: 'Achievement %', xLabel: 'Day' }),
        W.planActual('planActual', ['KANBAN QTY.', 'Actual Qty.', 'Backlog'], { span: 7 }),
        { type: 'text', title: 'OITS Status', titleStyle: 'big', d: 'oitsText', span: 5, h: 220 },
      ],
    },
    {
      name: 'Losses',
      widgets: [
        W.threshold('prodShift', 'Productivity Achievement', 100, bands(100, 80), { horizontal: true, span: 4, h: 480, rows: 1 }),
        W.lossTable('losses', { span: 8, maxH: 520 }),
      ],
    },
  ],
  demo(f, r) {
    const days = workDays(14);
    const lp = (d) => ({ x: String(d.getDate()), x2: MONTHS[d.getMonth()] });
    const manpower = workDays(10).map((d) => {
      const plan = r.int(12, 14);
      const actual = plan - (r.chance(0.3) ? 1 : 0);
      return { x: String(d.getDate()), plan, actual, ratio: Math.round((actual / plan) * 100) };
    });
    const losses = genLosses(r, workDays(20), LINES, ['Loop Pipe Sliting HYP2000', 'Bending M/C', 'End Forming'], ['11.5 DIM ISSUE', '200% checking gauge NOK', 'LH side burr problem', 'LH SIDE SLIT UNIT CHANGE', 'PART NOT PROPER SET', 'SENSOR NOT WORK', 'SLIT DIE ISSUE', 'SLIT PUNCH BROKEN'], 16);
    const prod = genThreshold(r, days.map((d) => ({ ...lp(d) })), 88, 105);
    return {
      ppm: r.float(300, 600, 3),
      backlog: 2, excess: 1,
      lossTotal: losses.reduce((s, x) => s + x.loss, 0),
      avgProd: +(prod.reduce((s, x) => s + x.value, 0) / prod.length).toFixed(2),
      quality: days.map((d) => ({ ...lp(d), child: r.int(0, 4), maint: r.int(0, 10), man: r.chance(0.1) ? 1 : 0 })),
      manpower,
      productivity: prod,
      planActual: genPlanActual(r, workDays(7).map((d) => ({ x: String(d.getDate()), x2: MONTHS[d.getMonth()], _d: d })), 13200, { cumulative: false }).map((x) => ({ ...x, gap: -Math.round(x.plan * r.float(0.6, 0.7)) })),
      oitsText: { text: 'No Issue' },
      prodShift: genThreshold(r, shiftRows(workDays(10)).map((x) => ({ ...x, x: `${x.x2.slice(0, 2)} ${x.x}`, x2: undefined })), 85, 125),
      losses,
    };
  },
};
