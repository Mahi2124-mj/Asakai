// Writes the app's demo data to backend/asakai/demo_data.json so the asakai server
// serves exactly the same shapes the app renders.  Run: npm run export-demo
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DASHBOARDS, demoData } from '../src/dashboards/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../../backend/asakai/demo_data.json');
// `filters` = the dashboard's slicer keys; the server accepts only these as query filters.
const payload = Object.fromEntries(DASHBOARDS.map((d) => [d.key, { title: d.title, filters: d.slicers.map((s) => s.key), data: demoData(d.key, {}) }]));
writeFileSync(out, JSON.stringify(payload, null, 1));
console.log(`Wrote ${Object.keys(payload).length} dashboards -> ${out}`);
