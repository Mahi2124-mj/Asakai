import { useMemo } from 'react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LabelList, Cell, ReferenceLine, PieChart, Pie,
} from 'recharts';
import { C, INK, TARGET, TRACK, onColor } from '../theme.js';
import { fmt, axisFmt } from '../lib/format.js';
import { useNarrow } from '../lib/useNarrow.js';
import { useFit } from '../lib/fit.jsx';

const AX = { fontSize: 11, fill: INK.secondary };
const GRID = <CartesianGrid vertical={false} stroke={INK.grid} />;
const trunc = (s, n = 14) => (s && String(s).length > n ? `${String(s).slice(0, n - 1)}…` : s);

/* ---------- shared bits ---------- */

function TipBox({ active, payload, label, labelFmt, extra, x2 }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="tip">
      <div className="tip-h">{[label ?? row.name, x2 ? row[x2] : null].filter((v) => v !== undefined && v !== null && v !== '').join(' · ')}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="tip-r">
          <i style={{ background: p.payload?.fill || p.color || p.fill }} />
          <span>{p.name}</span>
          <b>{fmt(p.value, labelFmt)}</b>
        </div>
      ))}
      {extra && row[extra.key] !== undefined && (
        <div className="tip-r"><i style={{ background: 'transparent' }} /><span>{extra.name}</span><b>{fmt(row[extra.key], extra.fmt)}</b></div>
      )}
    </div>
  );
}

/** Two-level category tick (e.g. shift on line 1, date on line 2), like Power BI hierarchies. */
function makeTick(rows, x2, angle, maxChars) {
  const mids = new Set();
  if (x2) {
    let start = 0;
    for (let i = 1; i <= rows.length; i++) {
      if (i === rows.length || rows[i][x2] !== rows[start][x2]) {
        mids.add(start + Math.floor((i - 1 - start) / 2));
        start = i;
      }
    }
  }
  return function Tick({ x, y, payload }) {
    const i = payload.index;
    if (angle) {
      return (
        <g transform={`translate(${x},${y})`}>
          <text transform={`rotate(${angle})`} textAnchor="end" dy={8} dx={-2} fontSize={10} fill={INK.secondary}>{trunc(payload.value, maxChars || 16)}</text>
        </g>
      );
    }
    const g = x2 ? rows[i]?.[x2] : null;
    return (
      <g transform={`translate(${x},${y})`}>
        <text dy={12} textAnchor="middle" fontSize={11} fill={INK.secondary}>{trunc(payload.value, maxChars || 12)}</text>
        {mids.has(i) && g != null && <text dy={27} textAnchor="middle" fontSize={10} fill={INK.muted}>{trunc(g, 14)}</text>}
      </g>
    );
  };
}

function PillLabel({ x, y, width, value, f }) {
  if (value === undefined || value === null) return null;
  const t = fmt(value, f);
  const w = Math.max(18, t.length * 7 + 8);
  const cx = x + width / 2;
  return (
    <g>
      <rect x={cx - w / 2} y={y - 22} width={w} height={17} rx={4} fill={TRACK} />
      <text x={cx} y={y - 10} textAnchor="middle" fontSize={11} fontWeight={600} fill={INK.primary}>{t}</text>
    </g>
  );
}

function Scroller({ n, minBarWidth, children }) {
  const minW = minBarWidth ? n * minBarWidth : 0;
  return (
    <div className="chart-scroll">
      <div style={{ minWidth: minW || undefined, height: '100%' }}>{children}</div>
    </div>
  );
}

const legendText = (v) => <span style={{ color: INK.secondary }}>{v}</span>;
const legendProps = { formatter: legendText, verticalAlign: 'top', align: 'left', iconType: 'circle', iconSize: 8, wrapperStyle: { fontSize: 10.5, paddingBottom: 12, lineHeight: '14px' } };

/* ---------- bar / line combo ---------- */

