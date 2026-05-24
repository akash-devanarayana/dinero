"""SQLite persistence layer for Dinero.

All records are scoped to a `period` string in the form ``YYYY-MM`` so the app can
show one month at a time and navigate between months.
"""

import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dinero.db")

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
