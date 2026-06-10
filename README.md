# Dinero

[![CI](https://github.com/akash-devanarayana/dinero/actions/workflows/ci.yml/badge.svg)](https://github.com/akash-devanarayana/dinero/actions/workflows/ci.yml)

A personal monthly expense tracker — cards, utilities, subscriptions, meter
readings, loans, and notes — with a Flask + SQLite backend and a React frontend
(JSX pre-bundled with esbuild).

## Run

```bash
npm install && npm run build      # bundle the frontend (dist/dinero.js)
pip install -r backend/requirements.txt
python backend/import_excel.py    # one-time: seed history from your Excel workbook
python backend/app.py             # serves the app + API at http://localhost:5000
```

Then open <http://localhost:5000>. While working on the frontend, run
`npm run watch` to rebuild the bundle on every save.

## Desktop app

```bash
pip install -r requirements-desktop.txt
npm run app                       # builds dist-app/Dinero.exe (PyInstaller)
```

`Dinero.exe` opens the app in a native window (Edge WebView2) with the
backend embedded — no browser or terminal. The frozen app keeps its database
in `%APPDATA%\Dinero\dinero.db`, separate from the dev DB. For development,
`python backend/desktop.py` runs the same window against the repo files.

> The source spreadsheet and the SQLite database are gitignored (they hold
> personal data), so a fresh clone starts empty — supply your own
> `2024-2025-2026 _ Monthly Expenses.xlsx` and run the importer, or just add
> records in the UI.

## Features

- Month-scoped **cards, utilities, subscriptions, meters, loans, notes**
- **Create next month**, **⌘K search** across all months, **category + status** filters
- **Dark mode**, **recurring loan plans** managed from an admin section
- Excel importer for historical months; 6-month spend trend

## Tests

```bash
pytest -q
```

CI (GitHub Actions) runs the tests, a Python lint, a frontend bundle build, and
a data-file guard on every pull request.

## Layout

| Path | What |
| --- | --- |
| `backend/` | Flask API, SQLite schema (`db.py`), Excel importer |
| `Dinero.html`, `*.jsx`, `styles/*.css` | Frontend (bundled to `dist/dinero.{js,css}` by esbuild) |
| `tests/` | Backend tests run in CI |
| `.github/workflows/ci.yml` | CI pipeline |
