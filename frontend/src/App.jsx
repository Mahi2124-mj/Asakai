import { useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { AuthProvider, RequireAuth } from './lib/auth.jsx';
import Landing from './pages/Landing.jsx';
import { Departments, Zones, QualityPortal, ComingSoon } from './pages/Portal.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import { Settings, ThankYou } from './pages/Misc.jsx';
import { FitScreen } from './lib/fit.jsx';
import { installDpad } from './lib/dpad.js';

/** Android hardware back button + status bar colour (no-ops in the browser). */
function NativeBridge() {
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let cancelled = false;
    let handle;
    import('@capacitor/app').then(async ({ App }) => {
      const h = await App.addListener('backButton', () => {
        if (loc.pathname === '/' || loc.pathname === '') App.exitApp();
        else nav(-1);
      });
      if (cancelled) h.remove();
      else handle = h;
    });
    return () => { cancelled = true; handle?.remove(); };
  }, [loc.pathname, nav]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#0D1B7A' }).catch(() => {});
    });
    import('@capacitor/splash-screen').then(({ SplashScreen }) => SplashScreen.hide().catch(() => {}));
  }, []);
  return null;
}

function RemoteControl() {
  useEffect(() => installDpad(), []);
  return null;
}

function SoonRoute() {
  const { name } = useParams();
  return <ComingSoon name={name} />;
}

const guard = (el) => <RequireAuth>{el}</RequireAuth>;

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <NativeBridge />
        <RemoteControl />
        <FitScreen>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/portal" element={guard(<Departments />)} />
          <Route path="/portal/production" element={guard(<Zones />)} />
          <Route path="/portal/quality" element={guard(<QualityPortal />)} />
          <Route path="/d/:key" element={guard(<DashboardPage />)} />
          <Route path="/soon/:name" element={guard(<SoonRoute />)} />
          <Route path="/thank-you" element={guard(<ThankYou />)} />
          <Route path="*" element={<Landing />} />
        </Routes>
        </FitScreen>
      </HashRouter>
    </AuthProvider>
  );
}
