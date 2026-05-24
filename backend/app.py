"""Dinero backend — serves the static frontend and a small JSON REST API.

Run:  python backend/app.py
Then open http://localhost:5000/
"""

import calendar
import datetime
import os

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from db import get_conn, init_db

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__, static_folder=ROOT, static_url_path="")
CORS(app)

MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June",
               "July", "August", "September", "October", "November", "December"]


# ─── helpers ───────────────────────────────────────────────────────────────
def parse_period(period):
    y, m = period.split("-")
    return int(y), int(m)


def period_label(period):
    y, m = parse_period(period)
    return f"{MONTH_NAMES[m]} {y}"


def prev_period(period):
    y, m = parse_period(period)
    return f"{y - 1}-12" if m == 1 else f"{y}-{m - 1:02d}"


def next_period(period):
    y, m = parse_period(period)
    return f"{y + 1}-01" if m == 12 else f"{y}-{m + 1:02d}"


def all_periods(conn):
    rows = conn.execute(
        """SELECT period FROM bills
           UNION SELECT period FROM meters
           UNION SELECT period FROM loans
           UNION SELECT period FROM months
           ORDER BY period"""
    ).fetchall()
    return [r["period"] for r in rows]


def current_period():
    t = datetime.date.today()
    return f"{t.year}-{t.month:02d}"


def anchor_today(period):
    """Reference date for the displayed month: real today if it's the current
    month, otherwise the first of that month (so the week strip makes sense)."""
    if period == current_period():
        return datetime.date.today().isoformat()
    y, m = parse_period(period)
    return datetime.date(y, m, 1).isoformat()


def bill_to_json(r):
    return {
        "id": r["id"], "cat": r["category"], "name": r["name"],
        "amount": r["amount"], "min": r["min_amount"], "due": r["due_date"],
        "status": r["status"], "paidVia": r["payment_method"],
        "paidOn": r["paid_on"], "paidAmt": r["paid_amount"], "cadence": r["cadence"],
    }


def meter_to_json(r, prev_reading):
    prev = prev_reading if prev_reading is not None else r["reading"]
    return {
        "id": r["id"], "name": r["name"], "unit": r["unit"],
        "last": r["reading"], "prev": prev, "note": r["note"],
    }


def loan_to_json(r):
    return {"id": r["id"], "name": r["name"], "amount": r["amount"], "status": r["status"]}


def note_to_json(r):
    return {"id": r["id"], "body": r["body"]}


def next_order(conn, table, period):
    row = conn.execute(
        f"SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM {table} WHERE period = ?",
        (period,),
    ).fetchone()
    return row["n"]


# ─── static frontend ────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(ROOT, "Dinero.html")


# ─── month listing & navigation ──────────────────────────────────────────────
@app.route("/api/months")
def list_months():
    conn = get_conn()
    try:
        periods = all_periods(conn)
    finally:
        conn.close()
    cur = current_period()
    default = cur if cur in periods else (periods[-1] if periods else cur)
    return jsonify({
        "months": [{"period": p, "label": period_label(p)} for p in periods],
        "current": default,
    })


@app.route("/api/months/next", methods=["POST"])
def create_next_month():
    """Create the (empty) month following the latest existing month."""
    conn = get_conn()
    try:
        periods = all_periods(conn)
        latest = periods[-1] if periods else current_period()
        new_period = next_period(latest)
        conn.execute("INSERT OR IGNORE INTO months (period) VALUES (?)", (new_period,))
        conn.commit()
        periods = all_periods(conn)
    finally:
        conn.close()
    return jsonify({
        "period": new_period,
        "label": period_label(new_period),
        "months": [{"period": p, "label": period_label(p)} for p in periods],
    }), 201


