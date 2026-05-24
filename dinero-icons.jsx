// Inline SVG icon set — minimal stroke, 16x16
const Icon = {
  Plus: (props) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 3v10M3 8h10" />
    </svg>
  ),
  Check: (props) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 8.5 L6.5 12 L13 5" />
    </svg>
  ),
  Pencil: (props) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M11.5 2.5 L13.5 4.5 L5 13 L2 14 L3 11 Z" />
      <path d="M10 4 L12 6" />
    </svg>
  ),
  More: (props) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...props}>
      <circle cx="3.5" cy="8" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  ),
  ChevLeft: (props) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 3 L5 8 L10 13" />
    </svg>
  ),
  ChevRight: (props) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 3 L11 8 L6 13" />
    </svg>
  ),
  X: (props) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...props}>
      <path d="M4 4 L12 12 M12 4 L4 12" />
    </svg>
  ),
  Card: (props) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="4" width="12" height="9" rx="1.5" />
      <path d="M2 7 L14 7" />
    </svg>
  ),
  Bolt: (props) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 2 L4 9 L7.5 9 L7 14 L12 7 L8.5 7 Z" />
    </svg>
  ),
  Loop: (props) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 8 a5 5 0 0 1 8.5 -3.5 L13 6 M5 9.5 L3 11 a5 5 0 0 0 8.5 -1" />
    </svg>
  ),
  Gauge: (props) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2.5 12 a5.5 5.5 0 1 1 11 0" />
      <path d="M8 12 L11 6" />
    </svg>
  ),
  Bank: (props) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 7 L8 3 L14 7 Z" />
      <path d="M3.5 7 L3.5 12 M6 7 L6 12 M10 7 L10 12 M12.5 7 L12.5 12 M2 13 L14 13" />
    </svg>
  ),
  Search: (props) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="7" cy="7" r="4" />
      <path d="M10 10 L13 13" />
    </svg>
  ),
  Settings: (props) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1.5 V3 M8 13 V14.5 M1.5 8 H3 M13 8 H14.5 M3.5 3.5 L4.5 4.5 M11.5 11.5 L12.5 12.5 M3.5 12.5 L4.5 11.5 M11.5 4.5 L12.5 3.5" />
    </svg>
  ),
  Sun: (props) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5 V3 M8 13 V14.5 M1.5 8 H3 M13 8 H14.5 M3.4 3.4 L4.4 4.4 M11.6 11.6 L12.6 12.6 M3.4 12.6 L4.4 11.6 M11.6 4.4 L12.6 3.4" />
    </svg>
  ),
  Moon: (props) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M13 9.6 A5.5 5.5 0 1 1 6.4 3 A4.3 4.3 0 0 0 13 9.6 Z" />
    </svg>
  ),
};

window.Icon = Icon;
