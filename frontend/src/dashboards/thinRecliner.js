import { C } from '../theme.js';
import { fmtDate, workDays } from './_gen.js';
import { S } from './_slicers.js';
import { W, bands, shiftRows, genPlanActual, genThreshold, genRejections, genLosses } from './_production.js';

const TB = bands(95, 80, '≥ 95%', '80 ~ 95%', '< 80%');

export default {
  key: 'thin-recliner',
  title: 'Thin Recliner Asakai Dashboard',
  back: '/portal/production',
  next: { key: 'maintenance', label: 'Maintenance' },
  slicers: [S.lines(['T_REC_01', 'T_REC_02'], 'Line', false), S.lastDay(), S.shift(), S.date(), S.month(), S.year(), S.model(['ROUND-RECLINER RH', 'ROUND-RECLINER LH'])],
  tabs: [
    {
      name: 'Overview',
      widgets: [
        W.quality('quality', [
          { key: 'child', name: 'Child Part Issue', color: C.blue }, { key: 'man', name: 'Man Issue', color: C.navy }, { key: 'process', name: 'Process Issue', color: C.orange },
        ], { yLabel: 'Quantity', xLabel: 'Shift' }),
        { type: 'bar', title: 'Manpower Status', titleStyle: 'big', d: 'manpower', span: 4, h: 210, x: 'x', x2: 'x2', series: [
          { key: 'plan', name: 'Plan Manpower', color: C.blue }, { key: 'actual', name: 'Actual manpower', color: C.navy },
        ], yLabel: 'Manpower (Nos.)', minBarWidth: 26 },
        W.threshold('oee', 'OEE Achievement', 95, TB, { yLabel: 'OEE %', xLabel: 'Shift' }),
        W.planActual('planActual', ['Sum of Kanban Qty.', 'Sum of Actual Qty.', 'Cumulative Backlog/EXCESS'], { span: 6, labelFmt: 'k0', minBarWidth: 40 }),
        { type: 'text', title: 'OITS Status', titleStyle: 'big', d: 'oitsText', span: 4, h: 220 },
        { type: 'kpi', label: 'Machine Faults', d: 'faults', span: 2, link: 'Fault Pareto' },
      ],
    },
    {
      name: 'Quality',
      widgets: [
        { type: 'bar', title: 'Quality Status', titleStyle: 'big', d: 'qualityH', span: 4, h: 480, x: 'x', horizontal: true, series: [
          { key: 'child', name: 'Child Part Issue', color: C.blue, stack: 'q' }, { key: 'man', name: 'Man Issue', color: C.navy, stack: 'q' }, { key: 'process', name: 'Process Issue', color: C.orange, stack: 'q' },
        ], xLabel: 'Quantity', labels: false },
        W.qualityTable('rejections', { span: 8, maxH: 520 }),
      ],
    },
    {
      name: 'OEE & Losses',
      widgets: [
        W.threshold('oeeShift', 'OEE Achievement', 95, TB, { horizontal: true, span: 4, h: 440 }),
        W.lossTable('losses', { span: 8, maxH: 500, columns: [
          { key: 'date', label: 'Date' }, { key: 'shift', label: 'Shift' }, { key: 'cat', label: '4M Category' }, { key: 'process', label: 'Process Name' },
          { key: 'reason', label: 'Reason', w: 260 }, { key: 'loss', label: 'Losses in Minute', align: 'right' },
        ] }),
      ],
    },
    {
      name: 'Fault Pareto',
      widgets: [
        { type: 'table', title: 'Machine Faults', d: 'faultRows', span: 8, maxH: 460, columns: [
          { key: 'machine', label: 'MACHINE_NO' }, { key: 'process', label: 'Process Name', w: 260 }, { key: 'desc', label: 'Process Description' },
          { key: 'by', label: 'FILLED_BY' }, { key: 'no', label: 'Process No.' }, { key: 'faults', label: 'Total_No_of_Faults', align: 'right' },
        ] },
        { type: 'kpiStack', span: 4, items: [{ label: 'Count of Fault', d: 'faultCount', fmt: 'k3' }, { label: 'Sum Of Fault', d: 'faults', fmt: 'k0' }] },
      ],
    },
  ],
  demo(f, r) {
    const rows = shiftRows(workDays(8)).map((x) => ({ ...x, x2: x.x2.slice(0, 2) }));
    const strip = rows.map(({ _d, ...x }) => x);
    const faultRows = [
      ['THIN_REC_2', 'Grease Lubrication & Lock Off Torque + Sliding Torque Quality Judgement', 'Cycle time over', 'ST. #15'],
      ['THIN_REC_1', 'First Lock & First lock rechit Depth measurement', 'Cycle time over', 'ST. #16'],
      ['THIN_REC_1', 'Sub Assy Part Unloading', 'Cover check NG', 'ST. #18'],
    ].flatMap((x) => [0, 1].map(() => ({ machine: x[0], process: x[1], desc: x[2], no: x[3], by: r.pick(['Akash', 'Ritesh', 'Anuj', 'Jatin']), faults: r.int(1500, 4200) })))
      .sort((a, b) => b.faults - a.faults);
    return {
      quality: strip.map((x) => ({ ...x, child: r.chance(0.6) ? r.int(80, 340) : 0, man: 0, process: r.int(120, 600) })),
      manpower: strip.map((x) => ({ ...x, plan: 24, actual: r.int(18, 29) })),
      oee: genThreshold(r, rows, 84, 94),
      planActual: genPlanActual(r, workDays(20).map((d) => ({ x: fmtDate(d).slice(0, 5), _d: d })), 9500).map((x) => ({ ...x, gap: -r.int(28000, 38000) })),
      oitsText: { text: 'No Issue' },
      faults: 92270,
      faultCount: 25004,
      qualityH: strip.map((x) => ({ x: `${x.x2} ${x.x}`, child: r.int(0, 10), man: 0, process: r.int(5, 40) })),
      rejections: genRejections(r, workDays(40), ['ROUND-RECLINER RH', 'ROUND-RECLINER LH'], ['IFM'], ['BARCODE NOT PROPER', 'RING CRACK', 'HARD MOVEMENT'], 8),
      oeeShift: [{ x: 'A', value: r.float(85, 93) }, { x: 'B', value: r.float(85, 93) }],
      losses: genLosses(r, workDays(120), ['T_REC_01'], ['ST. #13', 'ST. #15', 'ST. #16', 'ST. #18', 'ALL'], ['Cycle time over', 'Maintenance team work at st#15', 'HARD MOVEMENT DUE TO RING N.G', 'Cycle time over problem'], 14).map((x) => ({ ...x, loss: r.int(190, 310) })).sort((a, b) => b.loss - a.loss),
      faultRows,
    };
  },
};
