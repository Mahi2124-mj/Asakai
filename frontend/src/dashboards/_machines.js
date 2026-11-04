// Demo machine master, same row shape as GET /api/masters/machines:
// [zone_name, line_name, machine_no, machine_name]. Used when no server or no maintenance DB.
// Pure JS (no DOM) so the backend export script can import it.

const ZONE_LINES = {
  'PRESS SHOP': ['PRESS_1', 'PRESS_2', 'PRESS_3'],
  'LOOP PIPE': ['LOOP_PIPE_1', 'LOOP_PIPE_2', 'LOOP_PIPE_3'],
  SUB_ASSEMBLY: ['SA_4W_YHB', 'SA_4W_YNC', 'SA_4W_YSD', 'SA_6W_YNC', 'SA_6W_YRA'],
  SEAT_SLIDER: ['YHB_SS', 'YNC_SS', 'YRA_SS'],
  RECLINER: ['YHB_RC', 'YMC_RC', 'YRA_RC'],
  'THIN RECLINER': ['T_REC_01', 'T_REC_02'],
};
const NAMES = ['Spot welding', 'MAG welding robot', 'Riveting press', 'Final inspection'];

export const DEMO_ZONES = Object.keys(ZONE_LINES);

export const DEMO_MACHINES = Object.entries(ZONE_LINES).flatMap(([zone, lines]) => lines.flatMap((line) => (
  NAMES.map((name, i) => [zone, line, `${line}_M${String(i + 1).padStart(2, '0')}`, name])
)));

/** Master rows matching the Zone / Line / Machine slicers (an unset slicer matches everything). */
export const matchMachines = (rows, f = {}) => rows.filter((m) => (
  (!f.zone || m[0] === f.zone) && (!f.line || m[1] === f.line) && (!f.machine || m[2] === f.machine)
));
