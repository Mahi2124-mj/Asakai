import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { BY_KEY } from '../dashboards/index.js';
import { getDashboard } from '../lib/api.js';
import { exportPdf } from '../lib/pdf.js';
import { masterOptions, useMachineMaster } from '../lib/masters.js';
import Widget, { DashCtx } from '../components/Widget.jsx';
import { fmtDate } from '../dashboards/_gen.js';
import { CASCADE, defaultFilters } from '../dashboards/_slicers.js';
import { useFit, placeWidgets } from '../lib/fit.jsx';
import MaintenanceAsakai from './MaintenanceAsakai.jsx';

// Dashboards drawn by their own page instead of the widget grid (cfg.page).
const PAGES = { maintenanceAsakai: MaintenanceAsakai };

const BASE = import.meta.env.BASE_URL;
const REFRESH_MS = 5 * 60 * 1000;
// Spread auto-refresh over 30 s so a room full of boards doesn't hit the server in the same second.
const JITTER_MS = 30 * 1000;
// Slicer clicks within this window are sent as one request.
const DEBOUNCE_MS = 200;

const asOption = (o) => (typeof o === 'object' ? o : { value: o, label: o });

function SelectSlicer({ s, options, value, onChange }) {
  const opts = options.map(asOption);
  // Keep a chosen value visible even if the list doesn't have it (yet), e.g. master still loading.
  if (value && !opts.some((o) => o.value === value)) opts.unshift({ value, label: value });
  return (
    <label className={`slicer ${s.wide ? 'wide' : ''}`}>
      <span>{s.label}</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">All</option>
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function ButtonSlicer({ s, options, value, onChange }) {
  return (
    <div className={`slicer slicer-btns ${s.side ? 'side' : ''}`}>
      <span>{s.label}</span>
      <div className="btns">
        <button type="button" className={!value ? 'on' : ''} onClick={() => onChange(undefined)}>Select all</button>
        {options.map(asOption).map((o) => (
          <button type="button" key={o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(value === o.value ? undefined : o.value)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

const Slicer = (props) => (props.s.type === 'buttons' ? <ButtonSlicer {...props} /> : <SelectSlicer {...props} />);

/** Route wrapper: a new dashboard gets a fresh page (its own default slicers, tab and data). */
export default function DashboardRoute() {
  const { key } = useParams();
  const Page = PAGES[BY_KEY[key]?.page];
  return Page ? <Page key={key} cfg={BY_KEY[key]} /> : <DashboardPage key={key} dashKey={key} />;
}

function DashboardPage({ dashKey: key }) {
  const cfg = BY_KEY[key];
  const nav = useNavigate();
  const defaultsRef = useRef(null);
  const [filters, setFilters] = useState(() => {
    defaultsRef.current = cfg ? defaultFilters(cfg.slicers) : {};
    return defaultsRef.current;
  });
  const [tab, setTab] = useState(0);
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [tick, setTick] = useState(0);
  const bodyRef = useRef(null);
  const forceRef = useRef(false);
  const firstRef = useRef(true);
  const loadedAt = useRef(0);
  const { fit } = useFit();
  const master = useMachineMaster(!!cfg?.slicers.some((s) => s.master));

  useEffect(() => {
    if (!cfg) return undefined;
    const ctrl = new AbortController();
    const force = forceRef.current;
    forceRef.current = false;
    setLoading(true);
    const t = setTimeout(() => {
      getDashboard(key, filters, { force, signal: ctrl.signal })
        .then((r) => { if (!ctrl.signal.aborted) { setRes(r); loadedAt.current = Date.now(); } })
        .catch((e) => { if (e.name !== 'AbortError') setRes({ data: {}, source: 'demo', error: e.message }); })
        .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    }, firstRef.current ? 0 : DEBOUNCE_MS);
    firstRef.current = false;
    // A newer slicer choice (or leaving the page) cancels the request still in flight.
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [key, cfg, filters, tick]);

  const refresh = useCallback(() => {
    forceRef.current = true;
    setTick((x) => x + 1);
  }, []);

  useEffect(() => {
    if (!cfg) return undefined;
    const every = REFRESH_MS + Math.floor(Math.random() * JITTER_MS);
    const t = setInterval(() => {
      if (document.hidden) return; // nobody is looking: don't load the server
      // A board left on overnight moves its default ("yesterday") forward, unless someone changed it.
      const next = defaultFilters(cfg.slicers);
      const prev = defaultsRef.current;
      defaultsRef.current = next;
      setFilters((f) => {
        const moved = Object.keys(next).filter((k) => f[k] === prev[k] && next[k] !== prev[k]);
        return moved.length ? { ...f, ...Object.fromEntries(moved.map((k) => [k, next[k]])) } : f;
      });
      refresh();
    }, every);
    const onVisible = () => { if (!document.hidden && Date.now() - loadedAt.current > every) refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, [cfg, refresh]);

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

  const setF = (k) => (v) => setFilters((f) => {
    const out = { ...f, [k]: v };
    (CASCADE[k] || []).forEach((c) => { delete out[c]; });
    return out;
  });
  const clearAll = () => {
    defaultsRef.current = defaultFilters(cfg.slicers);
    setFilters(defaultsRef.current);
  };
  const optionsOf = (s) => {
    if (s.master) return masterOptions(master, s.master, filters);
    return typeof s.options === 'function' ? s.options() : s.options;
  };
  const slicer = (s) => <Slicer key={s.key} s={s} options={optionsOf(s)} value={filters[s.key]} onChange={setF(s.key)} />;
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
            <button className="btn-navy" onClick={clearAll}>Clear all slicers</button>
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
              {side.map(slicer)}
            </aside>
          )}
          <div className="dash-content">
            {top.length > 0 && (
              <div className="slicer-bar">
                {top.map(slicer)}
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
          <button className="linkbtn" onClick={refresh}>Refresh</button>
        </footer>
      </div>
    </DashCtx.Provider>
  );
}
