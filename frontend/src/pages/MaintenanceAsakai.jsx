/* MaintenanceAsakai.jsx -- the MES Asakai page (Maintenance_DX/mes-frontend/src/pages/Asakai.jsx,
 * served on port 9965), carried over as-is: same layout, colours, sizes and behaviour.
 *
 * Naksha: upar header (date ‹ › + totals) -> beech 3 chart barabar -> neeche table (bachi poori
 * jagah, scroll SIRF table ke andar -- page kabhi scroll nahi hota, TV par ek screen me sab).
 * Sab naap `em` me aur root ka font-size screen ki chaudai se (clamp), isliye laptop se 85" TV tak
 * wahi naksha bas bada hota hai. Chart (recharts) ko px chahiye, isliye uska font root ke naap se.
 *
 * What differs from MES, on purpose:
 *  - data: GET /api/dashboards/maintenance?date= on the asakai server (providers.py runs the MES
 *    SQL, same response), with the app's cache / ETag / demo fallback
 *  - "← Back" goes to the portal, and a Next button continues the meeting flow
 *  - no admin "Customize" panel (its settings live on the MES server); charts use its defaults
 *  - sizes follow the board's 1366 px canvas on TVs (var(--vw), var(--app-h)) instead of vw / vh
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';
import { getDashboard } from '../lib/api.js';
import { lastDay } from '../dashboards/_gen.js';

const C = {
  ink: '#0b0b0b', ink2: '#52514e', muted: '#898781', grid: '#e1e0d9', axis: '#c3c2b7',
  page: '#f3f5f8', card: '#ffffff', line: 'rgba(11,11,11,0.10)', navy: '#0f2744',
  s1: '#2a78d6', s2: '#eb6834', s3: '#1baf7a',
};
const p2 = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
// Default day = the board's "yesterday": last working day (on Monday, Saturday).
const kal = () => isoOf(lastDay());
const shiftDay = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return isoOf(new Date(y, m - 1, d + n)); };
const dmy = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || '')); return m ? `${m[3]}/${m[2]}/${m[1]}` : (v || ''); };
const n0 = (v) => (v == null ? '—' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 }));
const n1 = (v) => (v == null ? '—' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: 1 }));
const hm = (mins) => { if (mins == null) return '—'; const m = Math.round(Number(mins));
  return m >= 60 ? `${Math.floor(m / 60)}h ${p2(m % 60)}m` : `${m}m`; };
// Din-wise yaad: page KHOLTE hi us din ki EK call (latest data), jawab aane tak yaad wala data turant
// dikhe. Page khula rahe to apne aap koi call nahi; date aage-peechhe karke wapas aaye din par bhi call
// nahi. Taaza sirf ↻ Refresh se.
const MEMO = new Map();

// MES chart defaults (its admin "Customize" overrides are not carried over).
const UI_D = {
  andon: { bar: C.s1, labelColor: C.ink, labelScale: 1, barScale: 1, yMax: null, labels: true, grid: true, axisNames: true },
  freq: { bar: C.s2, labelColor: C.ink, labelScale: 1, barScale: 1, yMax: null, labels: true, grid: true, axisNames: true },
  hours: { bar: C.s3, labelColor: C.ink, labelScale: 1, barScale: 1, yMax: null, labels: true, grid: true, axisNames: true },
};
const guna = (v, d = 1) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };

/* ek chart -- line neeche, value upar likhi */
function LineChartCard({ title, sub, rows, valueKey, fmt, unit, fs, empty, yName, area, cfg = UI_D.andon }) {
  const color = cfg.bar;
  const ls = guna(cfg.labelScale), bs = guna(cfg.barScale);
  const data = rows.map((r) => ({ name: r.line, v: r[valueKey], zone: r.zone }));
  const total = rows.reduce((a, r) => a + (Number(r[valueKey]) || 0), 0);
  // 5 se zyada line ho to naam tircche -- warna aapas me chadh jaate hain
  const many = data.length > 5;
  return (
    <section className={`asa-card asa-chart${area ? ` asa-ch-${area}` : ''}`}>
      <div className="asa-ch-head">
        <div>
          <h2>{title}</h2>
          {sub && <div className="asa-sub">{sub}</div>}
        </div>
        <div className="asa-ch-total" style={{ color }}>{fmt(total)}{unit ? <small>{unit}</small> : null}</div>
      </div>
      <div className="asa-ch-body">
        {!data.length ? <div className="asa-empty">{empty}</div> : (
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: fs * 1.6, right: fs * 0.5, left: 0, bottom: 0 }}>
              {cfg.grid !== false && <CartesianGrid vertical={false} stroke={C.grid} />}
              <XAxis dataKey="name" interval={0} angle={many ? -35 : 0} textAnchor={many ? 'end' : 'middle'}
                     height={many ? fs * 6.4 : fs * 3.4}
                     tick={{ fontSize: fs * 0.82, fill: C.ink2, fontWeight: 700 }} axisLine={{ stroke: C.axis }} tickLine={false}
                     label={cfg.axisNames === false ? undefined : { value: 'Line', position: 'insideBottom', offset: 0,
                              style: { fontSize: fs * 0.85, fontWeight: 800, fill: C.ink } }} />
              <YAxis width={fs * 4.2} tick={{ fontSize: fs * 0.85, fill: C.ink, fontWeight: 800 }} axisLine={false} tickLine={false}
                     label={cfg.axisNames === false ? undefined : { value: yName, angle: -90, position: 'insideLeft', offset: fs * 0.3,
                              style: { fontSize: fs * 0.85, fontWeight: 800, fill: C.ink, textAnchor: 'middle' } }}
                     domain={cfg.yMax != null && Number(cfg.yMax) > 0 ? [0, Number(cfg.yMax)] : [0, 'auto']}
                     allowDataOverflow={cfg.yMax != null && Number(cfg.yMax) > 0}
                     allowDecimals={valueKey === 'hours'} />
              <Tooltip formatter={(v) => [fmt(v) + (unit || ''), title]}
                       labelFormatter={(l, p) => `${l}${p?.[0]?.payload?.zone ? ` · ${p[0].payload.zone}` : ''}`}
                       contentStyle={{ fontSize: fs * 0.85, borderRadius: 8 }} />
              <Bar dataKey="v" fill={color} radius={[fs * 0.3, fs * 0.3, 0, 0]} maxBarSize={fs * 3.4 * bs} isAnimationActive={false}>
                {cfg.labels !== false && (
                  <LabelList dataKey="v" position="top" formatter={fmt}
                             style={{ fontSize: fs * 0.9 * ls, fontWeight: 800, fill: cfg.labelColor || C.ink }} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

export default function MaintenanceAsakai({ cfg }) {
  const nav = useNavigate();
  const [day, setDay] = useState(kal);
  const [d, setD] = useState(() => MEMO.get(kal()) || null);
  const [loading, setLoading] = useState(() => !MEMO.has(kal()));
  const [busy, setBusy] = useState(false); // call chal rahi (data dikhte hue bhi)
  const [demo, setDemo] = useState(false);
  // Raat bhar TV par khula: din badla aur page "kal" par hi tha -> naya kal. Koi aur din chuna ho to nahi chhedte.
  const prevKal = useRef(kal());
  useEffect(() => {
    const id = setInterval(() => {
      const naya = kal(), purana = prevKal.current;
      if (naya === purana) return;
      prevKal.current = naya;
      setDay((d0) => (d0 === purana ? naya : d0));
    }, 60000);
    return () => clearInterval(id);
  }, []);
  const seenRef = useRef(new Set()); // is baar page khulne ke baad jo din server se aa chuke
  const [err, setErr] = useState('');
  const [fs, setFs] = useState(14); // chart ka font (px) -- root ke naap se
  const [full, setFull] = useState(false);
  const rootRef = useRef(null);
  const todayIso = isoOf(new Date());

  const dayRef = useRef(day);
  dayRef.current = day;
  const load = useCallback(async (fresh = false) => {
    const known = MEMO.get(day);
    if (!fresh && known && seenRef.current.has(day)) { setD(known); setLoading(false); setErr(''); return; }
    // yaad wala data turant (agar hai); na ho to khaali -- doosre din ka data galat din par na dikhe
    setD(known || null);
    setLoading(!known);
    setBusy(true);
    setErr('');
    const isDay = day;
    try {
      const r = await getDashboard(cfg.key, { date: isDay }, { force: true });
      MEMO.set(isDay, r.data);
      seenRef.current.add(isDay);
      if (dayRef.current === isDay) {
        setD(r.data); // beech me date badli ho to purana jawab mat chipkao
        setDemo(r.source === 'demo');
        if (r.error) setErr(r.error);
      }
    } catch (e) {
      if (dayRef.current === isDay) setErr(String(e?.message || e).slice(0, 300));
    } finally {
      if (dayRef.current === isDay) { setLoading(false); setBusy(false); }
    }
  }, [day, cfg.key]);

  // page khulne par + date badalne par -- apne aap baar baar NAHI
  useEffect(() => { load(); }, [load]);

  // root ka font-size (CSS clamp) padh kar chart ka font
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const naap = () => setFs(parseFloat(getComputedStyle(el).fontSize) || 14);
    naap();
    const ro = new ResizeObserver(naap);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else rootRef.current?.requestFullscreen?.().catch(() => {});
  };

  // category-wise jhund (server pehle se category ke kram me bhejta hai)
  const allGroups = useMemo(() => {
    const m = new Map();
    for (const r of d?.rows || []) {
      if (!m.has(r.category)) m.set(r.category, []);
      m.get(r.category).push(r);
    }
    return [...m.entries()].map(([cat, rows]) => ({
      cat, rows,
      n: rows.reduce((a, r) => a + (r.frequency || 1), 0),
      mins: rows.reduce((a, r) => a + (Number(r.minutes) || 0), 0),
    }));
  }, [d]);
  // Category filter -- sirf table par, chart par nahi; default All. Chuni hui us din na ho to All.
  const [cat, setCat] = useState('');
  const catOk = allGroups.some((g) => g.cat === cat) ? cat : '';
  const groups = catOk ? allGroups.filter((g) => g.cat === catOk) : allGroups;
  const catLabel = (c) => (/^[A-Z]$/.test(c) ? `${c} CATEGORY B/D` : c);

  const t = d?.totals || {};
  const isKal = day === kal();
  const nf = d?.not_filled; // null = remarks table me id ka column hi nahi
  const [nfOpen, setNfOpen] = useState(false);
  useEffect(() => {
    if (!nfOpen) return undefined;
    const esc = (e) => { if (e.key === 'Escape') setNfOpen(false); };
    const back = (e) => { e.preventDefault(); setNfOpen(false); }; // TV remote Back closes only the popup
    window.addEventListener('keydown', esc);
    window.addEventListener('asakai:back', back);
    return () => { window.removeEventListener('keydown', esc); window.removeEventListener('asakai:back', back); };
  }, [nfOpen]);

  return (
    <div className={`asa-root${full ? ' asa-full' : ''}`} ref={rootRef}>
      <style>{CSS}</style>

      {/* ── Header ── */}
      <header className="asa-head">
        <div className="asa-title">
          {!full && <button type="button" className="dash-back" onClick={() => nav(cfg.back)} title="Back to portal">← Back</button>}
          <div>
            <h1>Asakai</h1>
          </div>
          {demo && <span className="asa-demo" title="No connection to maintenance_db: sample data">DEMO DATA</span>}
        </div>

        <div className="asa-kpis">
          <div className="asa-kpi"><b style={{ color: '#8cc2ff' }}>{loading && !d ? '…' : n0(t.andon_calls)}</b><span>ANDON calls</span></div>
          {/* NOT FILLED: usi din ki band Maintenance call jinka remark nahi bhara; click = zone-wise total, neeche line-wise */}
          <button type="button" className="asa-kpi asa-kpi-btn" onClick={() => nf && setNfOpen(true)} disabled={!nf}
                  title="Maintenance ANDON calls with no entry in ANDON Remarks History — click for zone / line details">
            <b style={{ color: '#ff9db0' }}>{loading && !d ? '…' : (nf ? n0(nf.total) : '—')}</b><span>Not filled</span>
          </button>
          <div className="asa-kpi"><b style={{ color: '#ffb08a' }}>{loading && !d ? '…' : n0(t.breakdowns)}</b><span>Breakdowns</span></div>
          <div className="asa-kpi"><b style={{ color: '#7ee0b8' }}>{loading && !d ? '…' : n1((t.bd_minutes || 0) / 60)}<small> h</small></b><span>Breakdown hours</span></div>
        </div>

        <div className="asa-ctrl">
          <div className="asa-day">
            <button onClick={() => setDay(shiftDay(day, -1))} aria-label="Previous day">‹</button>
            <input type="date" value={day} max={todayIso} data-dmy={dmy(day)} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Date" />
            <button onClick={() => setDay(shiftDay(day, 1))} disabled={day >= todayIso} aria-label="Next day">›</button>
          </div>
          {!isKal && <button className="asa-btn" onClick={() => setDay(kal())}>Yesterday</button>}
          <button className="asa-btn" onClick={() => load(true)} disabled={busy} title="Load the latest data for this date">
            {busy ? 'Loading…' : '↻ Refresh'}
          </button>
          <button className="asa-btn" onClick={toggleFull} title="Show this page on the whole screen (Esc to exit)">
            {full ? 'Exit full screen' : '⛶ Full screen'}
          </button>
          {!full && cfg.next && (
            <button className="asa-btn asa-next" onClick={() => nav(cfg.next.route || `/d/${cfg.next.key}`)}>{cfg.next.label} ›</button>
          )}
        </div>
      </header>

      {err && <div className="asa-err">Could not load: {err}</div>}

      {nfOpen && nf && (
        <div className="asa-pop-bg modal-bg" onClick={() => setNfOpen(false)}>
          <div className="asa-pop" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Remarks not filled">
            <div className="asa-pop-head dpop-head" style={{ borderRadius: '.9em .9em 0 0' }}>
              <div>
                <h2 className="dpop-ttl">Remarks not filled · {dmy(day)}</h2>
                <div className="asa-sub dpop-sub">Maintenance ANDON calls with no entry in ANDON Remarks History</div>
              </div>
              <div className="asa-pop-tot dpop-num">Total: {n0(nf.total)}</div>
              <button type="button" className="asa-pop-x dpop-x" onClick={() => setNfOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="asa-pop-body">
              {!nf.by_zone.length && <div className="asa-empty">Every maintenance call of this day has a remark.</div>}
              {nf.by_zone.map((z) => (
                <div key={z.zone} className="asa-pz">
                  <div className="asa-pz-head"><b>{z.zone}</b><span>Zone total</span><em>{n0(z.total)}</em></div>
                  {z.lines.map((l) => (
                    <div key={l.line} className="asa-pz-line"><span>{l.line}</span><em>{n0(l.n)}</em></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 3 chart ── (ANDON me sirf Maintenance ki call, server se) */}
      <div className="asa-charts">
        <LineChartCard title="ANDON Calls" area="andon" rows={d?.andon_by_line || []}
                       valueKey="calls" yName="No. of calls" fmt={n0} fs={fs} cfg={UI_D.andon} empty="No maintenance ANDON calls on this day." />
        <LineChartCard title="Breakdown Frequency" area="freq" rows={d?.bd_by_line || []}
                       valueKey="frequency" yName="No. of breakdowns" fmt={n0} fs={fs} cfg={UI_D.freq} empty="No breakdowns on this day." />
        <LineChartCard title="Breakdown Hours" area="hours"
                       rows={[...(d?.bd_by_line || [])].sort((a, b) => (b.hours || 0) - (a.hours || 0))}
                       valueKey="hours" yName="Hours" fmt={n1} unit=" h" fs={fs} cfg={UI_D.hours} empty="No breakdowns on this day." />
      </div>

      {/* ── Breakdown table, category-wise ── */}
      <section className="asa-card asa-tablecard">
        <div className="asa-ch-head">
          <div>
            <h2>Breakdown details · category-wise</h2>
            <div className="asa-sub">
              {allGroups.length ? allGroups.map((g) => `${g.cat}: ${g.n}`).join('  ·  ') : 'Every breakdown slip filled for this day'}
            </div>
          </div>
          <label className="asa-filter">
            <span>Category</span>
            <select value={catOk} onChange={(e) => setCat(e.target.value)} aria-label="Category">
              <option value="">All</option>
              {allGroups.map((g) => <option key={g.cat} value={g.cat}>{catLabel(g.cat)} ({g.n})</option>)}
            </select>
          </label>
        </div>
        <div className="asa-tablewrap" tabIndex={0}>
          <table className="asa-table">
            <colgroup>
              <col style={{ width: '6.5%' }} /><col style={{ width: '5%' }} /><col style={{ width: '6%' }} />
              <col style={{ width: '8%' }} /><col style={{ width: '7.5%' }} /><col style={{ width: '10%' }} />
              <col style={{ width: '17%' }} /><col style={{ width: '16%' }} /><col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} /><col style={{ width: '5.5%' }} /><col style={{ width: '8.5%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>DATE</th><th>SLIP TYPE</th><th>CATEGORY</th><th>ZONE</th><th>LINE</th><th>MACHINE NO.</th>
                <th title="Actual problem observed by maintenance / tool room">ACTUAL PROBLEM OBSERVED BY MAINTENANCE</th>
                <th>ACTION TAKEN ON PROBLEM</th><th>B/D START TIME</th><th>B/D OK TIME</th>
                <th>M/C DOWN TIME (MIN)</th><th>B/D ATTENDED BY</th>
              </tr>
            </thead>
            <tbody>
              {loading && !d && <tr><td colSpan={12} className="asa-empty">Loading…</td></tr>}
              {!loading && d && !groups.length && <tr><td colSpan={12} className="asa-empty">No breakdown slips for {dmy(day)}.</td></tr>}
              {groups.map((g) => [
                <tr key={`h-${g.cat}`} className="asa-grp">
                  <td colSpan={12}>
                    <b>{catLabel(g.cat)}</b>
                    <span>{g.n} breakdown{g.n === 1 ? '' : 's'} · {hm(g.mins)}</span>
                  </td>
                </tr>,
                ...g.rows.map((r, i) => (
                  <tr key={`${g.cat}-${i}`}>
                    <td>{dmy(r.slip_date)}</td>
                    <td className={r.slip === 'Auto' ? 'asa-auto' : 'asa-man'}>{r.slip}</td>
                    <td className="asa-c">{r.category}</td>
                    <td>{r.zone || '—'}</td>
                    <td>{r.line || '—'}</td>
                    <td className="asa-mc">{r.machine_no || '—'}</td>
                    <td className="asa-wrap">{r.problem || '—'}</td>
                    <td className="asa-wrap">{r.action || '—'}</td>
                    <td className="asa-c">{r.start || '—'}</td>
                    <td className="asa-c">{r.end || '—'}</td>
                    <td className="asa-c asa-tt">{r.minutes == null ? '—' : n0(r.minutes)}</td>
                    <td>{r.attended_by || '—'}</td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* MES Asakai CSS, unchanged except: font / height follow the board canvas (var(--vw), var(--app-h)),
   no left gap for the MES sidebar button, the header may wrap (it also holds Next), plus the MES shared
   "← Back" and data-popup heading styles. */
const CSS = `
.asa-root { --g: .8em; background:${C.page}; color:${C.ink}; box-sizing:border-box;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: clamp(12px, calc(0.78 * var(--vw, 1vw)), 44px);
  height: var(--app-h, 100vh); padding: var(--g); display:flex; flex-direction:column; gap: var(--g); overflow:hidden; text-align:left; }
.asa-root *, .asa-root *::before, .asa-root *::after { box-sizing:border-box; }
body:has(.asa-root) { margin:0; }
.asa-root:fullscreen { width:100vw; height:100vh; background:${C.page}; }
.asa-root::backdrop { background:${C.page}; }

.asa-head { flex:none; background:linear-gradient(135deg, ${C.navy} 0%, #1c3d66 100%); border-radius:.9em;
  padding:.75em 1.1em; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:1em; }
.asa-title { display:flex; align-items:center; gap:.8em; min-width:0; }
.asa-title h1 { margin:0; color:#fff; font-size:1.75em; font-weight:800; letter-spacing:.01em; line-height:1.15; white-space:nowrap; }
.asa-root .dash-back { display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:700; color:#475569; line-height:1.2;
  background:#f1f5f9; border:1px solid #e2e8f0; border-radius:8px; padding:7px 14px; cursor:pointer; font-family:inherit; white-space:nowrap; margin:0; }
.asa-root .dash-back:hover { background:#e2e8f0; color:#0f172a; }
.asa-demo { font-size:.75em; font-weight:800; letter-spacing:.04em; color:#0f2744; background:#ffd66b; border-radius:.4em; padding:.25em .6em; white-space:nowrap; }
.asa-kpi-btn { font:inherit; color:inherit; cursor:pointer; }
.asa-kpi-btn:hover:not(:disabled) { background:rgba(255,255,255,.18); }
.asa-kpi-btn:disabled { cursor:default; }
/* NOT FILLED ka popup -- root ke andar, isliye Full screen me bhi dikhta hai */
.asa-pop-bg { position:fixed; inset:0; z-index:50; background:rgba(15,23,42,.45); display:flex; align-items:center; justify-content:center; padding:1.5em; }
.asa-pop { background:#fff; border-radius:.9em; width:min(46em, 100%); max-height:85vh; display:flex; flex-direction:column; box-shadow:0 1em 3em rgba(0,0,0,.3); }
.asa-pop-head { display:flex; align-items:flex-start; gap:1em; padding:1em 1.2em .8em; border-bottom:1px solid ${C.grid}; }
.asa-pop-head > div:first-child { flex:1; min-width:0; }
.asa-pop-head h2 { margin:0; font-size:1.3em; font-weight:800; }
.asa-pop-tot { font-size:2.1em; font-weight:800; color:#be123c; line-height:1; }
.asa-pop-x { font:inherit; font-size:1.2em; border:none; background:#f1f5f9; border-radius:.4em; width:1.8em; height:1.8em; cursor:pointer; }
.asa-pop-body { overflow:auto; padding:.8em 1.2em 1.2em; }
.asa-pz { border:1px solid ${C.grid}; border-radius:.6em; margin-bottom:.7em; overflow:hidden; }
.asa-pz-head { display:flex; align-items:center; gap:.7em; background:#e8eef6; padding:.5em .8em; }
.asa-pz-head b { font-size:1.1em; color:${C.navy}; }
.asa-pz-head span { flex:1; color:${C.ink2}; font-weight:700; font-size:.85em; }
.asa-pz-head em, .asa-pz-line em { font-style:normal; font-weight:800; min-width:2.5em; text-align:right; }
.asa-pz-head em { font-size:1.25em; color:#be123c; }
.asa-pz-line { display:flex; align-items:center; padding:.4em .8em .4em 1.8em; border-top:1px solid ${C.grid}; font-weight:700; }
.asa-pz-line span { flex:1; }
/* MES shared data-popup heading (responsive.css dpop-*): teal band, white centred title, ✕ on the right */
.asa-root .dpop-head { position:relative !important; display:block !important; text-align:center !important;
  background:#17607d !important; color:#fff !important; padding:12px 56px !important; border-bottom:2px solid #0e4a62 !important; }
.asa-root .dpop-head > div { min-width:0; }
.asa-root .dpop-head .dpop-ttl, .asa-root .dpop-head .dpop-ttl * { color:#fff !important; }
.asa-root .dpop-ttl { font-family:inherit !important; font-size:19px !important; font-weight:800 !important; line-height:1.25 !important;
  display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:8px; }
.asa-root .dpop-sub { color:rgba(255,255,255,.82) !important; font-size:12.5px !important; font-weight:600 !important; margin-top:4px !important;
  text-align:center !important; text-transform:none !important; letter-spacing:0 !important; }
.asa-root .dpop-num { color:#fff !important; font-size:15px !important; font-weight:800 !important; margin-top:4px; }
.asa-root .dpop-x { position:absolute !important; top:10px !important; right:12px !important; width:30px !important; height:30px !important;
  border-radius:6px !important; border:1px solid rgba(255,255,255,.5) !important; background:transparent !important;
  color:#fff !important; font-size:15px !important; cursor:pointer; }
.asa-root .dpop-x:hover { background:rgba(255,255,255,.15) !important; }
.asa-kpis { display:flex; gap:.6em; }
.asa-kpi { background:rgba(255,255,255,.09); border:1px solid rgba(255,255,255,.14); border-radius:.7em;
  padding:.35em 1em; min-width:7.5em; text-align:center; }
.asa-kpi b { display:block; font-size:1.9em; font-weight:800; line-height:1.1; }
.asa-kpi b small { font-size:.5em; font-weight:700; }
.asa-kpi span { color:#cfdae8; font-size:.8em; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
.asa-ctrl { display:flex; align-items:center; gap:.5em; }
.asa-day { display:inline-flex; align-items:center; background:rgba(255,255,255,.12); border-radius:.6em; overflow:hidden; }
.asa-day button { background:transparent; border:none; color:#fff; font-size:1.5em; width:1.6em; height:1.6em; cursor:pointer; line-height:1; }
.asa-day button:disabled { opacity:.3; cursor:default; }
.asa-day input { font:inherit; font-size:1em; font-weight:800; border:none; border-radius:.35em; padding:.3em .45em; color:${C.ink}; background:#fff; }
/* MES dateDmy.js: the device shows its own date order (mm/dd on this WebView); show DD/MM/YYYY over it */
.asa-day input[data-dmy] { position:relative; }
.asa-day input[data-dmy]::-webkit-datetime-edit, .asa-day input[data-dmy]::-webkit-date-and-time-value { visibility:hidden; }
.asa-day input[data-dmy]::before { content:attr(data-dmy); position:absolute; left:0; top:0; bottom:0; box-sizing:border-box; max-width:100%;
  padding:inherit; padding-top:0; padding-bottom:0; display:flex; align-items:center; white-space:nowrap; overflow:hidden; pointer-events:none; }
.asa-btn { font:inherit; font-size:.92em; font-weight:800; color:#fff; background:rgba(255,255,255,.14);
  border:1px solid rgba(255,255,255,.25); border-radius:.6em; padding:.45em .85em; cursor:pointer; white-space:nowrap; }
.asa-btn:hover { background:rgba(255,255,255,.24); }
.asa-err { flex:none; background:#fdecec; color:#9b1c1c; border:1px solid #f3b4b4; border-radius:.6em; padding:.5em .8em; font-weight:700; }

.asa-card { background:${C.card}; border:1px solid ${C.line}; border-radius:.9em; box-shadow:0 1px 2px rgba(0,0,0,.04);
  display:flex; flex-direction:column; min-height:0; }
.asa-ch-head { flex:none; display:flex; justify-content:space-between; align-items:flex-start; gap:.8em; padding:.7em .9em .2em; }
.asa-ch-head h2 { margin:0; font-size:1.18em; font-weight:800; }
.asa-filter { display:flex; align-items:center; gap:.5em; font-weight:800; color:${C.ink2}; font-size:.9em; }
.asa-filter select { font:inherit; font-weight:700; color:${C.ink}; padding:.35em .6em; border:1px solid ${C.axis};
  border-radius:.45em; background:#fff; min-width:11em; cursor:pointer; }
.asa-sub { color:${C.muted}; font-size:.82em; font-weight:600; margin-top:.1em; }
.asa-ch-total { font-size:1.9em; font-weight:800; line-height:1; }
.asa-ch-total small { font-size:.5em; }

.asa-charts { flex: 0 0 38%; display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap: var(--g); min-height:0; }
.asa-chart { min-width:0; }
.asa-ch-body { flex:1; min-height:0; padding:0 .5em .4em; }
.asa-empty { color:${C.muted}; font-weight:700; text-align:center; padding:2em 1em; }
.asa-ch-body .asa-empty { height:100%; display:flex; align-items:center; justify-content:center; }

.asa-tablecard { flex:1 1 0; }
.asa-tablewrap { flex:1; min-height:0; overflow:auto; margin:.3em .6em .6em; border:1px solid ${C.line}; border-radius:.5em; }
.asa-table { width:100%; border-collapse:separate; border-spacing:0; table-layout:fixed; font-size:.95em; }
.asa-table th { position:sticky; top:0; z-index:1; background:${C.navy}; color:#fff; font-weight:800; text-align:left;
  padding:.5em .55em; font-size:.88em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.asa-table td { padding:.45em .55em; border-bottom:1px solid ${C.grid}; vertical-align:top; overflow:hidden; text-overflow:ellipsis; }
.asa-table tbody tr:nth-child(even):not(.asa-grp) td { background:#fafbfc; }
.asa-table td.asa-wrap { white-space:normal; word-break:break-word; }
.asa-table td.asa-c { text-align:center; white-space:nowrap; }
.asa-table td.asa-mc { font-weight:800; white-space:normal; overflow-wrap:anywhere; }
.asa-table td.asa-tt { font-weight:800; color:#b4461c; }
.asa-table td.asa-auto { color:#1d4ed8; font-weight:800; }
.asa-table td.asa-man { color:#475569; font-weight:800; }
.asa-table th { white-space:normal; line-height:1.2; vertical-align:bottom; }
.asa-grp td { background:#e8eef6 !important; border-bottom:1px solid #c9d6e6; padding:.4em .7em; }
.asa-grp b { font-size:1.05em; color:${C.navy}; margin-right:.8em; }
.asa-grp span { color:${C.ink2}; font-weight:700; font-size:.9em; }

/* phone: sab ek ke neeche, page scroll */
@media (max-width: 900px) {
  body:not(.fit) .asa-root { height:auto; min-height:100vh; overflow:visible; font-size:13px; }
  body:not(.fit) .asa-ctrl .asa-btn:nth-last-child(2) { display:none; }
  body:not(.fit) .asa-kpis { width:100%; }
  body:not(.fit) .asa-kpi { flex:1; min-width:0; padding:.35em .4em; }
  body:not(.fit) .asa-charts { flex:none; grid-template-columns:1fr; }
  body:not(.fit) .asa-chart { height:300px; }
  body:not(.fit) .asa-tablewrap { overflow-x:auto; }
  body:not(.fit) .asa-table { min-width:1100px; }
}
/* khadi (portrait) badi screen: Frequency + Hours ek line me, uske neeche ANDON poori chaudai, baaki table */
@media (orientation: portrait) and (min-width: 901px) {
  .asa-root { font-size: clamp(13px, 1.1vw, 44px); }
  .asa-charts { flex: 0 0 58%; grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: repeat(2, minmax(0, 1fr)); grid-template-areas: "freq hours" "andon andon"; }
  .asa-ch-freq { grid-area: freq; }
  .asa-ch-hours { grid-area: hours; }
  .asa-ch-andon { grid-area: andon; }
  .asa-tablecard { flex: 1 1 0; }
  .asa-table { font-size: .86em; }
  .asa-table td:first-child { text-overflow: clip; }
}
`;
