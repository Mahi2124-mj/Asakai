import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

const BASE = import.meta.env.BASE_URL;

const Icon = {
  home: <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 3 2 12h3v8h5v-5h4v5h5v-8h3z" /></svg>,
  gear: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>,
  out: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" /></svg>,
  back: <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 12H3m7-7-7 7 7 7" /></svg>,
};

export function PortalShell({ title = 'e-Asakai Portal', back, children }) {
  const nav = useNavigate();
  const { logout, user } = useAuth();
  return (
    <div className="portal">
      <header className="phead">
        <div className="plogo"><img src={`${BASE}img/logo.png`} alt="Toyota Boshoku" /></div>
        <h1>{title}</h1>
        <div className="puser">{user?.full_name || user?.username}</div>
      </header>
      <div className="pbody">
        <nav className="prail">
          <Link to="/portal" title="Home">{Icon.home}</Link>
          <Link to="/settings" title="Server settings">{Icon.gear}</Link>
          <button title="Logout" onClick={() => { logout(); nav('/'); }}>{Icon.out}</button>
        </nav>
        <main className="pmain">
          {back && <button className="back-link" onClick={() => nav(back)}>{Icon.back} BACK</button>}
          {children}
        </main>
      </div>
    </div>
  );
}

export function ButtonGrid({ heading, items, cols = 3 }) {
  const nav = useNavigate();
  const first = useRef(null);
  // TV remote: land on the first tile so OK/arrows work immediately.
  useEffect(() => { first.current?.focus({ preventScroll: true }); }, []);
  return (
    <div className="bgrid-wrap">
      <div className="bgrid-head">{heading}</div>
      <div className="bgrid" style={{ '--cols': cols }}>
        {items.map((it, i) => (
          <button key={it.label} ref={i === 0 ? first : undefined} className={`dept-btn ${it.accent ? 'accent' : ''}`} onClick={() => nav(it.to)}>{it.label}</button>
        ))}
      </div>
    </div>
  );
}

export function Departments() {
  return (
    <PortalShell back="/">
      <ButtonGrid
        heading="DEPARTMENT"
        items={[
          { label: 'DISPATCH', to: '/d/dispatch' },
          { label: 'STORE', to: '/d/store' },
          { label: 'HR', to: '/d/hr' },
          { label: 'QUALITY', to: '/portal/quality' },
          { label: 'PRODUCTION', to: '/portal/production', accent: true },
          { label: 'MAINTENANCE', to: '/d/maintenance', accent: true },
          { label: 'TOOLROOM', to: '/d/toolroom' },
          { label: 'DOJO', to: '/soon/Dojo' },
          { label: 'ATTENDANCE DASHBOARD', to: '/soon/Attendance Dashboard' },
          { label: "B'Day", to: '/soon/Birthday' },
          { label: 'SALES FORECAST', to: '/soon/Sales Forecast' },
          { label: 'QUALITY CIRCLE', to: '/d/quality-circle' },
        ]}
      />
      <div className="start-asakai">
        <Link to="/d/dispatch" className="btn-start">▶ Start Asakai Meeting</Link>
      </div>
    </PortalShell>
  );
}

export function Zones() {
  return (
    <PortalShell back="/portal">
      <ButtonGrid
        heading="ZONE"
        items={[
          { label: 'PRESS SHOP', to: '/d/press-shop' },
          { label: 'LOOP PIPE', to: '/d/loop-pipe' },
          { label: 'SUB ASSEMBLY', to: '/d/sub-assy' },
          { label: 'SEAT SLIDER', to: '/d/seat-slider' },
          { label: 'RECLINER', to: '/d/recliner' },
          { label: 'THIN RECLINER', to: '/d/thin-recliner' },
        ]}
      />
    </PortalShell>
  );
}

export function QualityPortal() {
  return (
    <PortalShell title="e-Quality Portal" back="/portal">
      <ButtonGrid
        heading="QUALITY SHEET"
        cols={2}
        items={[
          { label: 'CUSTOMER QUALITY', to: '/d/customer-quality' },
          { label: 'RECEIVING QUALITY', to: '/d/receiving-quality' },
        ]}
      />
    </PortalShell>
  );
}

export function ComingSoon({ name }) {
  return (
    <PortalShell back="/portal">
      <div className="soon">
        <h2>{name}</h2>
        <p>This dashboard is not configured yet. It will be added once its layout and data source are finalised.</p>
      </div>
    </PortalShell>
  );
}
