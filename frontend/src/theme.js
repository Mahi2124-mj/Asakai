// Power BI–style palette used by the existing e-Asakai reports.
export const C = {
  blue: '#118DFF',
  navy: '#12239E',
  orange: '#E66C37',
  purple: '#6B007B',
  pink: '#E044A7',
  violet: '#744EC2',
  yellow: '#D9B300',
  red: '#D64550',
  teal: '#197278',
  green: '#1AAB40',
  cyan: '#15C6F4',
  sky: '#4FC3F7',
  gray: '#B3B3B3',
};

// Categorical order (fixed, never cycled).
export const SERIES = [C.blue, C.navy, C.orange, C.purple, C.pink, C.violet, C.yellow, C.red, C.teal, C.green, C.cyan];

// Status colors for achievement bars (>= target / near / below).
export const STATUS = { good: '#2FD34F', warn: '#F2E52B', bad: '#E8302F', closed: '#2FD34F', open: '#E8302F' };

export const INK = { primary: '#1d1d1f', secondary: '#4a4a55', muted: '#8a8a96', grid: '#e6e6ee' };