export function BarsChart({ w, data }) {
  let rows = data;
  let series = w.series || [];
  if (data && !Array.isArray(data) && Array.isArray(data.rows)) {
    rows = data.rows;
    series = data.series || series;
  }
  rows = rows || [];
  const Tick = useMemo(() => makeTick(rows, w.x2, w.tickAngle), [rows, w.x2, w.tickAngle]);
  if (!rows.length) return <div className="empty">No data</div>;

  const horizontal = !!w.horizontal;
  const showLabels = w.labels !== false;
  const lf = w.labelFmt;
  const stackedKeys = series.filter((s) => s.stack && s.type !== 'line');
  const lastStack = stackedKeys[stackedKeys.length - 1]?.key;
  const xH = w.tickAngle ? 70 : w.x2 ? 34 : 22;

  const totalLabel = (props) => {
    const { x, y, width, index } = props;
    const r = rows[index];
    const tot = stackedKeys.reduce((s, k) => s + (Number(r?.[k.key]) || 0), 0);
    if (!tot) return null;
    return <text x={x + width / 2} y={y - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill={INK.primary}>{fmt(tot, lf)}</text>;
  };

  const chart = (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: series.length > 1 ? 26 : 20, right: 12, left: 0, bottom: w.xLabel ? 14 : 2 }} barGap={2} barCategoryGap="22%">
        {horizontal ? <CartesianGrid horizontal={false} stroke={INK.grid} /> : GRID}
        {horizontal ? (
          <>
            <XAxis type="number" tick={AX} tickFormatter={axisFmt(w.yFmt)} axisLine={false} tickLine={false} label={w.xLabel ? { value: w.xLabel, position: 'insideBottom', offset: -8, fontSize: 11, fontWeight: 600 } : undefined} />
            <YAxis type="category" dataKey={w.x} tick={AX} width={w.yWidth || 86} interval={0} axisLine={false} tickLine={false} />
          </>
        ) : (
          <>
            <XAxis dataKey={w.x} tick={<Tick />} interval={0} height={xH} axisLine={{ stroke: INK.grid }} tickLine={false}
              label={w.xLabel ? { value: w.xLabel, position: 'insideBottom', offset: -10, fontSize: 11, fontWeight: 600, fill: INK.secondary } : undefined} />
            <YAxis tick={AX} tickFormatter={axisFmt(w.yFmt)} width={46} axisLine={false} tickLine={false} domain={w.yDomain}
              label={w.yLabel ? { value: w.yLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: INK.secondary, style: { textAnchor: 'middle' } } : undefined} />
          </>
        )}
        <Tooltip content={<TipBox labelFmt={lf} extra={w.tooltipExtra} x2={w.x2} />} cursor={{ fill: 'rgba(18,35,158,0.06)' }} />
        {series.length > 1 && <Legend {...legendProps} itemSorter={(it) => series.findIndex((s) => s.key === it.dataKey)} />}
        {w.ref && (horizontal
          ? <ReferenceLine x={w.ref.y} stroke={w.ref.color || INK.muted} strokeDasharray="5 4" strokeWidth={1.5} />
          : <ReferenceLine y={w.ref.y} stroke={w.ref.color || INK.muted} strokeDasharray="5 4" strokeWidth={1.5}
              label={w.ref.label ? { value: w.ref.label, position: 'insideTopLeft', fontSize: 11, fill: w.ref.color } : undefined} />)}
        {series.map((s) => {
          const lab = showLabels && s.label !== false;
          if (s.type === 'line') {
            return (
              <Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? '4 3' : undefined}
                dot={{ r: 4, fill: s.color, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5.5, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false}>
                {lab && (w.labelStyle === 'pill'
                  ? <LabelList dataKey={s.key} content={(p) => <PillLabel {...p} width={0} f={lf} />} />
                  : <LabelList dataKey={s.key} position="top" fontSize={11} fill={INK.secondary} formatter={(v) => fmt(v, lf)} />)}
              </Line>
            );
          }
          const stacked = !!s.stack;
          return (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} stackId={s.stack} maxBarSize={horizontal ? 22 : 56}
              radius={stacked ? 0 : horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]} stroke={stacked ? '#fff' : undefined} strokeWidth={stacked ? 2 : 0} isAnimationActive={false}>
              {w.colorKey && rows.map((r, i) => <Cell key={i} fill={r[w.colorKey] || s.color} />)}
              {lab && w.labelStyle === 'pill' && <LabelList dataKey={s.key} content={(p) => <PillLabel {...p} f={lf} />} />}
              {lab && w.labelStyle !== 'pill' && (
                <LabelList dataKey={s.key}
                  position={stacked ? 'center' : w.labelPos === 'inside' ? 'center' : horizontal ? 'right' : w.labelAngle ? 'insideBottom' : 'top'}
                  angle={horizontal ? 0 : w.labelAngle || 0}
                  offset={w.labelAngle && !stacked ? 10 : 4}
                  fontSize={w.labelAngle ? 10 : 11} fontWeight={600}
                  fill={stacked || w.labelPos === 'inside' ? onColor(s.color) : INK.primary}
                  formatter={(v) => (stacked && !v ? '' : fmt(v, lf))}
                  style={w.labelAngle && !stacked && w.labelPos !== 'inside' ? { textAnchor: 'start' } : undefined} />
              )}
              {w.totalLabels && s.key === lastStack && <LabelList content={totalLabel} />}
            </Bar>
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
  return <Scroller n={rows.length} minBarWidth={w.minBarWidth}>{chart}</Scroller>;
}

/* ---------- threshold-colored achievement bars ---------- */

const bandColor = (v, bands) => (bands.find((b) => v >= b.min) || bands[bands.length - 1]).color;

export function ThresholdChart({ w, data }) {
  const rows0 = data || [];
  const rows = w.sort ? [...rows0].sort((a, b) => a[w.key] - b[w.key]) : rows0;
  const Tick = useMemo(() => makeTick(rows, w.x2, w.tickAngle ?? (rows.length > 10 && !w.x2 && String(rows[0]?.[w.x] || '').length > 4 ? -35 : 0)), [rows, w.x2, w.tickAngle, w.x]);
  if (!rows.length) return <div className="empty">No data</div>;
  const f = w.fmt || 'pct2';
  const isPct = f.startsWith('pct');
  const max = Math.max(w.target * 1.08, ...rows.map((r) => r[w.key]));
  const hz = !!w.horizontal;
  const angled = w.tickAngle ?? (rows.length > 10 && !w.x2 && String(rows[0]?.[w.x] || '').length > 4 ? -35 : 0);

  return (
    <div className="th-wrap">
      <Scroller n={hz ? 0 : rows.length} minBarWidth={w.minBarWidth}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} layout={hz ? 'vertical' : 'horizontal'} margin={{ top: 18, right: hz ? 40 : 14, left: 0, bottom: 2 }} barCategoryGap="16%">
            {hz ? <CartesianGrid horizontal={false} stroke={INK.grid} /> : GRID}
            {hz ? (
              <>
                <XAxis type="number" domain={[0, Math.ceil(max / 10) * 10]} tick={AX} tickFormatter={(v) => (isPct ? `${v}%` : v)} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey={w.x} tick={AX} width={52} interval={0} axisLine={false} tickLine={false} />
                <ReferenceLine x={w.target} stroke={TARGET} strokeDasharray="5 4" strokeWidth={1.5} label={{ value: isPct ? `${w.target}%` : w.target, position: 'top', fontSize: 10 }} />
              </>
            ) : (
              <>
                <XAxis dataKey={w.x} tick={<Tick />} interval={0} height={angled ? 70 : w.x2 ? 34 : 22} axisLine={{ stroke: INK.grid }} tickLine={false} />
                <YAxis domain={[0, Math.ceil(max / 10) * 10]} tick={AX} tickFormatter={(v) => (isPct ? `${v}%` : v)} width={44} axisLine={false} tickLine={false}
                  label={w.yLabel ? { value: w.yLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: INK.secondary, style: { textAnchor: 'middle' } } : undefined} />
                <ReferenceLine y={w.target} stroke={TARGET} strokeDasharray="5 4" strokeWidth={1.5}
                  label={{ value: isPct ? `${w.target.toFixed(2)}%` : w.target.toFixed(2), position: 'insideTopRight', fontSize: 10, fill: INK.primary, dy: -14 }} />
              </>
            )}
            <Tooltip content={<TipBox labelFmt={f} x2={w.x2} />} cursor={{ fill: 'rgba(18,35,158,0.06)' }} />
            <Bar dataKey={w.key} name={w.title} radius={hz ? [0, 3, 3, 0] : [3, 3, 0, 0]} maxBarSize={hz ? 26 : 50} isAnimationActive={false}>
              {rows.map((r, i) => <Cell key={i} fill={bandColor(r[w.key], w.bands)} />)}
              <LabelList dataKey={w.key} position={hz ? 'right' : rows.length > 6 ? 'center' : 'insideTop'} angle={hz || rows.length <= 6 ? 0 : -90}
                fontSize={10} fontWeight={700} fill={INK.primary} formatter={(v) => fmt(v, f)} offset={hz ? 4 : 8} />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </Scroller>
      <div className="bands">
        {w.bands.map((b) => <span key={b.label}><i style={{ background: b.color }} />{b.label}</span>)}
        {w.footnote && <span className="foot">{w.footnote}</span>}
      </div>
    </div>
  );
}

/* ---------- pareto ---------- */

function WrapTick({ x, y, payload }) {
  const words = String(payload.value).split(/\s+/);
  const lines = [];
  words.forEach((wd) => {
    const last = lines[lines.length - 1];
    if (last && (last + ' ' + wd).length <= 9) lines[lines.length - 1] = `${last} ${wd}`;
    else lines.push(wd);
  });
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.slice(0, 5).map((l, i) => <text key={i} dy={12 + i * 11} textAnchor="middle" fontSize={9.5} fill={INK.secondary}>{l}</text>)}
    </g>
  );
}

