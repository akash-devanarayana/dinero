/* global React */
const DMain = window.DINERO;
const IconN = window.Icon;

// ─── Pill ───────────────────────────────────────────────
function Pill({ status, children }) {
  return (
    <span className={"pill " + status}>
      <span className="dot"></span>
      {children || (status === "paid" ? "Paid" : status === "due" ? "Due" : status === "over" ? "Overdue" : "—")}
    </span>
  );
}

// ─── SectionCard chrome ────────────────────────────────
function SectionCard({ title, subtitle, right, children, className = "" }) {
  return (
    <section className={"card " + className}>
      <header className="card-head">
        <div className="title"><em>{title}</em></div>
        {subtitle && <div className="subtitle">{subtitle}</div>}
        {right && <div className="right">{right}</div>}
      </header>
      {children}
    </section>
  );
}

// ─── Row actions ───────────────────────────────────────
function RowActions({ canMarkPaid, onEdit, onMarkPaid }) {
  return (
    <span className="actions">
      {canMarkPaid && (
        <button className="btn-icon" type="button" onClick={onMarkPaid} title="Mark paid" aria-label="Mark paid">
          <IconN.Check />
        </button>
      )}
      <button className="btn-icon" type="button" onClick={onEdit} title="Edit" aria-label="Edit">
        <IconN.Pencil />
      </button>
    </span>
  );
}

