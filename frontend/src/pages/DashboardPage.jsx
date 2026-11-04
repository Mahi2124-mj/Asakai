import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { BY_KEY } from '../dashboards/index.js';
import { getDashboard } from '../lib/api.js';
import { exportPdf } from '../lib/pdf.js';
import Widget, { DashCtx } from '../components/Widget.jsx';
import { fmtDate } from '../dashboards/_gen.js';
import { useFit, placeWidgets } from '../lib/fit.jsx';

const BASE = import.meta.env.BASE_URL;
const REFRESH_MS = 5 * 60 * 1000;

function SelectSlicer({ s, value, onChange }) {
  return (
    <label className={`slicer ${s.wide ? 'wide' : ''}`}>
      <span>{s.label}</span>
      <select value={value || 'All'} onChange={(e) => onChange(e.target.value === 'All' ? undefined : e.target.value)}>
        <option>All</option>
        {s.options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

function ButtonSlicer({ s, value, onChange }) {
  return (
    <div className={`slicer slicer-btns ${s.side ? 'side' : ''}`}>
      <span>{s.label}</span>
      <div className="btns">
        <button type="button" className={!value ? 'on' : ''} onClick={() => onChange(undefined)}>Select all</button>
        {s.options.map((o) => (
          <button type="button" key={o} className={value === o ? 'on' : ''} onClick={() => onChange(value === o ? undefined : o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}

const Slicer = (props) => (props.s.type === 'buttons' ? <ButtonSlicer {...props} /> : <SelectSlicer {...props} />);

export default function DashboardPage() {
  const { key } = useParams();
  const cfg = BY_KEY[key];
  const nav = useNavigate();
  const [filters, setFilters] = useState({});
  const [tab, setTab] = useState(0);
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [tick, setTick] = useState(0);
  const bodyRef = useRef(null);
  const { fit } = useFit();

  useEffect(() => { setFilters({}); setTab(0); setRes(null); }, [key]);

  useEffect(() => {
    if (!cfg) return undefined;
    let alive = true;
    setLoading(true);
    getDashboard(key, filters)
      .then((r) => { if (alive) setRes(r); })
      .catch((e) => { if (alive) setRes({ data: {}, source: 'demo', error: e.message }); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [key, cfg, filters, tick]);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), REFRESH_MS);
    return () => clearInterval(t);
  }, []);

  const ctx = useMemo(() => ({
    setTab: (name) => {
      const i = cfg?.tabs.findIndex((t) => t.name === name);
      if (i >= 0) setTab(i);
    },
  }), [cfg]);

  const onPdf = useCallback(async () => {
    if (!bodyRef.current) return;
    setExporting(true);
    try {
      // Let the grid re-render without TV scaling before capturing.
      await new Promise((r) => setTimeout(r, 450));
      await exportPdf(bodyRef.current, `${cfg.key}-${fmtDate(new Date(), 'dd-mm-yyyy')}.pdf`);
    } catch (e) {
      alert(`PDF export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  }, [cfg]);

  const active = cfg ? cfg.tabs[tab] || cfg.tabs[0] : null;
  const fitOn = fit && !exporting;
  const layout = useMemo(() => (active && fitOn ? placeWidgets(active.widgets) : null), [active, fitOn]);

  if (!cfg) return <Navigate to="/portal" replace />;

  const setF = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }));
  const side = cfg.slicers.filter((s) => s.side);
  const top = cfg.slicers.filter((s) => !s.side);
  const goNext = () => nav(cfg.next.route || `/d/${cfg.next.key}`);
  const updated = res?.updatedAt ? new Date(res.updatedAt) : new Date();

  return (
    <DashCtx.Provider value={ctx}>
      <div className={`dash ${fitOn ? 'dash-fit' : ''}`}>
        <header className="dhead">
          <button className="circ-back" onClick={() => nav(cfg.back)} aria-label="Back">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10.5" /><path d="M16 12H8m4-4-4 4 4 4" /></svg>
          </button>
          <img className="dlogo" src={`${BASE}img/logo.png`} alt="Toyota Boshoku" />
          <h1 className="dtitle">{cfg.title}</h1>
          {cfg.showUpdated && (
            <div className="updated"><b>{fmtDate(updated, 'dd-mm-yyyy')}</b><span>Latest Data up-dated Date</span></div>
          )}
          <div className="dhead-actions">
            <button className="btn-navy" onClick={() => setFilters({})}>Clear all slicers</button>
            <button className="btn-navy btn-icon" onClick={onPdf} disabled={exporting} title="Export PDF">
              {exporting ? '…' : 'PDF'}
            </button>
            <button className="btn-next" onClick={goNext}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>
              {cfg.next.label}
            </button>
          </div>
        </header>

        <div className="dash-main">
          {side.length > 0 && (
            <aside className="side-slicers">
              {side.map((s) => <Slicer key={s.key} s={s} value={filters[s.key]} onChange={setF(s.key)} />)}
            </aside>
          )}
          <div className="dash-content">
            {top.length > 0 && (
              <div className="slicer-bar">
                {top.map((s) => <Slicer key={s.key} s={s} value={filters[s.key]} onChange={setF(s.key)} />)}
              </div>
            )}
            {cfg.tabs.length > 1 && (
              <nav className="tabs">
                {cfg.tabs.map((t, i) => (
                  <button key={t.name} className={i === tab ? 'on' : ''} onClick={() => setTab(i)}>{t.name}</button>
                ))}
              </nav>
            )}
            <div className={`grid ${loading ? 'is-loading' : ''} ${layout ? 'grid-fit' : ''}`} ref={bodyRef}
              style={layout ? { gridTemplateRows: layout.template } : undefined}>
              {res && active.widgets.map((w, i) => (
                <Widget key={`${active.name}-${i}`} w={w} data={res.data} pos={layout?.pos[i]} />
              ))}
              {!res && <div className="loading">Loading…</div>}
            </div>
          </div>
        </div>

        <footer className="dfoot">
          {res && <span className={`src ${res.source === 'demo' ? 'demo' : 'live'}`}>{res.source === 'demo' ? 'DEMO DATA' : 'LIVE · asakai server'}</span>}
          {res?.error && <span className="err">Server: {res.error}</span>}
          <span>Updated {updated.toLocaleTimeString()}</span>
          <button className="linkbtn" onClick={() => setTick((x) => x + 1)}>Refresh</button>
        </footer>
      </div>
    </DashCtx.Provider>
  );
}
