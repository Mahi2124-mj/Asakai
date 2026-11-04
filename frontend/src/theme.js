// Chart palette. Validated on the white chart surface with the dataviz palette checks
// (adjacent CVD ΔE >= 9.2, normal-vision ΔE >= 19.6). Fixed order: assign slots in sequence,
// never cycle or add hues. Slots 1-3 carry the board's Plan / Actual / Gap convention.
export const C = {
  blue: '#6da7ec',   // 1 · Plan
  navy: '#1c5cab',   // 2 · Actual, and any single measured series
  orange: '#eb6834', // 3 · Gap / backlog
  aqua: '#1baf7a',
  violet: '#6250d6',
  pink: '#e87ba4',
  yellow: '#eda100',
  red: '#e34948',
};

export const SERIES = [C.blue, C.navy, C.orange, C.aqua, C.violet, C.pink, C.yellow, C.red];

// One-hue light -> dark ramp for ordered classes (skill levels OJT -> L-4).
export const RAMP = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'];

// Reserved for state (target met / near / missed, closed / open). Never used as a plain series colour.
export const STATUS = { good: '#0ca30c', warn: '#fab219', bad: '#d03b3b', closed: '#0ca30c', open: '#d03b3b' };

export const INK = { primary: '#1d1d1f', secondary: '#4a4a55', muted: '#8a8a96', grid: '#e6e6ee' };

// Plan / target drawn as a line over bars; "everything else" segments; unfilled gauge track.
export const TARGET = INK.primary;
export const NEUTRAL = '#b5b4ae';
export const TRACK = '#cde2fb';

const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};

/** White or ink, whichever has more contrast on the given fill (for labels set inside a mark). */
export function onColor(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return INK.primary;
  const l = lum(hex);
  return 1.05 / (l + 0.05) >= (l + 0.05) / (lum(INK.primary) + 0.05) ? '#fff' : INK.primary;
}
