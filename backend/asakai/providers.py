"""Live-data providers (see dashboards.provider). Imported by main.py so they register.

maintenance -- Maintenance Asakai, ported from the MES Asakai page
(Maintenance_DX/Phase2/routers/asakai.py) so both show the same numbers:
  * ANDON: only Maintenance calls (department ILIKE 'maint%') of that shift_date, closed
    (andon_history) + still open (andon_system).
  * Breakdown: manual slips + auto slips filled to COMPLETED, day = COALESCE(slip_date, bd_start_date);
    frequency = SUM(COALESCE(frequency, 1)), hours = SUM(mc_down_time_minutes) / 60.
  * Not filled: closed Maintenance calls of the day with no row in andon_remarks_history.
Zone / Line narrow everything; Machine No. narrows the breakdown part (ANDON calls have no machine).
"""
from datetime import date, datetime, timedelta

from . import maint
from .dashboards import provider

BD_COLS = ("slip_date, bd_start_date, category, zone, line, machine_no, machine_name, "
           "problem_observed_by_maintenance, problem_reported_by_production, action_taken_on_problem, "
           "bd_start_time, bd_ok_time, mc_down_time_minutes, bd_attended_by, frequency")
BD_SRC = f"""(
    SELECT {BD_COLS}, 'manual'::text AS bd_source FROM maintenance_breakdown_data
    UNION ALL
    SELECT {BD_COLS}, 'auto'::text FROM maintenance_auto_breakdown_slip
     WHERE COALESCE(prod_stage, 'PENDING_MAINTENANCE') = 'COMPLETED'
) AS bd"""
MAINT_DEPT = "COALESCE(dp.name, {a}.display_name, '') ILIKE 'maint%%'"

_remarks_link: bool | None = None  # does andon_remarks_history have andon_history_id? (checked once)


