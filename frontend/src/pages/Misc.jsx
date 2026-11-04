import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl, health, setApiUrl, clearSession } from '../lib/api.js';
import { PortalShell } from './Portal.jsx';

const BASE = import.meta.env.BASE_URL;

export function Settings() {
  const [url, setUrl] = useState(getApiUrl());
  const [msg, setMsg] = useState(null);
  const nav = useNavigate();

  const test = async () => {
    setMsg({ t: 'Checking…' });
    try {
      const h = await health(url);
      setMsg({ ok: true, t: `Connected: ${h.service} v${h.version} · database ${h.database} · maintenance DB ${h.maintenance ?? 'n/a'} · cache ${h.cache} · mode ${h.mode}` });
    } catch (e) {
      setMsg({ ok: false, t: `Not reachable: ${e.message}` });
    }
  };

  const save = () => {
    setApiUrl(url);
    clearSession(); // token belongs to the previous server
    window.dispatchEvent(new Event('asakai:logout'));
    nav('/', { state: { login: true } });
  };

  return (
    <div className="settings-page">
      <div className="settings-card">
        <h2>asakai server</h2>
        <p>Base URL of the asakai FastAPI server, e.g. <code>http://192.168.1.20:8000</code>. Leave empty to run with built-in demo data.</p>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://server-ip:8000" inputMode="url" />
        <div className="row">
          <button className="btn-navy" onClick={test} disabled={!url}>Test connection</button>
          <button className="btn-navy" onClick={save}>Save & re-login</button>
          <button className="btn-plain" onClick={() => nav(-1)}>Cancel</button>
        </div>
        {msg && <div className={`msg ${msg.ok === true ? 'ok' : msg.ok === false ? 'bad' : ''}`}>{msg.t}</div>}
      </div>
    </div>
  );
}

export function ThankYou() {
  const nav = useNavigate();
  return (
    <div className="thanks" style={{ backgroundImage: `url(${BASE}img/bg.jpg)` }}>
      <button className="back-link" onClick={() => nav('/portal')}>
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 12H3m7-7-7 7 7 7" /></svg> BACK
      </button>
      <img className="thanks-logo" src={`${BASE}img/logo.png`} alt="Toyota Boshoku" />
      <h1>Thank You</h1>
    </div>
  );
}

export { PortalShell };
