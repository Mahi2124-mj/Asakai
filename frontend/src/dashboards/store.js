import { C } from '../theme.js';
import { fmtDate, workDays, MONTHS } from './_gen.js';
import { S } from './_slicers.js';

const DRC = (d, dispatch = 'Dispatch Qty', recv = 'Receiving Qty.', diff = 'Cumulative Difference') => ({
  d, x: 'day', x2: 'month', labelFmt: 'k2', yFmt: 'k', yLabel: 'Qty.', series: [
    { key: 'dispatch', name: dispatch, color: C.blue },
    { key: 'receiving', name: recv, color: C.navy },
    { key: 'diff', name: diff, color: C.orange },
  ],
});

export default {
  key: 'store',
  title: 'Store Asakai Dashboard',
  back: '/portal',
  next: { key: 'hr', label: 'HR' },
  slicers: [S.day(), S.month(), S.year()],
  tabs: [
    {
      name: 'Overview',
      widgets: [
        { type: 'bar', title: 'Store Manpower Status', d: 'manpower', span: 4, x: 'shift', x2: 'day', h: 210, series: [
          { key: 'plan', name: 'PLAN', color: C.blue },
          { key: 'actual', name: 'ACTUAL', color: C.navy },
        ], yLabel: 'Nos.', xLabel: 'SHIFT' },
        { type: 'bar', title: 'Upper Rail SAR Dispatch & Receiving Qty.', span: 4, h: 210, ...DRC('upperSar', 'Dispatch Qty', 'Receiving Qty.', 'Cumulative Diff Sar') },
        { type: 'bar', title: 'Lower Rail SAR Dispatch & Receiving Qty.', span: 4, h: 210, ...DRC('lowerSar', 'Sum of Sar Dispatch', 'Sum of Sar Receiving', 'Sum of Cumulative Diff') },
        { type: 'bar', title: 'Minimum No Of Parts', d: 'minParts', span: 4, h: 200, x: 'day', x2: 'month', series: [{ key: 'value', name: 'Min parts', color: C.blue, type: 'line' }], ref: { y: 0, color: C.blue }, yLabel: 'Nos.' },
        { type: 'bar', title: 'Upper Rail AMS Dispatch & Receiving Qty.', span: 4, h: 200, ...DRC('upperAms') },
        { type: 'bar', title: 'Lower Rail AMS Dispatch & Receiving Qty.', span: 4, h: 200, ...DRC('lowerAms', 'Sum of Ams Dispatch', 'Sum of Ams Receiving', 'Sum of Daily Diff') },
        { type: 'bar', title: 'Maximum No Of Parts', d: 'maxParts', span: 4, h: 200, x: 'day', x2: 'month', series: [{ key: 'value', name: 'Max parts', color: C.blue, type: 'line' }], ref: { y: 5, color: '#000' }, yLabel: 'Nos.' },
        { type: 'bar', title: 'Pending RGP Status', d: 'rgp', span: 8, h: 200, x: 'supplier', series: [{ key: 'pending', name: 'Pending RGP', color: C.blue }], yLabel: 'Nos.' },
      ],
    },
    {
      name: 'Min Parts Detail',
      widgets: [
        { type: 'bar', title: 'Minimum No Of Parts', d: 'minPartsMonth', span: 12, h: 220, x: 'day', x2: 'month', series: [{ key: 'value', name: 'Min parts', color: C.blue, type: 'line' }], ref: { y: 0, color: C.blue }, yLabel: 'Nos.', xLabel: 'Day' },
        { type: 'table', title: 'Parts below minimum', d: 'minPartList', span: 12, maxH: 360, columns: [
          { key: 'date', label: 'Date', w: 100 },
          { key: 'parts', label: 'Part_Name' },
        ] },
      ],
    },
  ],
  demo(f, r) {
    const days = workDays(4);
    const dayRow = (d) => ({ day: String(d.getDate()), month: MONTHS[d.getMonth()] });
    const manpower = [];
    workDays(5).forEach((d) => ['A', 'B'].forEach((s) => {
      const p = s === 'A' ? 20 : 18;
      manpower.push({ ...dayRow(d), shift: s, plan: p, actual: p - r.int(0, 1) });
    }));
    const drc = (base) => days.map((d) => {
      const dispatch = Math.round(base * r.float(0.75, 1.25));
      const receiving = Math.round(dispatch * r.float(0.9, 1.1));
      return { ...dayRow(d), dispatch, receiving, diff: receiving - dispatch };
    });
    const parts = [
      'BRACKET SUB-ASSY, FR MNL SEAT ANC, NO.1 ~ 433203-11180',
      'SPRING, FR MANUAL SEAT PLATE, NO.1 - IMPORT ~ 433345-10120',
      'RAIL SUB-ASSY FR MNL SEAT TRACK UPR NO.1(6WAY OTR RH) ~ 433101-11950-S',
      'TRACK ASSY, FR MNL SEAT, INNER RH ~ 433130-14860',
      'ARM FR MNL SEAT RECLINING LWR NO. 2 ~ 433522-10200-W',
      'REINFORCE FR MNL SEAT TRACK NO. 2 (INNER) ~ 433182-10210-N',
      'ROD RECLINING (YWD) ~ 433622-10140',
    ];
    const monthDays = workDays(26);
    return {
      manpower,
      upperSar: drc(24000),
      lowerSar: drc(24000),
      upperAms: drc(7000),
      lowerAms: drc(5000),
      minParts: workDays(5).map((d) => ({ ...dayRow(d), value: r.int(4, 7) })),
      maxParts: workDays(5).map((d) => ({ ...dayRow(d), value: r.int(4, 5) })),
      rgp: ['SAR Bawal', 'AMS', 'KML', 'Vendor X'].map((s) => ({ supplier: s, pending: r.int(0, 6) })),
      minPartsMonth: monthDays.map((d) => ({ ...dayRow(d), value: r.int(4, 13) })),
      minPartList: [...monthDays].reverse().slice(0, 12).map((d) => ({
        date: fmtDate(d, 'dd-mon-yy'),
        parts: parts.filter(() => r.chance(0.55)).join(', ') || parts[0],
      })),
    };
  },
};
