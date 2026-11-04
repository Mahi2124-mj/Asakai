import dispatch from './dispatch.js';
import store from './store.js';
import hr from './hr.js';
import { customerQuality, receivingQuality } from './quality.js';
import pressShop from './pressShop.js';
import loopPipe from './loopPipe.js';
import subAssy from './subAssy.js';
import seatSlider from './seatSlider.js';
import recliner from './recliner.js';
import thinRecliner from './thinRecliner.js';
import { maintenance, dieMaintenance, toolroom } from './maintenance.js';
import qualityCircle from './qualityCircle.js';
import { rng } from './_gen.js';

export const DASHBOARDS = [
  dispatch, store, hr, customerQuality, receivingQuality, pressShop, loopPipe, subAssy,
  seatSlider, recliner, thinRecliner, maintenance, dieMaintenance, toolroom, qualityCircle,
];

export const BY_KEY = Object.fromEntries(DASHBOARDS.map((d) => [d.key, d]));

/** Build demo data for a dashboard. Same filters -> same numbers. */
export function demoData(key, filters = {}) {
  const cfg = BY_KEY[key];
  if (!cfg) throw new Error(`Unknown dashboard: ${key}`);
  const active = Object.entries(filters).filter(([, v]) => v && v !== 'All').sort();
  return cfg.demo(filters, rng(`${key}|${JSON.stringify(active)}`));
}