export function ParetoChart({ w, data }) {
  const rows = data || [];
  if (!rows.length) return <div className="empty">No data</div>;
  return (
    <Scroller n={rows.length} minBarWidth={58}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 22, right: 8, left: 0, bottom: 4 }} barCategoryGap="6%">
          {GRID}
          <XAxis dataKey="name" tick={<WrapTick />} interval={0} height={64} axisLine={{ stroke: INK.grid }} tickLine={false} />
          <YAxis yAxisId="l" tick={AX} width={34} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={AX} tickFormatter={(v) => `${v}%`} width={42} axisLine={false} tickLine={false} />
          <Tooltip content={<TipBox />} cursor={{ fill: 'rgba(18,35,158,0.06)' }} />
          <Bar yAxisId="l" dataKey="value" name="Count" fill={w.color || C.navy} radius={[3, 3, 0, 0]} isAnimationActive={false}>
            <LabelList dataKey="value" position="top" fontSize={11} fontWeight={600} fill={INK.primary} />
          </Bar>
          <Line yAxisId="r" dataKey="cum" name="Cumulative %" stroke={INK.primary} strokeWidth={1.6} dot={false} isAnimationActive={false}>
            <LabelList dataKey="cum" position="top" fontSize={10} fill={INK.primary} formatter={(v) => `${Math.round(v)}%`} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </Scroller>
  );
}