@app.route("/api/month/<period>")
def get_month(period):
    conn = get_conn()
    try:
        bills = conn.execute(
            "SELECT * FROM bills WHERE period = ? ORDER BY category, sort_order", (period,)
        ).fetchall()
        meters = conn.execute(
            "SELECT * FROM meters WHERE period = ? ORDER BY sort_order", (period,)
        ).fetchall()
        loans = conn.execute(
            "SELECT * FROM loans WHERE period = ? ORDER BY sort_order", (period,)
        ).fetchall()
        notes = conn.execute(
            "SELECT * FROM notes WHERE period = ? ORDER BY sort_order, id", (period,)
        ).fetchall()
        prev = prev_period(period)
        prev_readings = {
            r["name"]: r["reading"]
            for r in conn.execute("SELECT name, reading FROM meters WHERE period = ?", (prev,))
        }
    finally:
        conn.close()

    y, m = parse_period(period)
    return jsonify({
        "period": period,
        "label": period_label(period),
        "monthName": MONTH_NAMES[m],
        "year": y,
        "today": anchor_today(period),
        "items": [bill_to_json(r) for r in bills],
        "meters": [meter_to_json(r, prev_readings.get(r["name"])) for r in meters],
        "loans": [loan_to_json(r) for r in loans],
        "notes": [note_to_json(r) for r in notes],
    })


# ─── search across all months ────────────────────────────────────────────────
SEARCH_LIMIT = 60
_STATUS_HAY = {"paid": "paid", "due": "due", "over": "overdue", "na": "n/a"}
_KIND_FOR = {"Card": "card", "Utility": "utility", "Subscription": "subscription"}


def short_label(period):
    y, m = parse_period(period)
    return f"{MONTH_NAMES[m][:3]} {y % 100:02d}"


@app.route("/api/search")
def search():
    q = (request.args.get("q") or "").strip().lower()
    if not q:
        return jsonify({"results": [], "total": 0})
    conn = get_conn()
    try:
        readings = {(r["period"], r["name"]): r["reading"]
                    for r in conn.execute("SELECT period, name, reading FROM meters")}
        results = []

        for r in conn.execute("SELECT * FROM bills"):
            hay = " ".join([r["name"] or "", r["category"] or "", _STATUS_HAY.get(r["status"], ""),
                            r["payment_method"] or "", str(r["amount"])]).lower()
            if q in hay:
                results.append({"type": r["category"], "kind": _KIND_FOR.get(r["category"], "card"),
                                "period": r["period"], "monthLabel": short_label(r["period"]),
                                "record": bill_to_json(r)})
        for r in conn.execute("SELECT * FROM loans"):
            hay = " ".join([r["name"] or "", "loan", r["status"] or "", str(r["amount"])]).lower()
            if q in hay:
                results.append({"type": "Loan", "kind": "loan",
                                "period": r["period"], "monthLabel": short_label(r["period"]),
                                "record": loan_to_json(r)})
        for r in conn.execute("SELECT * FROM meters"):
            hay = " ".join([r["name"] or "", "meter", str(r["reading"])]).lower()
            if q in hay:
                prev = readings.get((prev_period(r["period"]), r["name"]))
                results.append({"type": "Meter", "kind": "meter",
                                "period": r["period"], "monthLabel": short_label(r["period"]),
                                "record": meter_to_json(r, prev)})
        for r in conn.execute("SELECT * FROM notes"):
            if q in (r["body"] or "").lower():
                results.append({"type": "Note", "kind": "note",
                                "period": r["period"], "monthLabel": short_label(r["period"]),
                                "record": note_to_json(r)})
    finally:
        conn.close()

    results.sort(key=lambda x: x["period"], reverse=True)  # most recent first
    return jsonify({"results": results[:SEARCH_LIMIT], "total": len(results)})


# ─── bills CRUD ───────────────────────────────────────────────────────────────
def _bill_fields(data):
    return (
        data.get("cat") or data.get("category"),
        (data.get("name") or "").strip(),
        float(data.get("amount") or 0),
        _opt_float(data.get("min")),
        data.get("due") or None,
        data.get("status") or "due",
        data.get("paidVia") or data.get("payment_method") or None,
        data.get("paidOn") or None,
        _opt_float(data.get("paidAmt")),
        data.get("cadence") or None,
    )


