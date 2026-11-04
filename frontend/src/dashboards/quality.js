import { C, STATUS } from '../theme.js';
import { fmtDate, workDays, PEOPLE } from './_gen.js';
import { S } from './_slicers.js';

const CUSTOMERS = ['BSL Gujarat', 'BSL Gurugram', 'BSL Kharkhoda', 'BSL Manesar', 'NDR Bengaluru', 'KML Gujarat', 'KML Kharkhoda', 'KML Manesar', 'KML Narsinghpur'];

export const customerQuality = {
  key: 'customer-quality',
  title: 'Customer Complaint Management System',
  back: '/portal/quality',
  next: { key: 'receiving-quality', label: 'Receiving Quality' },
  slicers: [S.select('customer', 'Customer_Name', CUSTOMERS, { wide: true }), S.year(), S.month()],
  tabs: [
    {
      name: 'Overview',
      widgets: [
        ...CUSTOMERS.slice(0, 4).map((c) => ({ type: 'calendar', title: c, d: `cal_${c}`, span: 3 })),
        { type: 'donut', title: '4M Category', d: 'cat4m', span: 2, h: 170, inner: 0 },
        { type: 'bar', title: 'Problem (New / Repeated)', d: 'newRepeat', span: 2, h: 170, x: 'name', series: [{ key: 'value', name: 'Problems', color: C.navy }] },
        { type: 'bar', title: 'Total Problem', d: 'total', span: 2, h: 170, x: 'name', series: [
          { key: 'close', name: 'Close_Problem', color: STATUS.closed, stack: 't' },
          { key: 'open', name: 'Open_Problem', color: STATUS.open, stack: 't' },
        ] },
        { type: 'bar', title: 'Problem Status', d: 'status', span: 4, h: 170, x: 'name', series: [
          { key: 'close', name: 'Close', color: STATUS.closed, stack: 's' },
          { key: 'open', name: 'Open', color: STATUS.open, stack: 's' },
        ] },
        { type: 'badge', title: 'Defect', d: 'noComplaint', span: 2, h: 170 },
        ...CUSTOMERS.slice(4).map((c) => ({ type: 'calendar', title: c, d: `cal_${c}`, span: c === 'NDR Bengaluru' ? 4 : 2, compact: true })),
      ],
    },
    {
      name: 'All Problem Status',
      widgets: [
        { type: 'table', title: 'Customer complaints', d: 'complaints', span: 12, maxH: 560, columns: [
          { key: 'date', label: 'Date', w: 90 },
          { key: 'customer', label: 'Customer', w: 110 },
          { key: 'part', label: 'Part Name', w: 110 },
          { key: 'type', label: 'Problem Type', w: 160 },
          { key: 'problem', label: 'Problem', w: 180 },
          { key: 'img', label: 'Defect image', type: 'img', w: 90 },
          { key: 'root', label: 'Root cause', w: 160 },
          { key: 'cm', label: 'Countermeasure', w: 220 },
          { key: 'status', label: 'Status', type: 'status', w: 80 },
        ] },
      ],
    },
  ],
  demo(f, r) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getDate() < 8 ? now.getMonth() - 1 : now.getMonth();
    const m = (month + 12) % 12;
    const y = month < 0 ? year - 1 : year;
    const nDays = new Date(y, m + 1, 0).getDate();
    const holidays = new Set([r.int(1, 28), r.int(1, 28)]);
    const out = {};
    const statusRows = [];
    const complaints = [];
    const problems = [
      ['SSR Outer RH', 'Abnormal handling at customer end', 'No need of any permanent action', ''],
      ['SSR Outer LH', 'Abnormal handling at KML end', 'No need of any permanent action', 'Rec lower arm lug burnt'],
      ['4 Way Inner RH', '', '', 'Stress mark on upper end cap'],
      ['4 Way Inner LH', '', '', 'Adjuster sliding noise'],
    ];
    for (const c of CUSTOMERS) {
      const days = {};
      let open = 0, close = 0;
      for (let d = 1; d <= nDays; d++) {
        const dt = new Date(y, m, d);
        const future = dt > now;
        if (dt.getDay() === 0 || holidays.has(d)) days[d] = 'off';
        else if (future) days[d] = 'none';
        else if (r.chance(0.025)) {
          days[d] = 'ng';
          const isOpen = r.chance(0.6);
          isOpen ? open++ : close++;
          const p = r.pick(problems);
          complaints.push({ date: fmtDate(dt, 'm/d/yyyy'), customer: c, part: p[0], type: 'Complaint from customer', problem: p[3], img: '', root: p[1], cm: p[2], status: isOpen ? 'OPEN' : 'CLOSED' });
        } else days[d] = 'ok';
      }
      out[`cal_${c}`] = { year: y, month: m, days };
      if (open + close) statusRows.push({ name: c, open, close });
    }
    const open = statusRows.reduce((s, x) => s + x.open, 0);
    const close = statusRows.reduce((s, x) => s + x.close, 0);
    return {
      ...out,
      cat4m: [{ name: 'Others', value: open + close || 1, color: C.aqua }],
      newRepeat: [{ name: 'New', value: open + close }],
      total: [{ name: 'Customer', open, close }],
      status: statusRows,
      noComplaint: { ok: open === 0, text: open === 0 ? 'NO COMPLAINT' : `${open} OPEN` },
      complaints,
    };
  },
};