/* ---------- donut / pie ---------- */

export function DonutChart({ w, data }) {
  const { fit } = useFit();
  const narrow = useNarrow() && !fit;
  const rows = (data || []).filter((d) => d.value > 0);
  if (!rows.length) return <div className="empty">No data</div>;
  const total = rows.reduce((s, r) => s + r.value, 0);
  const pie = w.inner === 0;
  const legendRight = !narrow && w.legend !== 'bottom' && (w.span || 12) > 2;
  const cx = legendRight ? '42%' : '50%';
  const label = ({ value, percent, name }) => {
    if (w.fmt === 'pct1') return `${name} ${value}%`;
    if (w.fmt === 'kpct') return `${fmt(value, value >= 1000 ? 'k2' : 'num')} (${(percent * 100).toFixed(1)}%)`;
    return `${value} (${Math.round(percent * 100)}%)`;
  };
  return (
    <div className="donut">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Pie data={rows} dataKey="value" nameKey="name" cx={cx} cy="50%" innerRadius={pie ? 0 : '52%'} outerRadius="72%"
            paddingAngle={rows.length > 1 && !pie ? 1.5 : 0} label={label} labelLine={{ stroke: INK.muted }} fontSize={11} isAnimationActive={false}
            startAngle={90} endAngle={-270}>
            {rows.map((r) => <Cell key={r.name} fill={r.color} stroke="#fff" strokeWidth={2} />)}
          </Pie>
          <Tooltip content={<TipBox />} />
          <Legend formatter={legendText} itemSorter={(it) => rows.findIndex((r) => r.name === it.value)} layout={legendRight ? 'vertical' : 'horizontal'} align={legendRight ? 'right' : 'center'} verticalAlign={legendRight ? 'middle' : 'bottom'} iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      {w.centerTotal && !pie && <div className="donut-center" style={{ left: cx }}>{fmt(total)}</div>}
    </div>
  );
}

/* ---------- semicircle gauge ---------- */

export function GaugeChart({ w, data }) {
  const { value = 0, max = 100, min = 0 } = data || {};
  const v = Math.max(min, Math.min(value, max));
  const rows = [{ name: 'Value', value: v - min }, { name: 'Remaining', value: Math.max(0, max - v) }];
  return (
    <div className="gauge">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
          <Pie data={rows} dataKey="value" cx="50%" cy="78%" startAngle={180} endAngle={0} innerRadius="95%" outerRadius="150%" stroke="none" isAnimationActive={false}>
            <Cell fill={w.color || C.navy} />
            <Cell fill={TRACK} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="gauge-v">{fmt(value, 'k')}</div>
      <div className="gauge-min">{fmt(min, 'k')}</div>
      <div className="gauge-max">{fmt(max, 'k')}</div>
    </div>
  );
}
