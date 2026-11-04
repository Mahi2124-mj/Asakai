import { useMemo, useState } from 'react';
import { fmt } from '../lib/format.js';

function Thumb({ src }) {
  if (src) return <img className="thumb" src={src} alt="" loading="lazy" />;
  return (
    <div className="thumb thumb-ph" title="Image will load from server">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="6" width="18" height="14" rx="2" /><circle cx="12" cy="13" r="3.5" /><path d="M8 6l1.5-2h5L16 6" /></svg>
    </div>
  );
}

export function DataTable({ w, rows }) {
  const [sort, setSort] = useState(null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const { key, dir } = sort;
    return [...rows].sort((a, b) => {
      const x = a[key], y = b[key];
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
      return String(x ?? '').localeCompare(String(y ?? '')) * dir;
    });
  }, [rows, sort]);

  const totals = w.total
    ? Object.fromEntries(w.total.keys.map((k) => [k, rows.reduce((s, r) => s + (Number(r[k]) || 0), 0)]))
    : null;

  const clickSort = (key) => setSort((s) => (s?.key === key ? (s.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 }));

  return (
    <div className="tbl-wrap" style={{ maxHeight: w.maxH || 320 }} tabIndex={0} aria-label={w.title}>
      <table className="tbl">
        <thead>
          <tr>
            {w.columns.map((c) => (
              <th key={c.key} style={{ minWidth: c.w, textAlign: c.align || 'left' }} onClick={() => clickSort(c.key)}>
                {c.label}{sort?.key === c.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr><td colSpan={w.columns.length} className="empty-row">No records</td></tr>
          )}
          {sorted.map((r, i) => (
            <tr key={i}>
              {w.columns.map((c) => {
                const v = r[c.key];
                let cell;
                if (c.type === 'img') cell = <Thumb src={v} />;
                else if (c.type === 'status') cell = <span className={`pill ${String(v).toLowerCase()}`}>{v}</span>;
                else cell = fmt(v, c.fmt);
                return <td key={c.key} style={{ textAlign: c.align || 'left' }}>{cell}</td>;
              })}
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot>
            <tr>
              {w.columns.map((c, i) => (
                <td key={c.key} style={{ textAlign: c.align || 'left' }}>
                  {i === 0 ? w.total.label : totals[c.key] !== undefined ? fmt(totals[c.key], c.fmt || 'num') : ''}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
