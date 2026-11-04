import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { getApiUrl } from '../lib/api.js';

const BASE = import.meta.env.BASE_URL;

const WAY = [
  ['We meet ', 'challenges', ' with courage and creativity, to realize our dreams.'],
  ['We carry out ', 'Kaizen', ' continuously, aiming to achieve higher goals.'],
  ['We practice ', 'Genchi Genbutsu', ' by going to the source to analyze problems and find their root causes.'],
  ['Once a decision is made, we ', 'move quickly to carry out the plan', ', with passion.'],
  ['We seek to do our best, ', 'act professionally', ', and take responsibility for our actions.'],
  ['We respect the values of other cultures and accept differences, with an ', 'open mind and global perspective', '.'],
  ['As a good corporate citizen, we do what is right and contribute to society.', '', ''],
  ['We respect the individual and ', 'use teamwork', ' to produce the best result.'],
];

function LoginDialog({ onClose }) {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const server = getApiUrl();
  const userRef = useRef(null);
  // autoFocus is unreliable in Android WebView when opened from a remote key press.
  useEffect(() => {
    const t = setTimeout(() => userRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await login(u.trim(), p);
      nav(loc.state?.from || '/portal', { replace: true });
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <form className="login-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <img src={`${BASE}img/logo.png`} alt="" className="login-logo" />
        <h2>e-Asakai Login</h2>
        <label>Username<input ref={userRef} value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" autoCapitalize="none" /></label>
        <label>Password<input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" /></label>
        {err && <div className="login-err">{err}</div>}
        <button className="btn-login" disabled={busy}>{busy ? 'Signing in…' : 'Login'}</button>
        <div className="login-note">
          {server ? <>Server: <b>{server}</b></> : <>Demo mode — no server configured, any username/password works.</>}
          {' '}<Link to="/settings">Server settings</Link>
        </div>
      </form>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [show, setShow] = useState(!!loc.state?.login);
  const loginBtn = useRef(null);
  useEffect(() => { if (loc.state?.login) setShow(true); }, [loc.state]);
  // TV remote: start with the Login/Enter button focused.
  useEffect(() => { if (!show) loginBtn.current?.focus({ preventScroll: true }); }, [show]);

  return (
    <div className="landing" style={{ backgroundImage: `url(${BASE}img/bg.jpg)` }}>
      <header className="land-head">
        <div className="land-brand"><img src={`${BASE}img/logo.png`} alt="Toyota Boshoku" /></div>
        <h1 className="land-title">e-Asakai Board</h1>
      </header>
      <div className="land-body">
        <div className="board">
          <div className="tbway"><span className="tb-mark">TB</span> TB Way</div>
          <p className="tb-intro">We contribute to society by <b>developing leading-edge</b> technologies and <b>manufacturing high-quality products</b></p>
          <ol className="tb-list">
            {WAY.map(([a, hl, c], i) => <li key={i}>{a}{hl && <em>{hl}</em>}{c}</li>)}
          </ol>
          <button ref={loginBtn} className="btn-login big" onClick={() => (user ? nav('/portal') : setShow(true))}>{user ? 'Enter' : 'Login'}</button>
        </div>
        <img className="leader" src={`${BASE}img/leader.jpg`} alt="" />
      </div>
      {show && !user && <LoginDialog onClose={() => setShow(false)} />}
    </div>
  );
}
