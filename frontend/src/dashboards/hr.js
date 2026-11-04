import { C } from '../theme.js';
import { fmtDate, workDays } from './_gen.js';
import { S } from './_slicers.js';

const DEPTS = ['SEATS', 'PRESS', 'SUB ASSY', 'STORE', 'RECLINER', 'SEAT SLIDER', 'DISPATCH', 'RECLINER 2', 'OJT', 'QUALITY', 'LOOP PIPE', 'DOJO', 'THIN REC', 'DISPATCH 2', 'OJT (H)', 'QUALITY 2', 'LOOP 2', 'DOJO 2', 'LAB', 'WELD', 'FABRICATION', 'ROUND', 'QUALITY 3'];

export default {
  key: 'hr',
  title: 'HR Manpower Dashboard',
  back: '/portal',
  next: { key: 'customer-quality', label: 'Customer Quality' },
  slicers: [
    S.lines(['A SHIFT', 'B SHIFT'], 'Shift'),
    S.date(),
    S.select('dept', 'Department', ['DOJO', 'PRODUCTION', 'QUALITY', 'SCM']),
  ],
  tabs: [
    {
      name: 'Overview',
      widgets: [
        { type: 'kpiGoal', title: 'Present M/P (A-Shift)', d: 'presentA', span: 2 },
        { type: 'kpiGoal', title: 'Present M/P (B-Shift)', d: 'presentB', span: 2 },
        { type: 'kpi', label: 'Absent M/P', d: 'absent', span: 2 },
        { type: 'kpi', label: 'Left M/P', d: 'left', span: 2 },
        { type: 'kpiRow', span: 4, lead: 'OJT & Dojo Buffer M/P', items: [
          { label: 'OJT M/P', d: 'ojt', fmt: 'k0' },
          { label: 'Dojo buffer', d: 'buffer', fmt: 'k0' },
        ] },
        { type: 'gauge', title: 'Manpower (L1+OJT+Buffer) against Plan', d: 'gTotal', span: 3, color: C.red },
        { type: 'gauge', title: 'Production L1 Manpower', d: 'gProd', span: 2, color: '#F2C811' },
        { type: 'gauge', title: 'Quality L1 Manpower', d: 'gQuality', span: 2, color: '#F2C811' },
        { type: 'gauge', title: 'SCM L1 Manpower', d: 'gScm', span: 2, color: '#F2C811' },
        { type: 'gauge', title: 'DOJO M/P Against Total', d: 'gDojo', span: 3, color: C.red },
        { type: 'bar', title: 'Total Manpower Actual, OJT Manpower and Plan Manpower by Department', d: 'byDept', span: 7, h: 260, x: 'dept', labelFmt: 'k', yFmt: 'k', minBarWidth: 34, series: [
          { key: 'actual', name: 'Total Manpower Actual', color: C.blue, stack: 'a' },
          { key: 'ojt', name: 'OJT Manpower', color: C.navy, stack: 'a', label: false },
          { key: 'plan', name: 'Plan Manpower', color: C.orange, type: 'line', label: false },
        ], xLabel: 'Department', tickAngle: -40 },
        { type: 'bar', title: 'Available Manpower, DOJO TOTAL and GAP', d: 'avail', span: 3, h: 260, x: 'name', yFmt: 'pct0', series: [
          { key: 'available', name: 'Available', color: C.blue, stack: 's' },
          { key: 'dojo', name: 'DOJO TOTAL', color: C.navy, stack: 's' },
          { key: 'gap', name: 'GAP', color: C.orange, stack: 's' },
        ], labelFmt: 'pct0' },
        { type: 'table', title: 'HR INFORMATION', titleStyle: 'banner', d: 'info', span: 2, maxH: 230, columns: [
          { key: 'date', label: 'Date' }, { key: 'desc', label: 'Description' }, { key: 'period', label: 'Time Period' },
        ] },
      ],
    },
    {
      name: 'Monthly Trend',
      widgets: [
        { type: 'bar', title: 'Present Manpower Trend', d: 'trend', span: 12, h: 320, x: 'date', series: [
          { key: 'a', name: 'A-Shift', color: C.blue },
          { key: 'b', name: 'B-Shift', color: C.navy },
          { key: 'plan', name: 'Plan', color: C.orange, type: 'line' },
        ], labelFmt: 'num', xLabel: 'Date' },
      ],
    },
  ],
  demo(f, r) {
    const a = r.int(180, 215);
    const byDept = DEPTS.map((dept, i) => {
      const base = Math.max(0, Math.round(18000 / (i + 1) ** 1.15 * r.float(0.8, 1.2)));
      return { dept, actual: base, ojt: Math.round(base * r.float(0.1, 0.4)), plan: Math.round(base * r.float(0.9, 1.15)) };
    });
    const avail = r.int(50, 60);
    const dojo = r.int(8, 14);
    return {
      presentA: { value: a, goal: 187, good: a >= 187 },
      presentB: { value: r.int(0, 1) ? r.int(150, 170) : 0, goal: 160 },
      absent: '--',
      left: '--',
      ojt: r.int(2500, 3400),
      buffer: r.int(800, 1300),
      gTotal: { value: r.int(70000, 80000), max: 89000 },
      gProd: { value: r.int(50000, 56000), max: 56000 },
      gQuality: { value: r.int(4300, 4667), max: 4667 },
      gScm: { value: r.int(12000, 14000), max: 14000 },
      gDojo: { value: r.int(1200, 1700), max: 13000 },
      byDept,
      avail: [{ name: '', available: avail, dojo, gap: 100 - avail - dojo }],
      info: [
        { date: 'Monday, 16 Feb', desc: 'Holi leave survey to be conducted', period: 'Already shared' },
        { date: 'Friday, 20 Feb', desc: 'Line leader training', period: '20th Feb' },
        { date: 'Monday, 2 Mar', desc: 'Safety week', period: '2–7 Mar' },
      ],
      trend: workDays(20).map((d) => ({ date: fmtDate(d), a: r.int(180, 215), b: r.int(150, 175), plan: 187 })),
    };
  },
};
