import { C, TARGET } from '../theme.js';
import { fmtDate, workDays, MONTHS, PEOPLE } from './_gen.js';
import { S } from './_slicers.js';
import { DEMO_MACHINES, matchMachines } from './_machines.js';

// Zone / Line / Machine No. come from the machine master (maintenance_db); demo rows follow them.
const MASTER_SLICERS = [S.zone('ZONE'), S.masterLine('LINE'), S.machine('MACHINE_NO.')];
const machinesFor = (f) => {
  const m = matchMachines(DEMO_MACHINES, f);
  return m.length ? m : DEMO_MACHINES;
};
const linesOf = (machines) => [...new Set(machines.map((m) => m[1]))];
const TOP_LINES = 10; // line charts show the worst ten lines
const TOOLS = ['YTA_LOWER', 'YFG_UPPER', 'YTA_UPPER', 'YFG_LOWER', 'YY8_LOWER'];

const pillLabels = { labelStyle: 'pill' };

// Maintenance Asakai -- the MES Asakai page (Maintenance_DX mes-frontend, port 9965), drawn by
// pages/MaintenanceAsakai.jsx. Server: providers.py `maintenance` runs the same SQL on maintenance_db
// and returns the MES /api/asakai/overview response; demo() below returns that shape too.
const PROBLEMS = ['Sensor not working', 'Cylinder air leakage', 'Robot alarm', 'Hydraulic oil leakage', 'Motor overload trip', 'Clamp not working', 'Weld nut feeder jam'];
const ACTIONS = ['Sensor replaced', 'Seal replaced and trial OK', 'Robot reset and teaching corrected', 'Hose replaced', 'Motor checked, load reduced', 'Clamp cylinder aligned', 'Feeder cleaned and trial OK'];
const CATS = ['A', 'B', 'C'];
const pad2 = (n) => String(n).padStart(2, '0');
const clock = (m) => `${pad2(Math.floor(m / 60) % 24)}:${pad2(m % 60)}`;
const isoDay = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const maintenance = {
  key: 'maintenance',
  title: 'Asakai',
  back: '/portal',
  next: { key: 'die-maintenance', label: 'Die Maintenance' },
  page: 'maintenanceAsakai',
  // The page has its own date control; these keys are the filters the server accepts.
  slicers: [{ key: 'date', label: 'Date' }],
  tabs: [],
  demo(f, r) {
    const machines = machinesFor(f);
    const zoneOf = Object.fromEntries(machines.map((m) => [m[1], m[0]]));
    const day = f.date || isoDay(workDays(1)[0]);
    const andon = linesOf(machines).map((line) => ({ zone: zoneOf[line], line, calls: r.chance(0.6) ? r.int(1, 9) : 0 }))
      .filter((x) => x.calls).sort((a, b) => b.calls - a.calls).slice(0, 12);
    const rows = Array.from({ length: r.int(7, 13) }, () => {
      const [zone, line, machineNo, machineName] = r.pick(machines);
      const start = 510 + r.int(0, 900);
      const minutes = r.int(5, 95);
      return {
        slip_date: day, category: r.pick(['A', 'B', 'B', 'C', 'C']), zone, line, machine_no: machineNo, machine_name: machineName,
        problem: r.pick(PROBLEMS), action: r.pick(ACTIONS), start: clock(start), end: clock(start + minutes), minutes,
        attended_by: r.pick(PEOPLE), frequency: 1, slip: r.pick(['Manual', 'Auto']), _t: start,
      };
    }).sort((a, b) => CATS.indexOf(a.category) - CATS.indexOf(b.category) || a._t - b._t).map(({ _t, ...x }) => x);
    const byLine = {};
    rows.forEach((x) => {
      const b = byLine[x.line] || (byLine[x.line] = { zone: x.zone, line: x.line, frequency: 0, minutes: 0 });
      b.frequency += x.frequency;
      b.minutes += x.minutes;
    });
    const bd = Object.values(byLine).map((b) => ({ ...b, hours: +(b.minutes / 60).toFixed(2) }))
      .sort((a, b) => b.frequency - a.frequency || b.minutes - a.minutes);
    const zones = {};
    andon.forEach((a) => {
      const n = r.int(0, a.calls);
      if (!n) return;
      const z = zones[a.zone] || (zones[a.zone] = { zone: a.zone, total: 0, lines: [] });
      z.total += n;
      z.lines.push({ line: a.line, n });
    });
    const byZone = Object.values(zones).sort((a, b) => b.total - a.total);
    byZone.forEach((z) => z.lines.sort((a, b) => b.n - a.n));
    return {
      date: day,
      andon_by_line: andon,
      bd_by_line: bd,
      totals: {
        andon_calls: andon.reduce((a, x) => a + x.calls, 0),
        breakdowns: bd.reduce((a, b) => a + b.frequency, 0),
        bd_minutes: bd.reduce((a, b) => a + b.minutes, 0),
      },
      rows,
      not_filled: { total: byZone.reduce((a, z) => a + z.total, 0), by_zone: byZone },
    };
  },
};

