"""SQLite persistence layer for Dinero.

All records are scoped to a `period` string in the form ``YYYY-MM`` so the app can
show one month at a time and navigate between months.
"""

import os
import sqlite3
import sys


def _default_db_path():
    """Next to db.py in dev; a stable per-user dir when running as the frozen
    desktop app (the PyInstaller extraction dir is temporary)."""
    if getattr(sys, "frozen", False):
        base = os.path.join(
            os.environ.get("APPDATA") or os.path.expanduser("~"), "Dinero")
        os.makedirs(base, exist_ok=True)
        return os.path.join(base, "dinero.db")
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "dinero.db")


# Override with the DINERO_DB env var (used by tests to point at a temp DB).
DB_PATH = os.environ.get("DINERO_DB") or _default_db_path()

SCHEMA = """
CREATE TABLE IF NOT EXISTS bills (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    period          TEXT    NOT NULL,            -- 'YYYY-MM'
    category        TEXT    NOT NULL,            -- 'Card' | 'Utility' | 'Subscription'
    name            TEXT    NOT NULL,
    amount          REAL    NOT NULL DEFAULT 0,
    min_amount      REAL,                        -- cards only
    due_date        TEXT,                        -- 'YYYY-MM-DD'
    status          TEXT    NOT NULL DEFAULT 'due', -- 'paid' | 'due' | 'over' | 'na'
    payment_method  TEXT,
    paid_on         TEXT,                        -- 'YYYY-MM-DD'
    paid_amount     REAL,
    cadence         TEXT,                        -- subscriptions: monthly|quarterly|yearly
    sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS meters (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    period        TEXT    NOT NULL,
    name          TEXT    NOT NULL,
    unit          TEXT    NOT NULL DEFAULT 'kWh',
    reading       REAL    NOT NULL DEFAULT 0,
    reading_date  TEXT,
    note          TEXT,
    sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS loans (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    period      TEXT    NOT NULL,
    name        TEXT    NOT NULL,
    amount      REAL    NOT NULL DEFAULT 0,
    status      TEXT    NOT NULL DEFAULT 'ongoing', -- 'ongoing' | 'done'
    paid_on     TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0
);

-- Tracks months that exist even when they have no records yet (e.g. a freshly
-- created empty month). The month list is the union of this and the data tables.
CREATE TABLE IF NOT EXISTS months (
    period TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    period      TEXT    NOT NULL,
    body        TEXT    NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_notes_period ON notes(period);

-- Recurring loan plans: a fixed monthly installment over a tenure starting at
-- start_period. Installments for each covered month are generated on the fly.
CREATE TABLE IF NOT EXISTS loan_plans (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT    NOT NULL,
    total_amount        REAL    NOT NULL DEFAULT 0,
    tenure_months       INTEGER NOT NULL DEFAULT 1,
    monthly_installment REAL    NOT NULL DEFAULT 0,
    start_period        TEXT    NOT NULL,          -- 'YYYY-MM' of installment #1
    created_at          TEXT
);

-- One row per installment the user has marked paid (manual mark-paid).
CREATE TABLE IF NOT EXISTS loan_installment_payments (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id   INTEGER NOT NULL,
    period    TEXT    NOT NULL,
    paid_on   TEXT,
    UNIQUE(plan_id, period)
);

CREATE INDEX IF NOT EXISTS idx_bills_period  ON bills(period);
CREATE INDEX IF NOT EXISTS idx_meters_period ON meters(period);
CREATE INDEX IF NOT EXISTS idx_loans_period  ON loans(period);
"""


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_conn()
    try:
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    init_db()
    print(f"Initialized schema at {DB_PATH}")
