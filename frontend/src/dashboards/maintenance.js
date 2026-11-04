import { C } from '../theme.js';
import { fmtDate, workDays, MONTHS } from './_gen.js';
import { S } from './_slicers.js';

const ZONES = ['PRESS SHOP', 'LOOP PIPE', 'SUB_ASSEMBLY', 'SEAT_SLIDER', 'RECLINER', 'THIN RECLINER'];
const LINES = ['SA_6W_YNC', 'SA_4W_YSD', 'SA_4W_YNC', 'YRA_RC', 'SA_4W_YHB', 'YMC_RC', 'YRA_SS', 'SA_6W_YRA', 'YHB_RC'];
const TOOLS = ['YTA_LOWER', 'YFG_UPPER', 'YTA_UPPER', 'YFG_LOWER', 'YY8_LOWER'];

const pillLabels = { labelStyle: 'pill' };

export const maintenance = {
  key: 'maintenance',
  title: `e-Asakai Dashboard Maintenance FY-${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(2)}`,
  back: '/portal',
  next: { key: 'die-maintenance', label: 'Die Maintenance' },
  slicers: [S.fy('Financial_Year'), S.month(), S.date(), S.lastDay(), S.select('zone', 'ZONE', ZONES)],
  tabs: [{
    name: 'Overview',
    widgets: [
      { type: 'bar', title: `ZONE WISE TARGET VS ACTUAL (${MONTHS[new Date().getMonth()].toUpperCase()}) MINUTE`, d: 'zone', span: 6, h: 300, x: 'zone', series: [
        { key: 'target', name: 'Target', color: '#2FD34F' }, { key: 'actual', name: 'Actual', color: C.blue },
      ], yLabel: 'Minutes', xLabel: 'ZONE', tickAngle: -20 },
      { type: 'bar', title: 'LINE WISE BREAKDOWN SUMMARY (MINUTE)', d: 'lines', span: 4, h: 300, x: 'line', series: [{ key: 'min', name: 'Minutes', color: C.navy }], yLabel: 'Minutes', xLabel: 'LINE', tickAngle: -35, ...pillLabels },
      { type: 'kpi', label: 'No. of B/D Frequency', d: 'freq', span: 2 },
      { type: 'table', title: 'Breakdown Detail', d: 'rows', span: 12, maxH: 320, columns: [
        { key: 'date', label: 'BREAKDOWN_DATE' }, { key: 'zone', label: 'ZONE' }, { key: 'line', label: 'LINE' }, { key: 'machine', label: 'MACHINE_NO.' },
        { key: 'problem', label: 'PROBLEM_OBSERVED_BY_MAINTENANCE', w: 280 }, { key: 'action', label: 'ACTION_TAKEN_ON_PROBLEM', w: 280 }, { key: 'min', label: 'B/D (min)', align: 'right' },
      ] },
    ],
  }],
  demo(f, r) {
    const rows = Array.from({ length: 10 }, () => {
      const line = r.pick(LINES);
      return {
        date: fmtDate(r.pick(workDays(25)), 'm/d/yyyy'), zone: r.pick(ZONES), line, machine: `${line}_M${r.int(10, 40)}`,
        problem: r.pick(['Sensor not working', 'Cylinder air leakage', 'Robot alarm', 'Hydraulic oil leakage', 'Motor overload trip']),
        action: r.pick(['Sensor replaced', 'Seal replaced and trial OK', 'Robot reset and teaching corrected', 'Hose replaced', 'Motor checked, load reduced']),
        min: r.int(10, 90),
      };
    });
    return {
      zone: ZONES.map((zone) => ({ zone, target: 600, actual: r.int(150, 900) })),
      lines: LINES.map((line) => ({ line, min: r.int(10, 140) })).sort((a, b) => b.min - a.min),
      freq: rows.length,
      rows,
    };
  },
};

