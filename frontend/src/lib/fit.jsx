import { createContext, useContext, useEffect, useState } from 'react';

/**
 * TV / large-landscape "fit to screen" mode.
 * Every page is laid out on a fixed 1366px-wide design canvas whose height matches the
 * screen's aspect ratio, then scaled to the real viewport (like Power BI "fit to page").
 * A 1080p/4K Android TV (≈960×540 or 1920×1080 CSS px) therefore shows the whole
 * dashboard on one screen with identical proportions.
 */
export const DESIGN_W = 1366;
const KEY = 'asakai.fit'; // 'on' | 'off' | absent = auto

const FitCtx = createContext({ fit: false, scale: 1 });
export const useFit = () => useContext(FitCtx);

export const getFitPref = () => localStorage.getItem(KEY) || 'auto';
export function setFitPref(v) {
  if (v === 'auto') localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, v);
  window.dispatchEvent(new Event('asakai:fit'));
}

function calc() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pref = getFitPref();
  const auto = vw >= 900 && vw > vh * 1.15 && vh >= 400;
  const fit = pref === 'on' ? true : pref === 'off' ? false : auto;
  const scale = vw / DESIGN_W;
  return { fit, scale, vw, vh, h: Math.round(vh / scale) };
}

export function FitScreen({ children }) {
  const [s, setS] = useState(calc);
  useEffect(() => {
    const on = () => setS(calc());
    window.addEventListener('resize', on);
    window.addEventListener('asakai:fit', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('asakai:fit', on);
    };
  }, []);
  useEffect(() => {
    document.body.classList.toggle('fit', s.fit);
  }, [s.fit]);

  if (!s.fit) return <FitCtx.Provider value={{ fit: false, scale: 1 }}>{children}</FitCtx.Provider>;
  return (
    <FitCtx.Provider value={{ fit: true, scale: s.scale }}>
      <div className="fit-outer" style={{ width: s.vw, height: s.vh }}>
        <div className="fit-inner" style={{ width: DESIGN_W, height: s.h, transform: `scale(${s.scale})`, '--app-h': `${s.h}px` }}>
          {children}
        </div>
      </div>
    </FitCtx.Provider>
  );
}

/* ---------- explicit grid placement for fit mode ---------- */

const ROW_WEIGHT = { kpi: 0.45, kpiGoal: 0.62, kpiRow: 0.55, tiles: 0.42, calendar: 1, badge: 0.75 };
const weightOf = (w) => ROW_WEIGHT[w.type] ?? (w.h || 240) / 240;

/** Mimics CSS-grid sparse auto-placement on 12 columns, then weights rows by content. */
export function placeWidgets(widgets) {
  const occ = [];
  const free = (r, c, span, rows) => {
    for (let i = r; i < r + rows; i++) for (let j = c; j < c + span; j++) if (occ[i]?.[j]) return false;
    return true;
  };
  let cr = 0;
  let cc = 0;
  const pos = widgets.map((w) => {
    const span = Math.min(12, w.span || 12);
    const rows = w.rows || 1;
    let r = cr;
    let c = cc;
    for (;;) {
      if (c + span > 12) { r += 1; c = 0; continue; }
      if (free(r, c, span, rows)) break;
      c += 1;
    }
    for (let i = r; i < r + rows; i++) {
      occ[i] = occ[i] || [];
      for (let j = c; j < c + span; j++) occ[i][j] = true;
    }
    cr = r;
    cc = c + span;
    return { row: r, col: c, span, rows };
  });
  const nRows = occ.length;
  const weights = Array.from({ length: nRows }, (_, r) => {
    const single = widgets.filter((w, i) => pos[i].row === r && pos[i].rows === 1).map(weightOf);
    if (single.length) return Math.max(...single);
    const multi = widgets.filter((w, i) => pos[i].row <= r && pos[i].row + pos[i].rows > r).map((w) => weightOf(w) / (w.rows || 1));
    return multi.length ? Math.max(...multi) : 1;
  });
  return { pos, template: weights.map((x) => `minmax(0, ${x.toFixed(2)}fr)`).join(' ') };
}