export const dieMaintenance = {
  key: 'die-maintenance',
  title: 'Die Maintenance Asakai Dashboard',
  back: '/portal',
  next: { key: 'toolroom', label: 'Toolroom' },
  slicers: [S.date(), S.month('MONTH'), S.select('shift', 'SHIFT', ['A', 'B']), S.lastDay('Last Date'), S.select('tool', 'TOOL', TOOLS), ...MASTER_SLICERS],
  tabs: [{
    name: 'Overview',
    widgets: [
      { type: 'bar', title: 'SUM OF FREQUENCY (MONTH)', d: 'month', span: 5, h: 280, x: 'month', series: [
        { key: 'actual', name: 'ACTUAL FREQUENCY', color: C.navy }, { key: 'freq', name: 'FREQUENCY', color: TARGET, type: 'line', dashed: true },
      ], xLabel: 'MONTH', ...pillLabels },
      { type: 'bar', title: 'SUM OF FREQUENCY (DAY)', d: 'day', span: 5, h: 280, x: 'x', x2: 'tool', series: [
        { key: 'actual', name: 'ACTUAL FREQUENCY', color: C.navy }, { key: 'freq', name: 'FREQUENCY', color: TARGET, type: 'line', dashed: true },
      ], xLabel: 'TOOL', minBarWidth: 22, ...pillLabels },
      { type: 'kpiStack', span: 2, items: [{ label: 'B/D in Frequency', d: 'bdFreq' }, { label: 'B/D in Min', d: 'bdMin' }] },
      { type: 'table', title: 'Breakdown Detail', d: 'rows', span: 7, maxH: 260, columns: [
        { key: 'date', label: 'BREAKDOWN DATE' }, { key: 'tool', label: 'TOOL' }, { key: 'problem', label: 'PROBLEM REPORTED BY PRODUCTION', w: 160 }, { key: 'action', label: 'ACTION TAKEN', w: 320 },
      ] },
      { type: 'bar', title: 'TOOL WISE BREAKDOWN SUMMARY (MINUTE)', d: 'tools', span: 5, h: 240, x: 'tool', series: [{ key: 'min', name: 'MINUTES', color: C.navy }], xLabel: 'TOOL', ...pillLabels },
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
  slicers: [S.lastDay('Last Date'), S.month(), S.select('shift', 'SHIFT', ['A', 'B']), S.date('Breakdown_Date'), ...MASTER_SLICERS],
  tabs: [{
    name: 'Overview',
    widgets: [
      { type: 'bar', title: 'NO. OF BREAKDOWNS', d: 'zones', span: 5, h: 280, x: 'zone', series: [{ key: 'qty', name: 'QUANTITY', color: C.navy }], yLabel: 'QUANTITY', xLabel: 'zone' },
      { type: 'bar', title: 'LINE WISE BREAKDOWN SUMMARY (MINUTE)', d: 'lines', span: 5, h: 280, x: 'line', series: [{ key: 'min', name: 'Minutes', color: C.navy }], yLabel: 'TIME TAKEN TO SOLVE BD (MINUTE)', xLabel: 'LINE', tickAngle: -40, ...pillLabels },
      { type: 'kpiStack', span: 2, items: [{ label: 'No. of B/D Frequency', d: 'freq' }, { label: 'B/D in Min', d: 'bdMin' }] },
      { type: 'table', title: 'Breakdown Detail', d: 'rows', span: 12, maxH: 300, columns: [
        { key: 'date', label: 'DATE' }, { key: 'zone', label: 'ZONE' }, { key: 'line', label: 'LINE' }, { key: 'machine', label: 'MACHINE_NO' },
        { key: 'problem', label: 'PROBLEM_OBSERVED_BY_TOOL_ROOM', w: 260 }, { key: 'action', label: 'ACTION TAKEN', w: 320 },
      ] },
    ],
  }],
  demo(f, r) {
    const machines = machinesFor(f);
    const lines = linesOf(machines).map((line) => ({ line, min: r.int(15, 130) })).sort((a, b) => b.min - a.min).slice(0, TOP_LINES);
    const zones = [...new Set(machines.map((m) => m[0]))].map((zone) => ({ zone, qty: r.int(0, 12) })).sort((a, b) => b.qty - a.qty);
    return {
      zones, lines,
      freq: zones.reduce((s, x) => s + x.qty, 0),
      bdMin: lines.reduce((s, x) => s + x.min, 0),
      rows: workDays(10).map((d) => {
        const [zone, line, machine] = r.pick(machines);
        return {
          date: fmtDate(d, 'm/d/yyyy'), zone, line, machine,
          problem: r.pick(['RUNNING LINE CD NG DUE TO OUTER MODEL', 'PART STUCK IN L-BKT GUIDE PIN', 'CD NG PROBLEM', 'L-BKT GUIDE BLOCK BROKEN', 'PUNCH MARK ON SILVER RIVET']),
          action: r.pick(['Lower fixture alignment then sensor block set', 'Broken block removed & new block fitment & alignment', '1st pin cylinder alignment then part trial OK', 'Upper & lower fixture alignment then OK']),
        };
      }),
    };
  },
};