export const dieMaintenance = {
  key: 'die-maintenance',
  title: 'Die Maintenance Asakai Dashboard',
  back: '/portal',
  next: { key: 'toolroom', label: 'Toolroom' },
  slicers: [S.date(), S.month('MONTH'), S.select('shift', 'SHIFT', ['A', 'B']), S.lastDay('Last Date'), S.select('tool', 'TOOL', TOOLS)],
  tabs: [{
    name: 'Overview',
    widgets: [
      { type: 'bar', title: 'SUM OF FREQUENCY (MONTH)', d: 'month', span: 5, h: 280, x: 'month', series: [
        { key: 'actual', name: 'ACTUAL FREQUENCY', color: C.blue }, { key: 'freq', name: 'FREQUENCY', color: C.navy, type: 'line', dashed: true },
      ], xLabel: 'MONTH', ...pillLabels },
      { type: 'bar', title: 'SUM OF FREQUENCY (DAY)', d: 'day', span: 5, h: 280, x: 'x', x2: 'tool', series: [
        { key: 'actual', name: 'ACTUAL FREQUENCY', color: C.blue }, { key: 'freq', name: 'FREQUENCY', color: C.navy, type: 'line', dashed: true },
      ], xLabel: 'TOOL', minBarWidth: 22, ...pillLabels },
      { type: 'kpiStack', span: 2, items: [{ label: 'B/D in Frequency', d: 'bdFreq' }, { label: 'B/D in Min', d: 'bdMin' }] },
      { type: 'table', title: 'Breakdown Detail', d: 'rows', span: 7, maxH: 260, columns: [
        { key: 'date', label: 'BREAKDOWN DATE' }, { key: 'tool', label: 'TOOL' }, { key: 'problem', label: 'PROBLEM REPORTED BY PRODUCTION', w: 160 }, { key: 'action', label: 'ACTION TAKEN', w: 320 },
      ] },
      { type: 'bar', title: 'TOOL WISE BREAKDOWN SUMMARY (MINUTE)', d: 'tools', span: 5, h: 240, x: 'tool', series: [{ key: 'min', name: 'MINUTES', color: '#7DBEF5' }], xLabel: 'TOOL', ...pillLabels },
    ],
  }],
  demo(f, r) {
    const now = new Date().getMonth();
    const month = Array.from({ length: 6 }, (_, i) => {
      const m = (now - 5 + i + 12) % 12;
      return { month: MONTHS[m], actual: r.int(5, 55), freq: r.int(60, 75) };
    });
    const day = workDays(14).map((d) => ({ x: String(d.getDate()), tool: r.pick(TOOLS), actual: r.chance(0.1) ? 2 : 1, freq: 3 }));
    const tools = TOOLS.map((tool) => ({ tool, min: r.int(5, 60) })).sort((a, b) => b.min - a.min);
    return {
      month, day, tools,
      bdFreq: day.reduce((s, x) => s + x.actual, 0),
      bdMin: tools.reduce((s, x) => s + x.min, 0),
      rows: workDays(8).map((d) => ({
        date: fmtDate(d, 'm/d/yyyy'), tool: r.pick(TOOLS),
        problem: r.pick(['INSERT BROKEN', 'TAB BENDING DIM NG', 'GUIDE BLOCK BOLT BROKEN', 'LOWER MOLD MID PAD']),
        action: r.pick(['Lower mold B2 insert broken, removed and new insert fitted', 'Upper mold tab bending block B1, B2 removed and part trial OK', 'Tool unloading and lower mold F1 guide block bolt replaced']),
      })),
    };
  },
};

export const toolroom = {
  key: 'toolroom',
  title: 'Toolroom Asakai Dashboard',
  back: '/portal',
  next: { key: 'quality-circle', label: 'Next' },
  slicers: [S.lastDay('Last Date'), S.month(), S.select('shift', 'SHIFT', ['A', 'B']), S.date('Breakdown_Date'), S.select('zone', 'Zone', ['RECLINER', 'SUB_ASSEMBLY', 'SEAT_SLIDER'])],
  tabs: [{
    name: 'Overview',
    widgets: [
      { type: 'bar', title: 'NO. OF BREAKDOWNS', d: 'zones', span: 5, h: 280, x: 'zone', series: [{ key: 'qty', name: 'QUANTITY', color: C.blue }], yLabel: 'QUANTITY', xLabel: 'zone' },
      { type: 'bar', title: 'LINE WISE BREAKDOWN SUMMARY (MINUTE)', d: 'lines', span: 5, h: 280, x: 'line', series: [{ key: 'min', name: 'Minutes', color: '#14176B' }], yLabel: 'TIME TAKEN TO SOLVE BD (MINUTE)', xLabel: 'LINE', tickAngle: -40, ...pillLabels },
      { type: 'kpiStack', span: 2, items: [{ label: 'No. of B/D Frequency', d: 'freq' }, { label: 'B/D in Min', d: 'bdMin' }] },
      { type: 'table', title: 'Breakdown Detail', d: 'rows', span: 12, maxH: 300, columns: [
        { key: 'date', label: 'DATE' }, { key: 'zone', label: 'ZONE' }, { key: 'line', label: 'LINE' }, { key: 'machine', label: 'MACHINE_NO' },
        { key: 'problem', label: 'PROBLEM_OBSERVED_BY_TOOL_ROOM', w: 260 }, { key: 'action', label: 'ACTION TAKEN', w: 320 },
      ] },
    ],
  }],
  demo(f, r) {
    const lines = LINES.map((line) => ({ line, min: r.int(15, 130) })).sort((a, b) => b.min - a.min);
    const zones = [{ zone: 'SUB_ASSEMBLY', qty: r.int(6, 12) }, { zone: 'RECLINER', qty: r.int(2, 5) }, { zone: 'SEAT_SLIDER', qty: r.int(0, 2) }];
    return {
      zones, lines,
      freq: zones.reduce((s, x) => s + x.qty, 0),
      bdMin: lines.reduce((s, x) => s + x.min, 0),
      rows: workDays(10).map((d) => {
        const line = r.pick(LINES);
        return {
          date: fmtDate(d, 'm/d/yyyy'), zone: line.startsWith('SA') ? 'SUB_ASSEMBLY' : line.endsWith('RC') ? 'RECLINER' : 'SEAT_SLIDER', line, machine: `${line}_PWM_${r.int(20, 36)}`,
          problem: r.pick(['RUNNING LINE CD NG DUE TO OUTER MODEL', 'PART STUCK IN L-BKT GUIDE PIN', 'CD NG PROBLEM', 'L-BKT GUIDE BLOCK BROKEN', 'PUNCH MARK ON SILVER RIVET']),
          action: r.pick(['Lower fixture alignment then sensor block set', 'Broken block removed & new block fitment & alignment', '1st pin cylinder alignment then part trial OK', 'Upper & lower fixture alignment then OK']),
        };
      }),
    };
  },
};
