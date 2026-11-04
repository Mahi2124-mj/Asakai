// Spatial navigation for TV remotes (D-pad arrows + OK/Enter).
const FOCUSABLE = 'button:not([disabled]), a[href], select, input, [tabindex]:not([tabindex="-1"])';
const DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

const visible = (el) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
};

function canScroll(el, dx, dy) {
  if (!el || !el.matches?.('.tbl-wrap, .chart-scroll, .side-slicers, .slicer-bar, .tabs')) return false;
  if (dy > 0) return el.scrollTop + el.clientHeight < el.scrollHeight - 1;
  if (dy < 0) return el.scrollTop > 0;
  if (dx > 0) return el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  if (dx < 0) return el.scrollLeft > 0;
  return false;
}

// While a dialog is open, the remote must stay inside it.
const scope = () => document.querySelector('.modal-bg') || document;

function best(from, dx, dy) {
  const a = from.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  let winner = null;
  let score = Infinity;
  scope().querySelectorAll(FOCUSABLE).forEach((el) => {
    if (el === from || !visible(el)) return;
    const b = el.getBoundingClientRect();
    const bx = b.left + b.width / 2;
    const by = b.top + b.height / 2;
    const px = (bx - ax) * dx + (by - ay) * dy; // distance along the direction
    if (px <= 4) return;
    const off = Math.abs(dx ? by - ay : bx - ax); // sideways offset
    const s = px + off * 2.2;
    if (s < score) { score = s; winner = el; }
  });
  return winner;
}

export function installDpad() {
  const onKey = (e) => {
    const dir = DIRS[e.key];
    if (!dir) return;
    const act = document.activeElement;
    const tag = act?.tagName;
    if (tag === 'INPUT' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
    const [dx, dy] = dir;
    if (canScroll(act, dx, dy)) {
      act.scrollBy({ left: dx * 80, top: dy * 80, behavior: 'smooth' });
      e.preventDefault();
      return;
    }
    const sc = scope();
    const start = act && act !== document.body && sc.contains(act) ? act : null;
    const next = start ? best(start, dx, dy) : sc.querySelector(FOCUSABLE);
    if (next) {
      e.preventDefault();
      next.focus({ preventScroll: false });
      next.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
