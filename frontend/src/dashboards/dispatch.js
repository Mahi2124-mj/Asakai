import { C, STATUS } from '../theme.js';
import { fmtDate, workDays, PEOPLE } from './_gen.js';
import { S } from './_slicers.js';

const PSG = [
  { key: 'plan', name: 'PLAN', color: C.blue },
  { key: 'actual', name: 'ACTUAL', color: C.navy },
  { key: 'gap', name: 'GAP', color: C.orange },
];

const sched = (title, d) => ({ type: 'bar', title, d, span: 3, x: 'name', series: PSG, labelFmt: 'k', yFmt: 'k', yLabel: 'Qty.', h: 230 });

export default {
  key: 'dispatch',
  title: 'Dispatch Asakai Dashboard',
  back: '/portal',
  next: { key: 'store', label: 'Store' },
  slicers: [S.date()],
  tabs: [
    {
      name: 'Overview',
      widgets: [
        sched('SEAT SLIDER SCHEDULE VS SUPPLY', 'seatSlider'),
        sched('RECLINER SCHEDULE VS SUPPLY', 'recliner'),
        sched('HANDLE SCHEDULE VS SUPPLY', 'handle'),
        sched('GEAR SCHEDULE VS SUPPLY', 'gear'),
        { type: 'kpiRow', span: 8, lead: "No's OF PARTS LESS THAN 01 DAY", items: [
          { label: 'Rod', d: 'lessRod', fmt: 'dec2' },
          { label: 'Recliner', d: 'lessRecliner', fmt: 'dec2' },
          { label: 'Seat slider', d: 'lessSeat', fmt: 'dec2' },
          { label: 'Handle', d: 'lessHandle', fmt: 'dec2' },
        ] },
        { type: 'bar', title: 'MANPOWER STATUS', d: 'manpower', span: 4, rows: 2, h: 300, x: 'shift', x2: 'date', series: [
          { key: 'plan', name: 'PLAN', color: C.blue },
          { key: 'actual', name: 'ACTUAL', color: C.navy },
          { key: 'rest', name: 'HAVE (ON REST)', color: C.aqua },
        ], yLabel: 'PLAN VS ACTUAL', xLabel: 'SHIFT' },
        { type: 'tiles', title: 'BINS OPENING STOCK', d: 'bins', span: 8 },
      ],
    },
    {
      name: 'OITS',
      widgets: [
        { type: 'table', title: 'Dispatch OITS', d: 'oits', span: 12, maxH: 520, columns: [
          { key: 'model', label: 'MODEL', w: 110 },
          { key: 'opened', label: 'DATE_OPENED', w: 100 },
          { key: 'raisedBy', label: 'RAISED BY', w: 130 },
          { key: 'resp', label: 'CHECKING_RESPONSIBILITY', w: 130 },
          { key: 'issue', label: 'ISSUE', w: 260 },
          { key: 'cm', label: 'COUNTERMEASURE', w: 360 },
        ] },
      ],
    },
  ],
  demo(f, r) {
    const ps = (plan) => {
      const actual = Math.round(plan * r.float(0.88, 1.12));
      return [{ name: '', plan, actual, gap: actual - plan }];
    };
    const days = workDays(2);
    const manpower = [];
    days.forEach((d, i) => ['A', 'B'].slice(0, i === 0 ? 2 : 1).forEach((s) => {
      const p = s === 'A' ? 21 : 10;
      manpower.push({ shift: s, date: fmtDate(d), plan: p, actual: p - r.int(0, 1), rest: r.int(0, 1) });
    }));
    const sizes = ['600*400*220', '600*400*120', '600*400*160', '600*400*160YWD', '600*400*175', '600*400*240YWD'];
    const bins = sizes.map((s) => {
      const v = r.pick([100, 200, 250, 300, 550, 100]);
      return { label: `BIN_SIZE(${s})`, value: v.toFixed(2), color: v <= 100 ? STATUS.warn : STATUS.good };
    });
    const issues = [
      ['YTA', 'YTA 6WAY INNER LH SHORT FOUND IN BOX (B SHIFT)', 'Operator reverify before bin move to dispatch'],
      ['YHB END CAP', 'YHB END CAP SHORT PUNCH AT KML MANESAR LOCATION (300 NOS)', 'Store team to consider RGP material in plan'],
      ['Y17', 'BOX FALL DOWN ON THE WAY', 'OJT given to driver and loading operator, track route for supply'],
      ['SS YED', '01 NOS SHORT FOUND IN YED 6 WAY INNER LH MODEL', '1. Check CCTV of abnormality. 2. One by one part check on series after box filling.'],
      ['SS YWD', 'YWD INNER LH 01 BIN FOUND WITH SHORT QTY (2 NOS SHORT)', 'Operator to reverify part qty in bin before move to dispatch'],
      ['YWD ROD', 'WRONG KANBAN PUT ON YWD ROD BIN', 'OJT'],
      ['YHB', 'YHB 4 WAY OUTER SHORT QTY FOUND IN 01 BIN', ''],
      ['connecting rod', 'Wrong kanban found on connecting rod', ''],
      ['Y17', '4 WAY INNER LH 01 NOS SHORT, BATCH CODE B SHIFT', 'Leader to verify every box before dispatch line'],
      ['YCA', 'YCA 4 OUTER 01 BIN FOUND 01 PART SHORT IN BIN', ''],
    ];
    const oitsDays = workDays(60);
    return {
      seatSlider: ps(r.int(30000, 38000)),
      recliner: ps(r.int(17000, 21000)),
      handle: ps(r.int(15000, 19000)),
      gear: ps(r.int(3800, 4600)),
      lessRod: 0, lessRecliner: 0, lessSeat: 0, lessHandle: 0,
      manpower,
      bins,
      oits: issues.map(([model, issue, cm]) => ({
        model, issue, cm,
        opened: fmtDate(r.pick(oitsDays), 'm/d/yyyy'),
        raisedBy: r.pick(PEOPLE), resp: r.pick(PEOPLE),
      })),
    };
  },
};
