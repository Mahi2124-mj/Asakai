import { C } from '../theme.js';
import { fmtDate, workDays, MONTHS } from './_gen.js';
import { S } from './_slicers.js';
import { W, bands, genManpower, genPlanActual, genLosses, genRejections, genPareto, gen4m, genOits } from './_production.js';

const LINES = ['YRA_RC', 'YSD_RC', 'YHB_RC', 'YNC_RC', 'YMC_RC'];
const MODELS = ['REC ASSY YHB SSR RH', 'REC ASSY YED SSR RH', 'REC ASSY Y17 SSR RH', 'REC ASSY YCA-RC SSR LH'];
const PROCESSES = ['Mag Welding Release x Hinge Pin', 'MAG Welding of Arm x Recliner', 'MAG Welding of Lwr Hook with Lwr Arm', 'Projection Welding of Washer with Lwr Arm', 'Final Inspection Machine'];
const DEFECTS = ['HOLE IN REC WELDING', 'RELEASE ARM WELDING SHORT NG', 'BLOW HOLE WELDING NG', 'HOOK SPRING SHORT WELDING', 'REC GAP MORE THAN 0.5MM', 'REC WELDING SHORT NG', 'HOOK SPRING BLOW HOLE WELDING', 'LOWER ARM BEND', 'LOWER ARM BLANK SHORT', 'LOWER ARM LUG BEND', 'ROUND REC RING CRACK'];

export default {
  key: 'recliner',
  title: 'Recliner Assy Asakai Dashboard',
  back: '/portal/production',
  next: { key: 'thin-recliner', label: 'Thin Recliner' },
  slicers: [S.lines(LINES), S.shiftBtn(), S.lastDay(), S.date(), S.month(), S.year(), S.model(MODELS)],
  tabs: [
    {
      name: 'Overview',
      widgets: [
        W.quality('quality', [{ key: 'child', name: 'Child Part Issue', color: C.blue }, { key: 'process', name: 'Process Issue', color: C.navy }], { totalLabels: true }),
        W.manpower('manpower'),
        W.threshold('productivity', 'Productivity Achievement', 100, bands(100, 80), { yFmt: 'pct0', footnote: 'Target @ Man-Sec/Piece: 81' }),
        W.planActual('planActual', ['Plan', 'Actual', 'Cumulative Backlog'], { span: 8, minBarWidth: 46 }),
        W.oits('oits', { span: 4 }),
      ],
    },
    {
      name: 'Quality',
      widgets: [W.qualityTable('rejections', { span: 12, maxH: 560 })],
    },
    {
      name: 'Losses',
      widgets: [
        W.threshold('productivity', 'Productivity Achievement', 100, bands(100, 80), { span: 4, h: 200 }),
        W.lossTable('losses', { span: 8, rows: 2, maxH: 500, columns: [
          { key: 'date', label: 'Date' }, { key: 'shift', label: 'Shift' }, { key: 'cat', label: '4M Category' }, { key: 'process', label: 'Process Name', w: 200 },
          { key: 'reason', label: 'Reason', w: 240 }, { key: 'loss', label: 'Losses in Minute', align: 'right' },
        ] }),
        W.pie4m('cat4m', undefined, { span: 4, h: 240 }),
      ],
    },
    { name: 'Defect Pareto', widgets: [W.pareto('pareto', 'Rec Assy Defect Pareto Chart', { h: 440 })] },
  ],
  demo(f, r) {
    const days = workDays(10);
    const rows = days.map((d) => ({ x: String(d.getDate()), x2: MONTHS[d.getMonth()] }));
    const lineShift = LINES.flatMap((l) => ['A', 'B'].map((s) => ({ x: s, x2: l })));
    const rejections = genRejections(r, workDays(20), MODELS, PROCESSES, DEFECTS, 12);
    return {
      quality: rows.map((x) => ({ ...x, child: r.chance(0.3) ? 1 : 0, process: r.int(0, 5) })),
      manpower: genManpower(r, workDays(6).flatMap((d) => ['A', 'B'].map((s) => ({ x: s, x2: String(d.getDate()) }))), 25),
      productivity: lineShift.map((x) => ({ ...x, value: r.float(320, 880) })),
      planActual: genPlanActual(r, workDays(20).map((d) => ({ x: fmtDate(d).slice(0, 5), _d: d })), 14500).map((x) => ({ ...x, gap: x.gap - 140000 })),
      oits: genOits(r, 0, 1),
      rejections,
      losses: genLosses(r, workDays(25), LINES, PROCESSES, ['SPEED LOSS (OJT MANPOWER)', 'SPEED LOSS (MULTISKILL DAY 2)', 'POWER CUT', 'CLAMP FAULT', 'M/C not being ready', 'SPEED LOSS (HEALTH NOT GOOD)'], 14),
      cat4m: gen4m(r, 6793, [0.0, 0.73, 0.21, 0.056, 0, 0]).map((x) => ({ ...x, name: x.name.toUpperCase() })),
      pareto: genPareto(r, DEFECTS, 4),
    };
  },
};
