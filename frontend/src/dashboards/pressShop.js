import { C } from '../theme.js';
import { fmtDate, workDays } from './_gen.js';
import { S, RAIL_MODELS } from './_slicers.js';
import { W, bands, shiftRows, genManpower, genPlanActual, genThreshold, genOits, gen4m, genOitsRows } from './_production.js';

const LINES = ['Press_1', 'Press_2', 'Press_3'];

export default {
  key: 'press-shop',
  title: 'Press Shop Asakai Dashboard',
  back: '/portal/production',
  next: { key: 'loop-pipe', label: 'Loop Pipe' },
  slicers: [S.lines(LINES), S.shiftBtn(), S.lastDay(), S.date(), S.month(), S.year(), S.model(RAIL_MODELS)],
  tabs: [
    {
      name: 'Overview',
      widgets: [
        { type: 'kpi', label: 'SPM', d: 'spm', fmt: 'dec2', span: 2, small: true },
        { type: 'kpi', label: 'Effective SPM', d: 'espm', fmt: 'dec2', span: 2, small: true },
        { type: 'kpi', label: 'Models in Backlogs', d: 'backlogCount', span: 2, small: true, link: 'Backlog' },
        { type: 'kpi', label: 'Models in Excess', d: 'excessCount', span: 2, small: true, link: 'Excess' },
        { type: 'kpi', label: 'Planned / Unplanned Losses (min)', d: 'lossesText', span: 4, small: true, link: 'Losses' },
        W.quality('quality', [{ key: 'man', name: 'Man Issue', color: '#F4A582' }, { key: 'process', name: 'Process Issue', color: '#F09CD0' }]),
        W.manpower('manpower'),
        W.threshold('oee', 'OEE Achievement', 95, bands(95, null, '≥ 95%', '', '< 95%'), { yLabel: 'OEE %' }),
        W.planActual('planActual'),
        W.oits('oits'),
        { type: 'bar', title: 'Total Production', titleStyle: 'big', d: 'production', span: 4, h: 220, x: 'x', series: [{ key: 'value', name: 'Quantity', color: '#4DD3F5' }], labelFmt: 'k2', yFmt: 'k', labelPos: 'inside', labelAngle: -90, yLabel: 'Quantity', xLabel: 'Date' },
      ],
    },
    {
      name: 'Quality',
      widgets: [
        W.quality('qualityDaily', [{ key: 'man', name: 'Man Issue', color: '#F4A582' }, { key: 'process', name: 'Process Issue', color: '#F09CD0' }], { span: 4, h: 200, x2: undefined }),
        W.qualityTable('rejections', { span: 8, rows: 2 }),
        { type: 'bar', title: 'Types Of Defect', titleStyle: 'big', d: 'defectTypes', span: 4, h: 200, x: 'name', series: [{ key: 'value', name: 'Rej. Qty.', color: '#4DD3F5' }], yLabel: 'Rej. Qty.', xLabel: 'Defect Name' },
      ],
    },
    {
      name: 'Losses',
      widgets: [
        W.threshold('oeeLong', 'OEE Achievement', 95, bands(95, null, '≥ 95%', '', '< 95%'), { span: 6, h: 170, yLabel: 'OEE %' }),
        W.lossTable('losses', { span: 6, rows: 1, maxH: 250, columns: [
          { key: 'date', label: 'Date' }, { key: 'shift', label: 'Shift' }, { key: 'cat', label: '4M Category' }, { key: 'process', label: 'Process Name' },
          { key: 'reason', label: 'Reason', w: 220 }, { key: 'loss', label: 'Losses in Minute', align: 'right' },
        ] }),
        W.threshold('perf', 'Performance Achievement', 95, bands(95, null, '≥ 95%', '', '< 95%'), { span: 6, h: 170, yLabel: 'Performance %' }),
        { type: 'kpi', label: 'Planned Losses (min)', d: 'plannedLoss', fmt: 'k0', span: 2 },
        W.pie4m('cat4m', 'Category Wise Losses (Min.)', { span: 4, rows: 2, h: 280 }),
        W.threshold('spmDaily', 'SPM Achievement', 17, bands(17, null, '≥ 17', '', '< 17'), { span: 6, h: 170, fmt: 'dec2', yLabel: 'Quantity', yFmt: 'num' }),
        { type: 'kpi', label: 'Unplanned Losses (min)', d: 'unplannedLoss', span: 2 },
      ],
    },
    {
      name: 'Backlog',
      widgets: [{ type: 'table', title: 'Models in Backlog', d: 'backlog', span: 12, maxH: 460, columns: [
        { key: 'model', label: 'Model Name', align: 'center' }, { key: 'no', label: 'Model No.', align: 'center' }, { key: 'qty', label: 'Backlog Quantity', align: 'center' },
      ] }],
    },
    {
      name: 'Excess',
      widgets: [{ type: 'table', title: 'Models in Excess', d: 'excess', span: 12, maxH: 460, columns: [
        { key: 'model', label: 'Model Name', align: 'center' }, { key: 'no', label: 'Model No.', align: 'center' }, { key: 'qty', label: 'Excess Quantity', align: 'center' },
      ] }],
    },
    { name: 'OITS', widgets: [W.oitsTable('oitsRows')] },
  ],
  demo(f, r) {
    const days5 = workDays(5);
    const rows = shiftRows(days5);
    const pa = genPlanActual(r, workDays(4).map((d) => ({ x: fmtDate(d), _d: d })), 52000);
    const planned = r.int(2500, 3500);
    const unplanned = r.int(400, 700);
    const nos = ['7S121-X7P06-TB', '7S111-X7P00-TB', '75111-X7P00-TB'];
    return {
      spm: r.float(15.8, 17.2), espm: r.float(15.6, 17.0),
      backlogCount: 1, excessCount: 7,
      lossesText: `${(planned / 1000).toFixed(1)}K / ${unplanned}`,
      plannedLoss: planned, unplannedLoss: unplanned,
      quality: rows.map(({ _d, ...x }) => ({ ...x, x: `${x.x}`, man: r.chance(0.2) ? 1 : 0, process: r.chance(0.2) ? 1 : 0 })),
      qualityDaily: workDays(15).map((d) => ({ x: fmtDate(d).slice(0, 5), man: r.chance(0.15) ? 1 : 0, process: r.chance(0.15) ? 1 : 0 })),
      manpower: genManpower(r, shiftRows(workDays(6)), 31),
      oee: genThreshold(r, rows, 86, 98),
      oeeLong: genThreshold(r, shiftRows(workDays(8)), 84, 98),
      perf: genThreshold(r, shiftRows(workDays(8)), 84, 99),
      spmDaily: genThreshold(r, shiftRows(workDays(8)), 13, 17.6),
      planActual: pa,
      oits: genOits(r, 0, 6),
      production: pa.map((x) => ({ x: x.x, value: x.actual })),
      rejections: [
        { date: fmtDate(days5[0]), shift: 'A', cat: 'Man Issue', model: 'YY8 Upper Rail(4FN)', process: 'BENDING-7', defect: 'Part not set on die', qty: 1, reason: 'NOT FOCUS ON PART', img: '' },
        ...days5.slice(1).flatMap((d) => ['A', 'B'].map((s) => ({ date: fmtDate(d), shift: s, cat: 'Process Issue', model: '', process: '', defect: 'No Issue', qty: 0, reason: '', img: '' }))),
      ],
      defectTypes: [{ name: 'Insert Broken', value: r.int(4, 9) }, { name: 'Part not set on die', value: 1 }, { name: 'No Issue', value: 0 }],
      losses: [
        ['Machine', 'BENDING-6', 'FRONT STOPPER NOT WORKING'], ['Machine', 'BENDING-1', 'POWER NOT SUPPLY TO MOTOR'], ['Man', 'ALL PROCESS', 'MANPOWER SHORTAGE'],
        ['Machine', 'BENDING-8', 'FRONT STOPPER SENSOR NOT WORKING'], ['Machine', 'BENDING-7', 'PART PRESENCE SENSOR NOT WORKING'], ['Method', 'ALL PROCESS', 'TOOL CHANGEOVER'], ['Quality', 'ALL PROCESS', 'NEW BLANK TRIAL BY QUALITY'],
      ].map(([cat, process, reason]) => ({ date: fmtDate(r.pick(workDays(25))), shift: r.pick(['A', 'B']), cat, process, reason, loss: r.int(25, 75) })).sort((a, b) => b.loss - a.loss),
      cat4m: gen4m(r, planned + unplanned, [0.84, 0.08, 0.02, 0.01, 0.05, 0]),
      backlog: [
        { model: 'YTA Lower Rail(4CN)', no: nos[0], qty: -r.int(300000, 330000) },
        { model: 'YY8 Upper Rail(4FN)', no: nos[1], qty: -r.int(1700000, 1720000) },
      ],
      excess: RAIL_MODELS.map((m) => ({ model: m, no: r.pick(nos), qty: r.int(1000, 200000) })).sort((a, b) => b.qty - a.qty),
      oitsRows: genOitsRows(r, workDays(150), ['PRESS SHOP', 'PRESS_1', 'PRESS_3'], [
        ['OIL LEAKAGE', '', '1 sample of tray job request given to fabrication'],
        ['PRODUCTION COUNTER TIME MISMATCH', '', 'Counter matching in PLC according to another line'],
        ['MACHINE CONTINUES RUNNING EVEN WHEN A PART IS AVAILABLE ON THE CHUTE', 'Old sensor replaced with a new sensor', 'All sensors of part picking cylinder checked and verified'],
        ['Y43 TOOL TRIAL NOT DONE', '', 'Many times shim adjustment but part not set according to dimensions'],
        ['WRONG MATERIAL (YFG OLD BLANK)', 'New material provided', 'Information will be provided in advance to avoid old material usage'],
      ]),
    };
  },
};
