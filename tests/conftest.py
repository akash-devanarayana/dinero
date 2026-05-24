"""Shared test setup: point the app at a throwaway DB and make `backend/` importable.

This runs before any test module is imported, so `db.DB_PATH` resolves to the
temp database rather than the real `backend/dinero.db`.
"""
import os
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))

_TEST_DB = os.path.join(tempfile.gettempdir(), "dinero_test.db")
os.environ["DINERO_DB"] = _TEST_DB
if os.path.exists(_TEST_DB):
    os.remove(_TEST_DB)
