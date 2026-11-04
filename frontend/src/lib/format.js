const trimK = (n, dp) => {
  const s = n.toFixed(dp);
  return s;
};

export function fmt(v, f) {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'string') return v;
  if (typeof v !== 'number' || Number.isNaN(v)) return String(v);
  const a = Math.abs(v);
  switch (f) {
    case 'k': {
      if (a >= 1e6) return `${trimK(v / 1e6, 1)}M`;
      if (a >= 10000) return `${Math.round(v / 1000)}K`;
      if (a >= 100) return `${trimK(v / 1000, 1)}K`;
      return String(Math.round(v * 10) / 10);
    }
    case 'k0': return a >= 1e6 ? `${trimK(v / 1e6, 1)}M` : `${Math.round(v / 1000)}K`;
    case 'k1': return a >= 1e6 ? `${trimK(v / 1e6, 1)}M` : `${trimK(v / 1000, 1)}K`;
    case 'k2': return a >= 1e6 ? `${trimK(v / 1e6, 2)}M` : `${trimK(v / 1000, 2)}K`;
    case 'k3': return `${trimK(v / 1000, 3)}K`;
    case 'pct': case 'pct2': return `${v.toFixed(2)}%`;
    case 'pct0': return `${Math.round(v)}%`;
    case 'pct1': return `${v.toFixed(1)}%`;
    case 'dec1': return v.toFixed(1);
    case 'dec2': return v.toFixed(2);
    case 'dec3': return v.toFixed(3);
    case 'num': return v.toLocaleString('en-IN');
    default: return Number.isInteger(v) ? v.toLocaleString('en-IN') : v.toFixed(2);
  }
}

export const axisFmt = (f) => (v) => {
  if (f === 'pct0' || f === 'pct') return `${Math.round(v)}%`;
  if (f === 'k' || f?.startsWith('k')) {
    const a = Math.abs(v);
    if (a >= 1e6) return `${+(v / 1e6).toFixed(1)}M`;
    if (a >= 1000) return `${+(v / 1000).toFixed(0)}K`;
    return a === 0 ? '0K' : String(v);
  }
  return fmt(v, 'num');
};
