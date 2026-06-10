/* global React */
// ─── Motion helpers ─────────────────────────────────────
// CountUp: animates a number from 40% of target to its final value
// with an ease-out cubic curve. Respects the app's data-motion
// attribute and prefers-reduced-motion.

const { useEffect: useEffectM, useRef: useRefM, useState: useStateM } = React;

function CountUp({ value, format, duration = 900 }) {
  const fmt = format || ((n) => n.toLocaleString("en-LK"));
  const [display, setDisplay] = useStateM(value);
  const ref = useRefM(null);

  useEffectM(() => {
    const el = ref.current;
    const app = el && el.closest("[data-motion]");
    const motionOn = app && app.getAttribute("data-motion") === "on";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!motionOn || reduced || !value) {
      setDisplay(value);
      return;
    }
    const mult = parseFloat(getComputedStyle(app).getPropertyValue("--mo-mult")) || 1;
    const dur = duration * mult;
    const from = value * 0.4; // start partway — feels settled, not slot-machine
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span ref={ref} className="countup">{fmt(display)}</span>;
}

window.CountUp = CountUp;