def _day(value: str | None) -> date:
    """ISO date (as the page sends it) or dd-mm-yy; empty = yesterday."""
    if not value:
        return date.today() - timedelta(days=1)
    for fmt in ("%Y-%m-%d", "%d-%m-%y", "%d-%m-%Y"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            pass
    raise LookupError(f"Bad date '{value}'")


def _where(f: dict, alias: str, machine: bool) -> tuple[str, list]:
    conds, args = [], []
    for key, col in (("zone", "zone"), ("line", "line")) + ((("machine", "machine_no"),) if machine else ()):
        if f.get(key):
            conds.append(f"lower(TRIM({alias}{col})) = lower(%s)")
            args.append(f[key].strip())
    return "".join(f" AND {c}" for c in conds), args


def _hhmm(v):
    t = str(v or "")
    return t[:5] if t else None


def _num(v, nd=1):
    try:
        return None if v is None else round(float(v), nd)
    except (TypeError, ValueError):
        return None


@provider("maintenance")
def maintenance(filters: dict):
    if not maint.available():
        return None  # fall back to snapshot / demo
    global _remarks_link
    d = _day(filters.get("date"))
    nxt = d + timedelta(days=1)
    with maint.cursor() as cur:
        h_and, h_args = _where(filters, "h.", machine=False)
        s_and, s_args = _where(filters, "s.", machine=False)
        cur.execute(f"""
            SELECT zone, line, COUNT(*) AS n FROM (
              SELECT TRIM(h.zone) AS zone, TRIM(h.line) AS line
                FROM andon_history h LEFT JOIN andon_departments dp ON dp.id = h.department_id
               WHERE h.shift_date = %s AND {MAINT_DEPT.format(a='h')}{h_and}
              UNION ALL
              SELECT TRIM(s.zone), TRIM(s.line)
                FROM andon_system s LEFT JOIN andon_departments dp ON dp.id = s.department_id
               WHERE s.shift_date = %s AND {MAINT_DEPT.format(a='s')}{s_and}
            ) t GROUP BY 1, 2""", [d, *h_args, d, *s_args])
        andon = [{"zone": r["zone"] or "—", "line": r["line"] or "—", "calls": int(r["n"])} for r in cur.fetchall()]

        if _remarks_link is None:
            cur.execute("""SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
                            AND table_name = 'andon_remarks_history' AND column_name = 'andon_history_id'""")
            _remarks_link = cur.fetchone() is not None
        nf_rows = None
        if _remarks_link:
            cur.execute(f"""
                SELECT TRIM(h.zone) AS zone, TRIM(h.line) AS line, COUNT(*) AS n
                  FROM andon_history h LEFT JOIN andon_departments dp ON dp.id = h.department_id
                 WHERE h.shift_date = %s AND {MAINT_DEPT.format(a='h')}{h_and}
                   AND NOT EXISTS (SELECT 1 FROM andon_remarks_history r WHERE r.andon_history_id = h.id)
                 GROUP BY 1, 2""", [d, *h_args])
            nf_rows = cur.fetchall()

        b_and, b_args = _where(filters, "", machine=True)
        day_sql = "COALESCE(slip_date, bd_start_date) >= %s AND COALESCE(slip_date, bd_start_date) < %s"
        cur.execute(f"""
            SELECT TRIM(zone) AS zone, TRIM(line) AS line,
                   COALESCE(SUM(COALESCE(frequency, 1)), 0) AS freq, COALESCE(SUM(mc_down_time_minutes), 0) AS mins
              FROM {BD_SRC} WHERE {day_sql}{b_and} GROUP BY 1, 2""", [d, nxt, *b_args])
        bd = [{"zone": r["zone"] or "—", "line": r["line"] or "—", "frequency": int(r["freq"] or 0),
               "minutes": int(round(float(r["mins"] or 0))), "hours": _num(float(r["mins"] or 0) / 60.0, 2)}
              for r in cur.fetchall()]

        cur.execute(f"""
            SELECT COALESCE(slip_date, bd_start_date) AS day, category, zone, line, machine_no, machine_name,
                   problem_observed_by_maintenance, problem_reported_by_production, action_taken_on_problem,
                   bd_start_time, bd_ok_time, mc_down_time_minutes, bd_attended_by,
                   COALESCE(frequency, 1) AS frequency, bd_source
              FROM {BD_SRC} WHERE {day_sql}{b_and}
             ORDER BY COALESCE(NULLIF(TRIM(category), ''), 'zzz'), bd_start_time NULLS LAST, zone, line""",
                    [d, nxt, *b_args])
        rows = cur.fetchall()

    # Same response as MES GET /api/asakai/overview, so the ported page reads it unchanged.
    out = [{"slip_date": r["day"].isoformat() if r["day"] else None,
            "category": (r["category"] or "").strip() or "Uncategorised",
            "zone": r["zone"], "line": r["line"], "machine_no": r["machine_no"], "machine_name": r["machine_name"],
            "problem": r["problem_observed_by_maintenance"] or r["problem_reported_by_production"],
            "action": r["action_taken_on_problem"],
            "start": _hhmm(r["bd_start_time"]), "end": _hhmm(r["bd_ok_time"]),
            "minutes": _num(r["mc_down_time_minutes"], 0), "attended_by": r["bd_attended_by"],
            "frequency": int(r["frequency"] or 1), "slip": "Auto" if r["bd_source"] == "auto" else "Manual"}
           for r in rows]
    return {"date": d.isoformat(),
            "andon_by_line": sorted(andon, key=lambda x: -x["calls"]),
            "bd_by_line": sorted(bd, key=lambda x: (-x["frequency"], -x["minutes"])),
            "totals": {"andon_calls": sum(x["calls"] for x in andon),
                       "breakdowns": sum(x["frequency"] for x in bd),
                       "bd_minutes": sum(x["minutes"] for x in bd)},
            "rows": out,
            "not_filled": _not_filled(nf_rows)}


def _not_filled(rows):
    """Zone totals, each with its lines, largest first. None when remarks can't be linked."""
    if rows is None:
        return None
    z = {}
    for r in rows:
        a = z.setdefault(r["zone"] or "—", {"zone": r["zone"] or "—", "total": 0, "lines": []})
        a["total"] += int(r["n"])
        a["lines"].append({"line": r["line"] or "—", "n": int(r["n"])})
    zones = sorted(z.values(), key=lambda x: (-x["total"], x["zone"]))
    for a in zones:
        a["lines"].sort(key=lambda x: (-x["n"], x["line"]))
    return {"total": sum(a["total"] for a in zones), "by_zone": zones}