// ─── Week strip ────────────────────────────────────────
function WeekStrip({ days = 7 }) {
  const start = new Date(DMain.TODAY);
  const dayArr = Array.from({ length: days }, (_, k) => {
    const d = new Date(start); d.setDate(start.getDate() + k);
    return d;
  });
  const itemsForDay = (d) => DMain.ITEMS.filter(i => {
    if (!i.due) return false;
    const dd = new Date(i.due);
    return dd.getUTCDate() === d.getDate() && dd.getUTCMonth() === d.getMonth();
  });

  return (
    <SectionCard
      title="This week"
      subtitle={`next ${days} days`}
      right={<span className="subtitle" style={{ color: "var(--ink-3)" }}>scroll to month view →</span>}
      className="week"
    >
      <div className="week-grid" style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}>
        {dayArr.map((d, idx) => {
          const its = itemsForDay(d);
          const isToday = idx === 0;
          const hasOver = its.some(i => i.status === "over");
          const hasDue  = its.some(i => i.status === "due");
          const cls = "week-day" + (isToday ? " today" : "") + (hasOver ? " has-over" : hasDue ? " has-due" : "");
          return (
            <div key={idx} className={cls}>
              <div className="dlbl">
                <span>{d.toLocaleString("en", { weekday: "short" }).toUpperCase()}</span>
                <b>{d.getDate()}</b>
              </div>
              {its.length === 0 && <div className="empty">—</div>}
              {its.slice(0, 2).map(it => (
                <div key={it.id} className={"ditem " + (it.status === "paid" ? "paid" : "")}>
                  {it.name.length > 11 ? it.name.slice(0, 10) + "…" : it.name}
                  <span className="amt">{DMain.fmtInt(it.amount)}</span>
                </div>
              ))}
              {its.length > 2 && (
                <div className="ditem" style={{ color: "var(--ink-3)", fontWeight: 400 }}>
                  +{its.length - 2} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ─── Bills section (Cards / Utilities / Subs) ──────────
function BillSection({ title, subtitle, items, totals, totalsLine, kind, onEdit, onMarkPaid, onAdd }) {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      <div className="bills">
        <div className="bill-totals">
          <span className="lbl">{totalsLine.label}</span>
          <span className="val">{totalsLine.value}</span>
        </div>
        {items.map(i => (
          <div key={i.id} className={"bill-row" + (i.status === "na" ? " na" : "")}>
            <div className="name">
              <span className="label">{i.name}</span>
              <span className="meta">
                {i.min ? `min ${DMain.fmtInt(i.min)} · ` : ""}
                {i.due ? `due ${formatDateShort(i.due)} · ` : ""}
                {"via " + (i.paidVia || "—")}
                {i.paidOn ? ` · paid ${formatDateShort(i.paidOn)}` : ""}
              </span>
            </div>
            <Pill status={i.status} />
            <div className={"amt" + (!i.amount ? " empty" : "")}>
              {i.amount ? DMain.fmt(i.amount) : "—"}
            </div>
            <RowActions
              canMarkPaid={i.status === "due" || i.status === "over"}
              onEdit={() => onEdit(kind, i)}
              onMarkPaid={() => onMarkPaid(i)}
            />
          </div>
        ))}
      </div>
      <div className="card-foot">
        <button className="ghost-add" type="button" onClick={onAdd}>
          <IconN.Plus /> Add {title.toLowerCase().replace(/s$/, "")}
        </button>
      </div>
    </SectionCard>
  );
}

// ─── Meters section ────────────────────────────────────
function MetersSection({ onEdit, onAdd }) {
  return (
    <SectionCard
      title="Meter readings"
      subtitle="this month"
    >
      <div className="bills" style={{ paddingTop: 6 }}>
        {DMain.METERS.map(m => {
          if (m.last == null) {
            // standard meter with no reading logged yet this month
            return (
              <div key={m.id || m.name} className="meter-row meter-pending">
                <div className="name-block">
                  <div className="name">{m.name}</div>
                  <div className="reading">
                    <span className="prev">
                      {m.prev != null ? `last month ${m.prev}${m.unit}` : "no history yet"}
                    </span>
                  </div>
                </div>
                <button className="meter-log" type="button"
                  onClick={() => onEdit("meter", { name: m.name, unit: m.unit })}>
                  <IconN.Plus /> Log reading
                </button>
              </div>
            );
          }
          const delta = m.last - m.prev;
          return (
            <div key={m.id || m.name} className="meter-row">
              <div className="name-block">
                <div className="name">{m.name}</div>
                <div className="reading">
                  <b>{m.last}</b>
                  <span className="unit">{m.unit}</span>
                  <span className="prev">previous {m.prev}{m.unit}</span>
                </div>
              </div>
              <Pill status={delta > 0 ? "due" : "paid"}>{delta > 0 ? `+${delta}` : delta} {m.unit}</Pill>
              <RowActions onEdit={() => onEdit("meter", m)} />
            </div>
          );
        })}
      </div>
      <div className="card-foot">
        <button className="ghost-add" type="button" onClick={onAdd}>
          <IconN.Plus /> Log reading
        </button>
      </div>
    </SectionCard>
  );
}

// ─── Loans section ─────────────────────────────────────
function LoansSection({ onEdit, onAdd }) {
  return (
    <SectionCard title="Loans" subtitle="status">
      <div className="bills">
        <div className="bill-totals">
          <span className="lbl">Total settled</span>
          <span className="val">{DMain.fmtInt(DMain.LOANS.reduce((s, l) => s + l.amount, 0))}</span>
        </div>
        {DMain.LOANS.map(l => (
          <div key={l.id} className="bill-row">
            <div className="name">
              <span className="label">{l.name}</span>
              <span className="meta">{l.status === "done" ? "settled" : "ongoing"}</span>
            </div>
            <Pill status="paid">{l.status}</Pill>
            <div className="amt">{DMain.fmtInt(l.amount)}</div>
            <RowActions
              onEdit={() => onEdit("loan", l)}
            />
          </div>
        ))}
      </div>
      <div className="card-foot">
        <button className="ghost-add" type="button" onClick={onAdd}>
          <IconN.Plus /> Add loan
        </button>
      </div>
    </SectionCard>
  );
}

// ─── Notes section (per-month, DB-backed) ──────────────
function autoGrowNote(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

function NotesSection() {
  const [adding, setAdding] = React.useState(false);
  const notes = DMain.NOTES || [];

  const commitEdit = (note, value) => {
    const body = value.trim();
    if (body === note.body) return;          // unchanged
    if (body === "") { DMain.deleteNote(note.id); return; }  // emptied → delete
    DMain.saveNote(body, note.id);
  };
  const commitNew = (value) => {
    setAdding(false);
    const body = value.trim();
    if (body !== "") DMain.saveNote(body, null);
  };
  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.target.blur(); }
    if (e.key === "Escape") { e.target.value = e.target.defaultValue; e.target.blur(); }
  };

  return (
    <SectionCard title="Notes" subtitle="this month">
      <div className="card-body">
        <div className="notes-list">
          {notes.length === 0 && !adding && (
            <div className="note note-empty">No notes yet — jot a reminder below.</div>
          )}
          {notes.map((n) => (
            <div key={n.id} className="note-row">
              <textarea
                className="note note-edit"
                defaultValue={n.body}
                rows={1}
                ref={autoGrowNote}
                onInput={(e) => autoGrowNote(e.target)}
                onBlur={(e) => commitEdit(n, e.target.value)}
                onKeyDown={onKey}
              />
              <button className="note-del" type="button" title="Delete note" aria-label="Delete note"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => DMain.deleteNote(n.id)}>
                <IconN.X />
              </button>
            </div>
          ))}
          {adding && (
            <div className="note-row">
              <textarea
                className="note note-edit"
                autoFocus
                rows={1}
                placeholder="Write a note…"
                onInput={(e) => autoGrowNote(e.target)}
                onBlur={(e) => commitNew(e.target.value)}
                onKeyDown={onKey}
              />
            </div>
          )}
        </div>
      </div>
      <div className="card-foot">
        <button className="ghost-add" type="button" onClick={() => setAdding(true)}>
          <IconN.Plus /> Add note
        </button>
      </div>
    </SectionCard>
  );
}

function formatDateShort(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en", { month: "short", day: "numeric" });
}

// ─── Search palette (⌘K) ───────────────────────────────
const SEARCH_GROUPS = [
  { type: "Card",         label: "Cards" },
  { type: "Utility",      label: "Utilities" },
  { type: "Subscription", label: "Subscriptions" },
  { type: "Loan",         label: "Loans" },
  { type: "Meter",        label: "Meters" },
  { type: "Note",         label: "Notes" },
];

// A short month chip like "Mar 26".
function monthChip(monthName, year) {
  return `${String(monthName).slice(0, 3)} ${String(year).slice(-2)}`;
}

// Entry builders — shared by current-month (local) and all-months (remote) search
// so both render identically. `record` is the API-shaped object the modals expect.
function billEntry(i, period, monthLabel) {
  const D = window.DINERO;
  return {
    type: i.cat, kind: i.cat === "Card" ? "card" : i.cat === "Utility" ? "utility" : "subscription",
    record: i, name: i.name, status: i.status, amount: i.amount, period, monthLabel,
    sub: [i.min ? "min " + D.fmtInt(i.min) : null, i.due ? "due " + formatDateShort(i.due) : null,
          "via " + (i.paidVia || "—"), i.paidOn ? "paid " + formatDateShort(i.paidOn) : null]
          .filter(Boolean).join(" · "),
    hay: [i.name, i.cat, (D.STATUS_LABEL[i.status] || ""), i.paidVia, String(i.amount)].join(" ").toLowerCase(),
  };
}
function loanEntry(l, period, monthLabel) {
  return {
    type: "Loan", kind: "loan", record: l, name: l.name,
    status: "paid", statusText: l.status, amount: l.amount, period, monthLabel,
    sub: l.status === "done" ? "settled" : "ongoing",
    hay: [l.name, "loan", l.status, String(l.amount)].join(" ").toLowerCase(),
  };
}
function meterEntry(m, period, monthLabel) {
  return {
    type: "Meter", kind: "meter", record: m, name: m.name, status: null, amount: null, period, monthLabel,
    sub: `${m.last}${m.unit} · prev ${m.prev}${m.unit}`,
    hay: [m.name, "meter", String(m.last)].join(" ").toLowerCase(),
  };
}
function noteEntry(n, period, monthLabel) {
  return {
    type: "Note", kind: "note", record: n, name: n.body, status: null, amount: null, period, monthLabel,
    sub: "note", hay: (n.body || "").toLowerCase(),
  };
}

// Flatten the currently-loaded month into entries (instant, no network).
function currentMonthEntries() {
  const D = window.DINERO;
  const label = monthChip(D.monthName, D.yearStr);
  const out = [];
  (D.ITEMS || []).forEach((i) => out.push(billEntry(i, D.period, label)));
  (D.LOANS || []).forEach((l) => out.push(loanEntry(l, D.period, label)));
  (D.METERS || []).filter((m) => m.last != null).forEach((m) => out.push(meterEntry(m, D.period, label)));
  (D.NOTES || []).forEach((n) => out.push(noteEntry(n, D.period, label)));
  return out;
}

// Convert a /api/search result row into a display entry.
function entryFromResult(res) {
  const { type, period, monthLabel, record } = res;
  if (type === "Loan") return loanEntry(record, period, monthLabel);
  if (type === "Meter") return meterEntry(record, period, monthLabel);
  if (type === "Note") return noteEntry(record, period, monthLabel);
  return billEntry(record, period, monthLabel);
}

// Wrap every case-insensitive occurrence of q in <mark>.
function highlightMatch(text, q) {
  text = String(text == null ? "" : text);
  if (!q) return text;
  const lower = text.toLowerCase(), ql = q.toLowerCase();
  const parts = []; let from = 0, pos;
  while ((pos = lower.indexOf(ql, from)) !== -1) {
    if (pos > from) parts.push(text.slice(from, pos));
    parts.push(<mark key={pos} className="search-hl">{text.slice(pos, pos + ql.length)}</mark>);
    from = pos + ql.length;
  }
  parts.push(text.slice(from));
  return parts;
}

function SearchPalette({ onClose, onPick }) {
  const [q, setQ] = React.useState("");
  const [scope, setScope] = React.useState("all");   // "all" | "month"
  const [remote, setRemote] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [sel, setSel] = React.useState(0);
  const resultsRef = React.useRef(null);
  const D = window.DINERO;
  const ql = q.trim().toLowerCase();

  // all-months search hits the backend (debounced); current-month is local/instant
  React.useEffect(() => {
    if (scope !== "all") return;
    if (!ql) { setRemote([]); setLoading(false); return; }
    setLoading(true);
    let cancelled = false;
    const t = setTimeout(() => {
      D.search(q.trim())
        .then((r) => { if (!cancelled) setRemote(r); })
        .catch(() => { if (!cancelled) setRemote([]); })
        .then(() => { if (!cancelled) setLoading(false); });
    }, 180);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, scope]);

  let entries;
  if (scope === "month") {
    const local = currentMonthEntries();
    entries = ql ? local.filter((e) => e.hay.includes(ql)) : local;
  } else {
    entries = remote.map(entryFromResult);
  }

  const groups = SEARCH_GROUPS
    .map((g) => ({ ...g, rows: entries.filter((m) => m.type === g.type) }))
    .filter((g) => g.rows.length > 0);
  const flat = groups.reduce((a, g) => a.concat(g.rows), []);

  React.useEffect(() => { setSel(0); }, [q, scope, remote]);
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  React.useEffect(() => {
    const el = resultsRef.current && resultsRef.current.querySelector(".search-row.on");
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const onKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(flat.length - 1, s + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (flat[sel]) onPick(flat[sel]); }
  };

  let running = -1;
  return (
    <div className="search-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="search-palette" role="dialog" aria-modal="true" aria-label="Search">
        <div className="search-head">
          <span className="search-ic"><IconN.Search /></span>
          <input className="search-input" autoFocus value={q}
            placeholder={scope === "all" ? "Search every month…" : "Search this month…"}
            onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown} />
          <div className="seg search-scope">
            <button type="button" className={"opt" + (scope === "month" ? " on" : "")}
              onClick={() => setScope("month")}>This month</button>
            <button type="button" className={"opt" + (scope === "all" ? " on" : "")}
              onClick={() => setScope("all")}>All months</button>
          </div>
        </div>

        <div className="search-results" ref={resultsRef}>
          {flat.length === 0 && (
            <div className="search-empty">
              {scope === "all" && !ql ? "Type to search across all months."
                : loading ? "Searching…"
                : ql ? `No matches for “${q}”.`
                : "Nothing in this month yet."}
            </div>
          )}
          {groups.map((g) => (
            <div className="search-group" key={g.type}>
              <div className="search-group-lbl">{g.label}</div>
              {g.rows.map((row) => {
                running += 1;
                const idx = running;
                return (
                  <button key={row.kind + "-" + row.record.id}
                    className={"search-row" + (idx === sel ? " on" : "")} type="button"
                    onMouseEnter={() => setSel(idx)} onClick={() => onPick(row)}>
                    <span className="search-row-main">
                      <span className="search-row-name">{highlightMatch(row.name, q)}</span>
                      <span className="search-row-sub">{row.sub}</span>
                    </span>
                    <span className="search-row-pill">
                      {row.status && <Pill status={row.status}>{row.statusText}</Pill>}
                    </span>
                    <span className="search-row-amt">{row.amount != null ? D.fmt(row.amount) : ""}</span>
                    <span className="search-row-month">{row.monthLabel}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="search-foot">
          <span><b>↵</b> open</span>
          <span><b>↑↓</b> navigate</span>
          <span><b>esc</b> close</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Pill, SectionCard, RowActions, WeekStrip, BillSection, MetersSection, LoansSection, NotesSection, SearchPalette });
