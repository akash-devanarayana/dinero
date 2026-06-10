// ESLint flat config for the frontend .jsx sources.
//
// The app uses a window-globals module pattern (see CLAUDE.md): each file
// attaches its components to `window` and other files reference them as bare
// globals. Those shared names are declared below so `no-undef` still catches
// real typos.
import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

// Components/helpers shared across files via window.* assignment.
const appGlobals = Object.fromEntries([
  "React", "ReactDOM",
  // tweaks-panel.jsx
  "useTweaks", "TweaksPanel", "TweakSection", "TweakRow", "TweakSlider",
  "TweakToggle", "TweakRadio", "TweakSelect", "TweakText", "TweakNumber",
  "TweakColor", "TweakButton",
  // dinero-main.jsx
  "Pill", "SectionCard", "RowActions", "WeekStrip", "BillSection",
  "MetersSection", "LoansSection", "NotesSection", "SearchPalette",
  // dinero-modals.jsx (validation helpers shared with dinero-admin.jsx)
  "reqText", "numCheck",
  // dinero-sidebar.jsx / dinero-admin.jsx
  "Sidebar", "AdminSection",
].map((n) => [n, "readonly"]));

export default [
  js.configs.recommended,
  {
    files: ["*.js", "*.jsx"],
    plugins: { react, "react-hooks": reactHooks },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...appGlobals },
    },
    rules: {
      // mark variables used in JSX as used (core ESLint can't see JSX usage)
      "react/jsx-uses-vars": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "off", // store-driven effects re-run via subscribe()
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
      // files carry /* global React */ directives that overlap the config globals
      "no-redeclare": ["error", { builtinGlobals: false }],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  { ignores: ["dist/", "node_modules/", "backend/", "tests/"] },
];