def _opt_float(v):
    if v in (None, "", "—"):
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


@app.route("/api/bills", methods=["POST"])
def create_bill():
    data = request.get_json(force=True)
    period = data.get("period") or current_period()
    fields = _bill_fields(data)
    conn = get_conn()
    try:
        order = next_order(conn, "bills", period)
        cur = conn.execute(
            """INSERT INTO bills (period, category, name, amount, min_amount, due_date,
                status, payment_method, paid_on, paid_amount, cadence, sort_order)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (period, *fields, order),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM bills WHERE id = ?", (cur.lastrowid,)).fetchone()
    finally:
        conn.close()
    return jsonify(bill_to_json(row)), 201


@app.route("/api/bills/<int:bill_id>", methods=["PUT"])
def update_bill(bill_id):
    data = request.get_json(force=True)
    fields = _bill_fields(data)
    conn = get_conn()
    try:
        conn.execute(
            """UPDATE bills SET category=?, name=?, amount=?, min_amount=?, due_date=?,
                status=?, payment_method=?, paid_on=?, paid_amount=?, cadence=? WHERE id=?""",
            (*fields, bill_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM bills WHERE id = ?", (bill_id,)).fetchone()
    finally:
        conn.close()
    if not row:
        return jsonify({"error": "not found"}), 404
    return jsonify(bill_to_json(row))


@app.route("/api/bills/<int:bill_id>/mark-paid", methods=["POST"])
def mark_bill_paid(bill_id):
    conn = get_conn()
    try:
        conn.execute(
            "UPDATE bills SET status='paid', paid_on=? WHERE id=?",
            (datetime.date.today().isoformat(), bill_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM bills WHERE id = ?", (bill_id,)).fetchone()
    finally:
        conn.close()
    if not row:
        return jsonify({"error": "not found"}), 404
    return jsonify(bill_to_json(row))


@app.route("/api/bills/<int:bill_id>", methods=["DELETE"])
def delete_bill(bill_id):
    conn = get_conn()
    try:
        conn.execute("DELETE FROM bills WHERE id = ?", (bill_id,))
        conn.commit()
    finally:
        conn.close()
    return jsonify({"ok": True})


# ─── meters CRUD ──────────────────────────────────────────────────────────────
@app.route("/api/meters", methods=["POST"])
def create_meter():
    data = request.get_json(force=True)
    period = data.get("period") or current_period()
    name = (data.get("name") or data.get("kind") or "").strip()
    unit = data.get("unit") or ("m³" if name.lower() == "water" else "kWh")
    reading = float(data.get("reading") or data.get("last") or 0)
    conn = get_conn()
    try:
        order = next_order(conn, "meters", period)
        cur = conn.execute(
            "INSERT INTO meters (period, name, unit, reading, reading_date, note, sort_order) VALUES (?,?,?,?,?,?,?)",
            (period, name, unit, reading, data.get("date") or None, data.get("note") or None, order),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM meters WHERE id = ?", (cur.lastrowid,)).fetchone()
        prev = conn.execute(
            "SELECT reading FROM meters WHERE period=? AND name=?", (prev_period(period), name)
        ).fetchone()
    finally:
        conn.close()
    return jsonify(meter_to_json(row, prev["reading"] if prev else None)), 201


@app.route("/api/meters/<int:meter_id>", methods=["PUT"])
def update_meter(meter_id):
    data = request.get_json(force=True)
    name = (data.get("name") or data.get("kind") or "").strip()
    unit = data.get("unit") or ("m³" if name.lower() == "water" else "kWh")
    reading = float(data.get("reading") or data.get("last") or 0)
    conn = get_conn()
    try:
        conn.execute(
            "UPDATE meters SET name=?, unit=?, reading=?, reading_date=?, note=? WHERE id=?",
            (name, unit, reading, data.get("date") or None, data.get("note") or None, meter_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM meters WHERE id = ?", (meter_id,)).fetchone()
        prev = conn.execute(
            "SELECT reading FROM meters WHERE period=? AND name=?", (prev_period(row["period"]), name)
        ).fetchone() if row else None
    finally:
        conn.close()
    if not row:
        return jsonify({"error": "not found"}), 404
    return jsonify(meter_to_json(row, prev["reading"] if prev else None))


@app.route("/api/meters/<int:meter_id>", methods=["DELETE"])
def delete_meter(meter_id):
    conn = get_conn()
    try:
        conn.execute("DELETE FROM meters WHERE id = ?", (meter_id,))
        conn.commit()
    finally:
        conn.close()
    return jsonify({"ok": True})


# ─── loans CRUD ───────────────────────────────────────────────────────────────
@app.route("/api/loans", methods=["POST"])
def create_loan():
    data = request.get_json(force=True)
    period = data.get("period") or current_period()
    conn = get_conn()
    try:
        order = next_order(conn, "loans", period)
        cur = conn.execute(
            "INSERT INTO loans (period, name, amount, status, paid_on, sort_order) VALUES (?,?,?,?,?,?)",
            (period, (data.get("name") or "").strip(), float(data.get("amount") or 0),
             data.get("status") or "ongoing", data.get("paidOn") or None, order),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM loans WHERE id = ?", (cur.lastrowid,)).fetchone()
    finally:
        conn.close()
    return jsonify(loan_to_json(row)), 201


@app.route("/api/loans/<int:loan_id>", methods=["PUT"])
def update_loan(loan_id):
    data = request.get_json(force=True)
    conn = get_conn()
    try:
        conn.execute(
            "UPDATE loans SET name=?, amount=?, status=?, paid_on=? WHERE id=?",
            ((data.get("name") or "").strip(), float(data.get("amount") or 0),
             data.get("status") or "ongoing", data.get("paidOn") or None, loan_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM loans WHERE id = ?", (loan_id,)).fetchone()
    finally:
        conn.close()
    if not row:
        return jsonify({"error": "not found"}), 404
    return jsonify(loan_to_json(row))


@app.route("/api/loans/<int:loan_id>", methods=["DELETE"])
def delete_loan(loan_id):
    conn = get_conn()
    try:
        conn.execute("DELETE FROM loans WHERE id = ?", (loan_id,))
        conn.commit()
    finally:
        conn.close()
    return jsonify({"ok": True})


# ─── notes CRUD ───────────────────────────────────────────────────────────────
@app.route("/api/notes", methods=["POST"])
def create_note():
    data = request.get_json(force=True)
    period = data.get("period") or current_period()
    body = (data.get("body") or "").strip()
    conn = get_conn()
    try:
        order = next_order(conn, "notes", period)
        cur = conn.execute(
            "INSERT INTO notes (period, body, sort_order) VALUES (?,?,?)",
            (period, body, order),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM notes WHERE id = ?", (cur.lastrowid,)).fetchone()
    finally:
        conn.close()
    return jsonify(note_to_json(row)), 201


@app.route("/api/notes/<int:note_id>", methods=["PUT"])
def update_note(note_id):
    data = request.get_json(force=True)
    body = (data.get("body") or "").strip()
    conn = get_conn()
    try:
        conn.execute("UPDATE notes SET body = ? WHERE id = ?", (body, note_id))
        conn.commit()
        row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    finally:
        conn.close()
    if not row:
        return jsonify({"error": "not found"}), 404
    return jsonify(note_to_json(row))


@app.route("/api/notes/<int:note_id>", methods=["DELETE"])
def delete_note(note_id):
    conn = get_conn()
    try:
        conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        conn.commit()
    finally:
        conn.close()
    return jsonify({"ok": True})


if __name__ == "__main__":
    init_db()
    app.run(host="127.0.0.1", port=5000, debug=True)
