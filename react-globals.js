// Provides the React globals the app scripts expect (formerly CDN UMD
// scripts). Must be the first import in dinero-entry.js so the globals exist
// before any app module's top-level `const {...} = React` runs. esbuild picks
// React's production build when minifying and the development build under
// `npm run watch`.
import React from "react";
import { createRoot } from "react-dom/client";

window.React = React;
window.ReactDOM = { createRoot };
