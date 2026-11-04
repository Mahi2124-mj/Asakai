import { createContext, useContext } from 'react';
import { BarsChart, ThresholdChart, ParetoChart, DonutChart, GaugeChart } from './charts.jsx';
import { DataTable } from './DataTable.jsx';
import { fmt } from '../lib/format.js';
import { MONTHS } from '../dashboards/_gen.js';

export const DashCtx = createContext({ setTab: () => {} });

const PosCtx = createContext(null);

const spanVars = (span = 12, rows = 1, pos) => (pos
  ? { gridColumn: `${pos.col + 1} / span ${pos.span}`, gridRow: `${pos.row + 1} / span ${pos.rows}` }
  : {
    '--s-lg': span,
    '--s-md': span <= 2 ? 4 : span <= 4 ? 6 : 12,
    '--s-sm': span <= 2 ? 6 : 12,
    '--r-lg': rows,
  });

function Panel({ w, children, className = '', bare }) {
  const pos = useContext(PosCtx);
  const title = w.title && (
    <div className={`ptitle ${w.titleStyle === 'big' ? 'ptitle-big' : ''} ${w.titleStyle === 'banner' ? 'ptitle-banner' : ''}`}>{w.title}</div>
  );
  return (
    <section className={`panel ${bare ? 'panel-bare' : ''} ${className}`} style={spanVars(w.span, w.rows, pos)}>
      {title}
      {w.subtitle && <div className="psub">{w.subtitle}</div>}
      {children}
    </section>
  );
}

function Kpi({ label, value, f, small, link }) {
  const { setTab } = useContext(DashCtx);
  const v = value === undefined || value === null ? '--' : fmt(value, f);
  return (
    <div className={`kpi ${small ? 'kpi-sm' : ''} ${link ? 'kpi-link' : ''}`} onClick={link ? () => setTab(link) : undefined} role={link ? 'button' : undefined}>
      <div className="kpi-v">{v}</div>
      <div className="kpi-l">{label}{link ? ' ›' : ''}</div>
    </div>
  );
}

function Calendar({ data, compact }) {
  if (!data) return <div className="empty">No data</div>;
  const { year, month, days } = data;
  const first = new Date(year, month, 1).getDay();
  const n = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)];
  return (
    <div className={`cal ${compact ? 'cal-compact' : ''}`}>
      <div className="cal-m">{MONTHS[month]}</div>
      <div className="cal-g">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="cal-h">{d}</div>)}
        {cells.map((d, i) => (d ? <div key={i} className={`cal-d s-${days[d] || 'none'}`} title={days[d] === 'ng' ? 'Complaint' : undefined}>{d}</div> : <div key={i} />))}
      </div>
    </div>
  );
}

export default function Widget({ w, data, pos }) {
  return <PosCtx.Provider value={pos || null}><WidgetBody w={w} data={data} fit={!!pos} /></PosCtx.Provider>;
}

function WidgetBody({ w, data, fit }) {
  const d = w.d ? data?.[w.d] : undefined;
  const chartBox = (child) => <div className="chart" style={fit ? undefined : { height: w.h || 240 }}>{child}</div>;

  switch (w.type) {
    case 'bar':
      return <Panel w={w}>{chartBox(<BarsChart w={w} data={d} />)}</Panel>;
    case 'threshold':
      return <Panel w={w}>{chartBox(<ThresholdChart w={w} data={d} />)}</Panel>;
    case 'pareto':
      return <Panel w={w}>{chartBox(<ParetoChart w={w} data={d} />)}</Panel>;
    case 'donut':
      return <Panel w={w}>{chartBox(<DonutChart w={w} data={d} />)}</Panel>;
    case 'gauge':
      return <Panel w={w}>{chartBox(<GaugeChart w={w} data={d} />)}</Panel>;
    case 'table':
      return <Panel w={w}><DataTable w={w} rows={d || []} /></Panel>;
    case 'calendar':
      return <Panel w={w} className="panel-cal"><Calendar data={d} compact={w.compact} /></Panel>;
    case 'kpi':
      return <Panel w={{ ...w, title: undefined }} className="panel-kpi"><Kpi label={w.label} value={w.value ?? d} f={w.fmt} small={w.small} link={w.link} /></Panel>;
    case 'kpiStack':
      return (
        <Panel w={w} bare className="kpi-stack">
          {w.items.map((it) => <div key={it.label} className="panel panel-kpi"><Kpi label={it.label} value={it.value ?? data?.[it.d]} f={it.fmt} /></div>)}
        </Panel>
      );
    case 'kpiRow':
      return (
        <Panel w={w} className="kpi-row">
          {w.lead && <div className="kpi-lead">{w.lead}</div>}
          {w.items.map((it) => (
            <div key={it.label} className="kpi-cell">
              <div className="kpi-cell-l">{it.label}</div>
              <div className={`kpi-cell-v ${w.small ? 'sm' : ''}`}>{fmt(it.value ?? data?.[it.d], it.fmt)}</div>
            </div>
          ))}
        </Panel>
      );
    case 'kpiGoal': {
      const v = d || {};
      const good = v.value >= v.goal;
      const pct = v.goal ? (((v.value - v.goal) / v.goal) * 100).toFixed(2) : 0;
      return (
        <Panel w={{ ...w, title: undefined }} className={`kpi-goal ${good ? 'good' : 'bad'}`}>
          <div className="kg-t">{w.title}</div>
          <div className="kg-v">{fmt(v.value)}<span>{good ? '✓' : '!'}</span></div>
          <div className="kg-g">Goal: {v.goal} ({pct > 0 ? '+' : ''}{pct}%)</div>
        </Panel>
      );
    }
    case 'tiles':
      return (
        <Panel w={w}>
          <div className="tiles">
            {(d || []).map((t) => (
              <div key={t.label} className="tile">
                <div className="tile-l">{t.label}</div>
                <div className="tile-v" style={{ background: t.color }}>{t.value}</div>
              </div>
            ))}
          </div>
        </Panel>
      );
    case 'text':
      return <Panel w={w}><div className="bigtext" style={fit ? undefined : { height: (w.h || 200) - 30 }}>{d?.text ?? w.text}</div></Panel>;
    case 'badge':
      return (
        <Panel w={w}>
          <div className="badge-wrap" style={fit ? undefined : { height: (w.h || 170) - 26 }}>
            {d?.ok !== false ? (
              <>
                <div className="nobadge"><span>C</span></div>
                <div className="badge-t">{d?.text || 'NO COMPLAINT'}</div>
              </>
            ) : <div className="badge-t bad">{d.text}</div>}
          </div>
        </Panel>
      );
    default:
      return <Panel w={w}><div className="empty">Unknown widget: {w.type}</div></Panel>;
  }
}
