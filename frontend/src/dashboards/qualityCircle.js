import { C } from '../theme.js';
import { MONTHS } from './_gen.js';
import { S } from './_slicers.js';

const TEAMS = [
  ['Arjun', 'Mr. Ravinder', 'Mr. Shimbhu'], ['Arjun 2', 'Mr. Chandan', 'Mr. Rajender'], ['Bajrang', 'Mr. Satish Yadav', 'Mr. Punit Yadav'],
  ['Benchmark Builder', 'Mr. Manoj', 'Mr. Pradeep Chaudhary'], ['Champion', 'Mr. Ankit', 'Mr. Rinku'], ['Chanderyaan', 'Mr. Chanderma', 'Mr. Naveen'],
  ['Dabang - 1', 'Mr. Akash', 'Mr. Sujeet'], ['Dabang - 2', 'Mr. Manoj', 'Mr. Lalit'], ['Diamond', 'Mr. Vijay Kumar', 'Mr. Shrilal'],
  ['Eagle 2.0', 'Mr. Digvijay', 'Mr. Krishan'], ['Eliminator', 'Mr. Kshitij', 'Mr. Tejpal'], ['Gold Star', 'Mr. Subham', 'Mr. Sandeep'],
  ['I-Conic', 'Mr. Akash', 'Mr. Aman Singh'], ['Loop Fighter', 'Mr. Rohit', 'Mr. Sunil'], ['Maru A', 'Mr. Deepak', 'Mr. Ravi'],
  ['Press Champion', 'Mr. Anwar', 'Mr. Ramesh'], ['Press Diamond', 'Mr. Sachin', 'Mr. Mohit'], ['Press Fighter', 'Mr. Amit', 'Mr. Vikas'],
  ['Press ke Tiger', 'Mr. Sonu', 'Mr. Pankaj'], ['RQC Rider', 'Mr. Rakesh', 'Mr. Yogesh'], ['Rising Star', 'Mr. Vinod', 'Mr. Ajay'],
  ['SQA Fighter', 'Mr. Surya', 'Mr. Neeraj'], ['Sunrise', 'Mr. Gaurav', 'Mr. Hemant'], ['TBDI Paltan', 'Mr. Kapil', 'Mr. Arun'],
  ['Tool Master', 'Mr. Jitender', 'Mr. Manish'], ['Tool Rocket', 'Mr. Pawan', 'Mr. Rajesh'], ['Udaan', 'Mr. Satyam', 'Mr. Dinesh'],
  ['YFG Vikrant', 'Mr. Himanshu', 'Mr. Naresh'], ['YNC Fighter', 'Mr. Lokesh', 'Mr. Vipin'], ['YRA Agni', 'Mr. Sumit', 'Mr. Kuldeep'],
];
const DEPTS = ['Dispatch', 'Dojo', 'E & D', 'HR', 'Loop Pipe', 'Maintenance', 'Press Shop', 'Production', 'Quality'];

export default {
  key: 'quality-circle',
  title: 'Quality Circle Dashboard',
  back: '/portal',
  next: { key: 'thank-you', label: 'Next Page', route: '/thank-you' },
  slicers: [S.select('dept', 'Department', DEPTS), S.select('level', 'Level', ['Associate', 'Staff']), S.select('team', 'TeamName', TEAMS.map((t) => t[0]), { wide: true })],
  tabs: [{
    name: 'Overview',
    widgets: [
      { type: 'bar', title: 'Month wise Meeting Status', d: 'meetings', span: 12, h: 260, x: 'team', minBarWidth: 34, tickAngle: -40, labels: false, xLabel: 'TeamName' },
      { type: 'table', title: 'Teams', d: 'teams', span: 6, maxH: 300, columns: [
        { key: 'team', label: 'TeamName' }, { key: 'leader', label: 'TeamLeader' }, { key: 'facilitator', label: 'TeamFacilitator' }, { key: 'step', label: 'Current Step Status', align: 'right', fmt: 'dec2' },
      ] },
      { type: 'kpi', label: 'Total QC Teams', d: 'count', span: 2 },
      { type: 'donut', title: 'Teams by Step Status', d: 'steps', span: 4, h: 260 },
    ],
  }],
  demo(f, r) {
    const m = new Date().getMonth();
    const months = [0, 1, 2].map((i) => MONTHS[(m - 2 + i + 12) % 12].slice(0, 3));
    const meetings = TEAMS.map(([team]) => {
      const row = { team };
      months.forEach((mn) => { row[mn] = r.int(1, 4); });
      row.step = r.int(1, 6);
      return row;
    });
    const teams = TEAMS.map(([team, leader, facilitator]) => ({ team, leader, facilitator, step: r.int(1, 7) }));
    const steps = {};
    teams.forEach((t) => { steps[t.step] = (steps[t.step] || 0) + 1; });
    const pal = [C.blue, C.navy, C.orange, C.purple, C.pink, C.violet, C.yellow];
    return {
      meetings: { rows: meetings, series: [
        ...months.map((mn, i) => ({ key: mn, name: `${mn} Meetings Done`, color: [C.blue, C.navy, C.orange][i], stack: 'm' })),
        { key: 'step', name: `${months[2]} Step Status`, color: C.purple, type: 'line' },
      ] },
      teams,
      count: TEAMS.length,
      steps: Object.entries(steps).map(([k, v], i) => ({ name: `Step ${k}`, value: v, color: pal[i % pal.length] })),
    };
  },
};