const PARTS = ['Upper Rail Inspection', 'Lower Arm Blank', 'Riser bkt RH', 'Piano plate lock spring', 'YHB loop handle'];

export const receivingQuality = {
  key: 'receiving-quality',
  title: 'BOP Child Part Quality Dashboard',
  back: '/portal/quality',
  next: { key: 'press-shop', label: 'Press Shop' },
  showUpdated: true,
  slicers: [S.month(), S.date()],
  tabs: [
    {
      name: 'Overview',
      widgets: [
        { type: 'kpi', label: 'Total Loop Handle Plan', d: 'loopPlan', fmt: 'k2', span: 2, small: true },
        { type: 'kpi', label: 'Total Loop Handle Checked', d: 'loopChecked', fmt: 'k2', span: 2, small: true },
        { type: 'kpiRow', span: 2, items: [{ label: 'Total Part_Insp Plan', d: 'inspPlan', fmt: 'k0' }, { label: 'Total Part_Insp Actual', d: 'inspActual', fmt: 'k0' }], small: true },
        { type: 'kpi', label: 'Eff_of_plan/actual', d: 'eff', fmt: 'pct1', span: 2, small: true },
        { type: 'kpi', label: 'Sum of Lot_Reject', d: 'lotReject', span: 1, small: true },
        { type: 'kpi', label: 'Sum of Lot_Hold', d: 'lotHold', span: 1, small: true },
        { type: 'table', title: 'SUBMITTED BY', d: 'submitted', span: 2, maxH: 110, columns: [{ key: 'day', label: 'Day' }, { key: 'a', label: 'Shift A' }, { key: 'b', label: 'Shift B' }] },
        { type: 'bar', title: 'PART CHECK PLAN VS ACTUAL', d: 'checks', span: 3, h: 210, x: 'date', series: [
          { key: 'plan', name: 'Dim_Check_Plan', color: C.blue },
          { key: 'actual', name: 'Dim_Check_Actual', color: C.navy, label: false },
        ], yLabel: 'No of Qty', minBarWidth: 30 },
        { type: 'donut', title: 'LOT STATUS (OK/NG/HOLD)', d: 'lots', span: 3, h: 210, fmt: 'pct1' },
        { type: 'bar', title: 'MANPOWER SHIFT WISE', d: 'mp', span: 3, h: 210, x: 'shift', x2: 'date', series: [
          { key: 'planA', name: 'MP-Plan-A', color: C.blue },
          { key: 'actualA', name: 'MP-Actual-A', color: C.navy },
          { key: 'planB', name: 'MP-Plan-B', color: C.orange },
          { key: 'actualB', name: 'MP-Actual-B', color: C.aqua },
        ], yLabel: 'No of Qty', minBarWidth: 50 },
        { type: 'table', title: 'RQC OITS SHEET', d: 'oits', span: 3, maxH: 200, columns: [{ key: 'date', label: 'Date' }, { key: 'oits', label: 'OITS' }, { key: 'status', label: 'Status' }] },
        { type: 'table', title: 'Line Issue Detail', d: 'lineIssues', span: 6, maxH: 230, columns: [
          { key: 'date', label: 'Date' }, { key: 'shift', label: 'Shift' }, { key: 'zone', label: 'Section_Zone' }, { key: 'line', label: 'Line_Name' },
          { key: 'issue', label: 'Line_Issue', w: 200 }, { key: 'status', label: 'Status' }, { key: 'img', label: 'Defective part Image', type: 'img' },
        ] },
        { type: 'table', title: 'RQC Segregation Detail', d: 'segregation', span: 6, maxH: 230, columns: [
          { key: 'date', label: 'Date' }, { key: 'shift', label: 'Shift' }, { key: 'supplier', label: 'Supplier_Name' }, { key: 'part', label: 'Part_Name', w: 180 },
          { key: 'seg', label: 'Seg._Qty', align: 'right' }, { key: 'ng', label: 'Ng_Qty', align: 'right' }, { key: 'img', label: 'Containment_Image', type: 'img' },
        ] },
      ],
    },
    {
      name: 'Efficiency',
      widgets: [
        { type: 'bar', title: 'EFF. PLAN/ACTUAL (DATE WISE)', d: 'effTrend', span: 12, h: 380, x: 'date', yFmt: 'pct0', yDomain: [0, 105], series: [{ key: 'eff', name: '% of Eff.', color: C.navy, type: 'line' }], labelFmt: 'pct1', yLabel: '% of Eff.', xLabel: 'Date' },
      ],
    },
    {
      name: 'Remarks',
      widgets: [
        { type: 'table', title: 'Lot Reject Remarks', d: 'remarks', span: 6, maxH: 460, columns: [{ key: 'date', label: 'Date' }, { key: 'shift', label: 'Shift' }, { key: 'remark', label: 'Lot_Reject_Remarks', w: 240 }] },
        { type: 'table', title: 'Daily Summary', d: 'daily', span: 6, maxH: 460, columns: [{ key: 'date', label: 'Date', w: 220 }, { key: 'line', label: 'LineIssue', align: 'right' }, { key: 'hold', label: 'LotHold', align: 'right' }, { key: 'seg', label: 'Segregation', align: 'right' }] },
      ],
    },
  ],
  demo(f, r) {
    const days = workDays(14);
    const shiftsRows = [];
    days.slice(-6).forEach((d) => ['Shift A', 'Shift B'].forEach((s) => shiftsRows.push({ date: fmtDate(d, 'dd-mon-yy').slice(0, 6), shift: s })));
    const hold = r.float(0.5, 2.5, 1);
    const plan = r.int(460000, 480000);
    return {
      loopPlan: plan,
      loopChecked: Math.round(plan * r.float(1, 1.03)),
      inspPlan: 1000, inspActual: 1000,
      eff: 100,
      lotReject: 0,
      lotHold: r.int(8, 20),
      submitted: [1, 2, 3].map((i) => { const p = r.pick(PEOPLE); return { day: i, a: p, b: p }; }),
      checks: days.map((d) => ({ date: fmtDate(d, 'dd-mon-yy').slice(0, 6), plan: r.int(37, 46), actual: r.int(37, 46) })),
      lots: [
        { name: 'Lot_Hold', value: hold, color: STATUS.warn },
        { name: 'OK Lot', value: +(100 - hold).toFixed(1), color: STATUS.good },
        { name: 'Lot_Reject', value: 0, color: STATUS.bad },
      ],
      mp: days.slice(-5).map((d) => ({ date: fmtDate(d, 'dd-mon-yy').slice(0, 6), shift: 'A / B', planA: 11, actualA: r.int(10, 12), planB: 6, actualB: r.int(5, 6) })),
      oits: days.slice(0, 8).map((d) => ({ date: fmtDate(d, 'dd-mon-yy'), oits: 'NA', status: 'NA' })),
      lineIssues: [
        { date: fmtDate(days[2], 'dd-mon-yy'), shift: 'Shift B', zone: 'LOOP_PIPE', line: 'LOOP_PIPE_3', issue: 'CTL YHB length short issue on part, total 50 parts', status: 'Under segregation', img: '' },
        { date: fmtDate(days[6], 'dd-mon-yy'), shift: 'Shift A', zone: 'PRESS', line: 'PRESS_2', issue: 'Burr on blank edge', status: 'Closed', img: '' },
      ],
      segregation: [
        { date: fmtDate(days[9], 'dd-mon-yy'), shift: 'Shift A', supplier: 'SAR BAWAL', part: 'Upper Rail Inspection', seg: 5040, ng: 1, img: '' },
        { date: fmtDate(days[11], 'dd-mon-yy'), shift: 'Shift B', supplier: 'AMS', part: r.pick(PARTS), seg: r.int(500, 3000), ng: r.int(0, 4), img: '' },
      ],
      effTrend: workDays(26).map((d) => ({ date: fmtDate(d, 'dd-mon-yy'), eff: 100 })),
      remarks: shiftsRows.map((x) => ({ ...x, remark: r.chance(0.15) ? `1) ${r.pick(PARTS)}` : '1) N/A' })),
      daily: [...days].reverse().map((d) => ({ date: fmtDate(d, 'long'), line: r.chance(0.2) ? 1 : '', hold: r.chance(0.3) ? r.int(1, 3) : '', seg: r.chance(0.15) ? 1 : '' })),
    };
  },
};
