# Dinero — project conventions

Personal expense tracker. Flask + SQLite backend, React frontend bundled with
esbuild. Single user, personal financial data — the DB and source spreadsheet
are gitignored and must never be committed (CI's `guard` job enforces this).

## Architecture in one paragraph

The backend ([backend/app.py](backend/app.py)) serves the static frontend and a
JSON API; all records are scoped to a `period` string (`YYYY-MM`) and the UI
shows one month at a time. The frontend is plain React without a framework or
router: `.jsx` files at the repo root, bundled by esbuild into `dist/dinero.js`
(React included — no CDN). State lives in the `window.DINERO` store
([data.jsx](data.jsx)), which fetches a month from the API and notifies the
React root to re-render.

## Frontend module pattern (important, non-obvious)

- **Modules communicate through `window` globals, not imports/exports.** Each
  file attaches its components at the bottom (`window.Sidebar = Sidebar`,
  `Object.assign(window, {...})`) and references other files' components as
  bare globals, which resolve via `window` at runtime.
- **Import order in [dinero-entry.js](dinero-entry.js) is load-bearing.** It
  mirrors the original `<script>` sequence; `react-globals.js` must stay first
  so `window.React` exists before any module's top-level
  `const { useState } = React` runs. Add new files to the entry in dependency
  order.
- **Per-file React alias suffixes** avoid collisions in editors and keep
  provenance obvious: `useStateS`/`IconS` (sidebar), `useStateF`/`IconF`
  (filter), `useStateA`/`IconA` (app), `IconN` (main), `useEffectM` (motion).
  Follow the pattern when adding a file.
- Icons are inline SVGs in [dinero-icons.jsx](dinero-icons.jsx); add new ones
  there rather than importing icon libraries.

## Styling

- All styling lives in `dinero.css` using the design tokens defined in
  `:root` (surfaces, ink scale, status colors, spacing/radius scales, fonts).
  Never hardcode a color that has a token; dark mode works by re-declaring the
  tokens under `[data-theme="dark"]`.
- Status values are a fixed enum: `paid | due | over | na` — CSS classes,
  pills, pips, and stripes all key off these strings.
- The motion system (end of the CSS) derives every duration from `--mo-d` and
  `--mo-st`, is gated behind `[data-motion="on"]` **and**
  `prefers-reduced-motion`, and animates FROM hidden TO natural state
  (keyframes define only the `from`). New animations must follow all three
  rules.

## Dev workflow

```bash
npm install && npm run watch      # rebuild dist/dinero.js on save
python backend/app.py             # serves app + API on :5000 (honors PORT)
pytest -q                         # backend tests (isolated temp DB)
```

The bundle is gitignored — a fresh clone needs `npm run build` before the page
works. The tweaks panel (bottom-right in dev) toggles sections, motion, theme
accents, and preview modals without touching data.

## Git / CI conventions

- Feature branch → PR → wait for CI (backend ruff+pytest, frontend build,
  data-file guard) → merge commit. No direct pushes to `main`.
- Ruff in CI checks only real errors (`E9,F63,F7,F82`); the wider default
  ruleset has known pre-existing complaints in `import_excel.py`.
- Commit messages: imperative subject, body explains the why.
