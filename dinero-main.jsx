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
          const delta = m.last - m.prev;
          return (
            <div key={m.id} className="meter-row">
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

// ─── Notes section ─────────────────────────────────────
function NotesSection() {
  return (
    <SectionCard title="Notes" subtitle="scratch">
      <div className="card-body">
        <div className="notes-list">
          <div className="note">SLT bill keeps slipping past due — consider auto-pay.</div>
          <div className="note">Starlink has been overdue twice this year already.</div>
          <div className="note">Spotify went up Rs50 — still worth it?</div>
        </div>
      </div>
    </SectionCard>
  );
}

function formatDateShort(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en", { month: "short", day: "numeric" });
}

Object.assign(window, { Pill, SectionCard, RowActions, WeekStrip, BillSection, MetersSection, LoansSection, NotesSection });
