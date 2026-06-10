/* global React */
// Filter view — full-page category drill-down (hero, status chips, sort, rows).
// Rendered in place of the dashboard when a sidebar category is selected.
const { useState: useStateF, useMemo: useMemoF } = React;
const DF = window.DINERO;
const IconF = window.Icon;

// ── Category configs ──────────────────────────────────────
const CAT_CONFIG = {
  cards: {
    label: "Cards",
    crumb: "cards",
    addKind: "card",
    addLabel: "Add card",
    blurb: "credit cards billed this month",
    unit: "cards",
    sourceCat: "Card",
    type: "bill",
  },
  utilities: {
    label: "Utilities",
    crumb: "utilities",
    addKind: "utility",
    addLabel: "Add utility",
    blurb: "monthly utility bills",
    unit: "bills",
    sourceCat: "Utility",
    type: "bill",
  },
  subs: {
    label: "Subscriptions",
    crumb: "subscriptions",
    addKind: "subscription",
    addLabel: "Add subscription",
    blurb: "recurring services",
    unit: "subs",
    sourceCat: "Subscription",
    type: "bill",
  },
  loans: {
    label: "Loans",
    crumb: "loans",
    addKind: "loan",
    addLabel: "Add loan",
    blurb: "loan repayment status",
    unit: "loans",
    type: "loan",
  },
  meters: {
    label: "Meters",
    crumb: "meters",
    addKind: "meter",
    addLabel: "Log reading",
    blurb: "month-end readings",
    unit: "meters",
    type: "meter",
  },
};

// ── helpers ───────────────────────────────────────────────
function fmtDayMonth(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString("en", { month: "short", day: "numeric" });
}
function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const today = new Date(DF.TODAY);
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
}
function relDueLabel(iso) {
  const n = daysUntil(iso);
  if (n === null) return null;
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n < 0) return `${Math.abs(n)}d overdue`;
  return `in ${n}d`;
}

// ── Stats computation ─────────────────────────────────────
function billStats(items) {
  const paid = items.filter(i => i.status === "paid");
  const due = items.filter(i => i.status === "due");
  const over = items.filter(i => i.status === "over");
  const na = items.filter(i => i.status === "na");
  const sum = arr => arr.reduce((s, i) => s + (i.amount || 0), 0);
  return {
    total: sum(items),
    paid: sum(paid),
    due: sum(due),
    over: sum(over),
    owed: sum(due) + sum(over),
    paidCount: paid.length, dueCount: due.length, overCount: over.length, naCount: na.length,
  };
}

// ── Filter chips ──────────────────────────────────────────
function FilterChips({ status, setStatus, counts }) {
  const chips = [
    { v: "all",  label: "All",      ct: counts.all },
    { v: "over", label: "Overdue",  ct: counts.over },
    { v: "due",  label: "Due",      ct: counts.due },
    { v: "paid", label: "Paid",     ct: counts.paid },
    ...(counts.na > 0 ? [{ v: "na", label: "Inactive", ct: counts.na }] : []),
  ];
  return (
    <div className="filter-chips" role="tablist">
      {chips.map(c => (
        <button
          key={c.v}
          role="tab"
          aria-selected={status === c.v}
          className={"filter-chip" + (status === c.v ? " on " + c.v : "")}
          type="button"
          onClick={() => setStatus(c.v)}
        >
          {c.label}
          <span className="ct">{c.ct}</span>
        </button>
      ))}
    </div>
  );
}

// ── Bill row ──────────────────────────────────────────────
function FilterBillRow({ item, kind, onEdit, onMarkPaid }) {
  const canPay = item.status === "due" || item.status === "over";
  const dueRel = relDueLabel(item.due);

  return (
    <div className={"frow s-" + item.status + (item.status === "na" ? " na" : "")}>
      <div className="stripe"></div>

      <div className="frow-main">
        <div className="frow-name">{item.name}</div>
        <div className="frow-meta">
          <window.Pill status={item.status} />
          {item.due && <span><b>due {fmtDayMonth(item.due)}</b>{dueRel ? ` · ${dueRel}` : ""}</span>}
          {item.paidOn && <span>paid {fmtDayMonth(item.paidOn)}</span>}
          {item.paidVia && (<><span className="sep"></span><span>via {item.paidVia}</span></>)}
          {item.min ? (<><span className="sep"></span><span>min {DF.fmtInt(item.min)}</span></>) : null}
        </div>
      </div>

      <div className="frow-amount">
        <div className={"big" + (!item.amount ? " zero" : "")}>
          {item.amount ? DF.fmt(item.amount) : "no balance"}
        </div>
        {item.status === "paid" && item.amount ? (
          <div className="sub">cleared</div>
        ) : item.status === "over" ? (
          <div className="sub" style={{ color: "var(--over)" }}>action needed</div>
        ) : item.status === "due" ? (
          <div className="sub">awaiting</div>
        ) : null}
      </div>

      <div className="frow-actions">
        {canPay && (
          <button className="btn-mp" type="button" onClick={() => onMarkPaid(item)}>
            <IconF.Check /> Mark paid
          </button>
        )}
        <button className="btn-icon" type="button" onClick={() => onEdit(kind, item)} aria-label="Edit">
          <IconF.Pencil />
        </button>
      </div>
    </div>
  );
}

// ── Loan row (plain loans + plan installments) ────────────
function FilterLoanRow({ loan, onEdit }) {
  if (loan.kind === "installment") {
    const paid = loan.status === "done";
    return (
      <div className={"frow " + (paid ? "s-paid" : "s-due")}>
        <div className="stripe"></div>
        <div className="frow-main">
          <div className="frow-name">{loan.name}</div>
          <div className="frow-meta">
            <window.Pill status={paid ? "paid" : "due"}>{paid ? "paid" : "due"}</window.Pill>
            <span>installment <b>{loan.installmentNo} of {loan.tenure}</b></span>
          </div>
        </div>
        <div className="frow-amount">
          <div className="big">{DF.fmtInt(loan.amount)}</div>
          <div className="sub">{paid ? "cleared" : "this month"}</div>
        </div>
        <div className="frow-actions">
          {!paid && (
            <button className="btn-mp" type="button" onClick={() => DF.payInstallment(loan.planId, true)}>
              <IconF.Check /> Mark paid
            </button>
          )}
          {paid && (
            <button className="btn-icon" type="button" title="Mark unpaid" aria-label="Mark unpaid"
              onClick={() => DF.payInstallment(loan.planId, false)}>
              <IconF.X />
            </button>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="frow s-paid">
      <div className="stripe"></div>
      <div className="frow-main">
        <div className="frow-name">{loan.name}</div>
        <div className="frow-meta">
          <window.Pill status="paid">{loan.status}</window.Pill>
          <span>{loan.status === "done" ? "repayment complete" : "ongoing"}</span>
        </div>
      </div>
      <div className="frow-amount">
        <div className="big">{DF.fmtInt(loan.amount)}</div>
        <div className="sub">total paid</div>
      </div>
      <div className="frow-actions">
        <button className="btn-icon" type="button" onClick={() => onEdit("loan", loan)} aria-label="Edit">
          <IconF.Pencil />
        </button>
      </div>
    </div>
  );
}

// ── Meter row ─────────────────────────────────────────────
function FilterMeterRow({ meter, onEdit }) {
  if (meter.last == null) {
    return (
      <div className="frow is-meter s-na">
        <div className="stripe"></div>
        <div className="frow-main">
          <div className="frow-name">{meter.name}</div>
          <div className="reading">
            <span>{meter.prev != null ? `last month ${meter.prev}${meter.unit}` : "no history yet"}</span>
          </div>
        </div>
        <div className="frow-amount">
          <div className="big zero">—</div>
          <div className="sub">not logged</div>
        </div>
        <div className="frow-actions">
          <button className="btn-mp" type="button"
            onClick={() => onEdit("meter", { name: meter.name, unit: meter.unit })}>
            <IconF.Plus /> Log reading
          </button>
        </div>
      </div>
    );
  }
  const delta = meter.last - meter.prev;
  return (
    <div className="frow is-meter s-na">
      <div className="stripe"></div>
      <div className="frow-main">
        <div className="frow-name">{meter.name}</div>
        <div className="reading">
          <b>{meter.last}</b>
          <span>{meter.unit}</span>
          <span style={{ color: "var(--ink-4)" }}>·</span>
          <span>{delta >= 0 ? "+" : ""}{delta} from {meter.prev}{meter.unit}</span>
        </div>
      </div>
      <div className="frow-amount">
        <div className="big" style={{ color: "var(--ink-2)" }}>{delta > 0 ? `+${delta}` : delta}</div>
        <div className="sub">vs last month</div>
      </div>
      <div className="frow-actions">
        <button className="btn-icon" type="button" onClick={() => onEdit("meter", meter)} aria-label="Edit">
          <IconF.Pencil />
        </button>
      </div>
    </div>
  );
}

// ── Main FilterView ───────────────────────────────────────
function FilterView({ catKey, onClear, onEdit, onAdd, onMarkPaid }) {
  const cfg = CAT_CONFIG[catKey];
  const [status, setStatus] = useStateF("all");
  const [sort, setSort] = useStateF(cfg.type === "bill" ? "due" : "name");

  // Reset sub-filter when switching category
  React.useEffect(() => {
    setStatus("all");
    setSort(cfg.type === "bill" ? "due" : "name");
  }, [catKey]);

  const head = (
    <div className="filter-head">
      <button className="filter-back" type="button" onClick={onClear}>
        <IconF.ChevLeft /> All categories
      </button>
      <span className={"filter-crumb " + cfg.crumb}>
        <span className="dot"></span>
        filtered: <b>{cfg.label}</b>
      </span>
      <span className="spacer"></span>
      <span className="urlbit"><em>dinero / </em>{cfg.crumb}</span>
    </div>
  );

  // ── Bill categories ─────────────────────────────────
  if (cfg.type === "bill") {
    const allItems = DF.ITEMS.filter(i => i.cat === cfg.sourceCat);
    const stats = billStats(allItems);
    const counts = {
      all: allItems.length,
      paid: stats.paidCount, due: stats.dueCount, over: stats.overCount, na: stats.naCount,
    };

    const filtered = useMemoF(() => {
      let arr = status === "all" ? allItems : allItems.filter(i => i.status === status);
      const STATUS_ORDER = { over: 0, due: 1, paid: 2, na: 3 };
      if (sort === "status") {
        arr = [...arr].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
      } else if (sort === "amount") {
        arr = [...arr].sort((a, b) => (b.amount || 0) - (a.amount || 0));
      } else if (sort === "name") {
        arr = [...arr].sort((a, b) => a.name.localeCompare(b.name));
      } else { // due
        arr = [...arr].sort((a, b) => {
          if (!a.due && !b.due) return 0;
          if (!a.due) return 1;
          if (!b.due) return -1;
          return new Date(a.due) - new Date(b.due);
        });
      }
      return arr;
    }, [status, sort, allItems]);

    const pctPaid = stats.total ? (stats.paid / stats.total) * 100 : 0;
    const pctDue  = stats.total ? (stats.due  / stats.total) * 100 : 0;
    const pctOver = stats.total ? (stats.over / stats.total) * 100 : 0;

    return (
      <div className="filter-view" data-cat={catKey} data-screen-label={`Filter ${cfg.label}`}>
        {head}

        <div className="filter-hero">
          <div className="filter-hero-left">
            <h1><span className="ct-dot"></span><em>{cfg.label}</em></h1>
            <div className="filter-blurb">
              <b>{allItems.length} {cfg.unit}</b> · {cfg.blurb} · {DF.monthName} {DF.yearStr}
            </div>
          </div>
          <div className="filter-stats">
            <div className="stat over">
              <span className="l">Outstanding</span>
              <span className="v"><span className="cur">{DF.CURRENCY}</span>{Math.round(stats.owed).toLocaleString("en-LK")}</span>
            </div>
            <div className="stat paid">
              <span className="l">Paid</span>
              <span className="v"><span className="cur">{DF.CURRENCY}</span>{Math.round(stats.paid).toLocaleString("en-LK")}</span>
            </div>
            <div className="stat">
              <span className="l">Total</span>
              <span className="v"><span className="cur">{DF.CURRENCY}</span>{Math.round(stats.total).toLocaleString("en-LK")}</span>
            </div>
          </div>
          <div className="filter-distbar">
            <i className="seg-paid" style={{ width: pctPaid + "%" }}></i>
            <i className="seg-due"  style={{ width: pctDue + "%" }}></i>
            <i className="seg-over" style={{ width: pctOver + "%" }}></i>
          </div>
          <div className="filter-distlegend">
            <span className="lg"><i style={{ background: "var(--paid)" }}></i>paid {Math.round(pctPaid)}%</span>
            <span className="lg"><i style={{ background: "var(--due)" }}></i>due {Math.round(pctDue)}%</span>
            <span className="lg"><i style={{ background: "var(--over)" }}></i>overdue {Math.round(pctOver)}%</span>
          </div>
        </div>

        <div className="filter-toolbar">
          <FilterChips status={status} setStatus={setStatus} counts={counts} />
          <span className="spacer"></span>
          <select className="sort" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="due">sort: due date</option>
            <option value="status">sort: status</option>
            <option value="amount">sort: amount</option>
            <option value="name">sort: name</option>
          </select>
          <button className="filter-add" type="button" onClick={() => onAdd(cfg.addKind)}>
            <IconF.Plus /> {cfg.addLabel}
          </button>
        </div>

        <div className="filter-list">
          {filtered.length === 0 ? (
            <div className="filter-empty">
              <div className="glyph">—</div>
              <div className="msg">No {cfg.unit} match this filter</div>
            </div>
          ) : (
            filtered.map(it => (
              <FilterBillRow key={it.id} item={it} kind={cfg.addKind}
                onEdit={onEdit} onMarkPaid={onMarkPaid} />
            ))
          )}
        </div>
      </div>
    );
  }

  // ── Loans ────────────────────────────────────────────
  if (cfg.type === "loan") {
    const items = DF.LOANS || [];
    const totalPaid = items.reduce((s, l) => s + (l.amount || 0), 0);
    const allSettled = items.every(l => l.status === "done");
    return (
      <div className="filter-view" data-cat="loans" data-screen-label="Filter Loans">
        {head}
        <div className="filter-hero">
          <div className="filter-hero-left">
            <h1><span className="ct-dot"></span><em>Loans</em></h1>
            <div className="filter-blurb">
              <b>{items.length} loans</b> · {allSettled ? "all settled · clean slate" : cfg.blurb} · {DF.monthName} {DF.yearStr}
            </div>
          </div>
          <div className="filter-stats">
            <div className="stat paid">
              <span className="l">{allSettled ? "Total settled" : "This month"}</span>
              <span className="v"><span className="cur">{DF.CURRENCY}</span>{Math.round(totalPaid).toLocaleString("en-LK")}</span>
            </div>
          </div>
          <div className="filter-distbar"><i className="seg-paid" style={{ width: "100%" }}></i></div>
          <div className="filter-distlegend">
            <span className="lg"><i style={{ background: "var(--paid)" }}></i>{allSettled ? "100% settled" : "repayments"}</span>
            <span>{allSettled ? "nothing outstanding" : ""}</span>
          </div>
        </div>
        <div className="filter-toolbar">
          <div className="filter-chips">
            <button className="filter-chip on paid" type="button">All <span className="ct">{items.length}</span></button>
          </div>
          <span className="spacer"></span>
          <button className="filter-add" type="button" onClick={() => onAdd("loan")}>
            <IconF.Plus /> Add loan
          </button>
        </div>
        <div className="filter-list">
          {items.length === 0 ? (
            <div className="filter-empty">
              <div className="glyph">—</div>
              <div className="msg">No loans this month</div>
            </div>
          ) : (
            items.map(l => <FilterLoanRow key={l.kind === "installment" ? "inst-" + l.planId : l.id} loan={l} onEdit={onEdit} />)
          )}
        </div>
      </div>
    );
  }

  // ── Meters ───────────────────────────────────────────
  if (cfg.type === "meter") {
    const items = DF.METERS || [];
    return (
      <div className="filter-view" data-cat="meters" data-screen-label="Filter Meters">
        {head}
        <div className="filter-hero">
          <div className="filter-hero-left">
            <h1><span className="ct-dot"></span><em>Meters</em></h1>
            <div className="filter-blurb"><b>{items.length} meters</b> · month-end readings · {DF.monthName} {DF.yearStr}</div>
          </div>
          <div className="filter-stats">
            {items.filter(m => m.last != null).map(m => (
              <div key={m.id || m.name} className="stat">
                <span className="l">{m.name}</span>
                <span className="v">{m.last}<span className="cur" style={{ marginLeft: 4 }}>{m.unit}</span></span>
              </div>
            ))}
          </div>
        </div>
        <div className="filter-toolbar">
          <div className="filter-chips">
            <button className="filter-chip on" type="button">All <span className="ct">{items.length}</span></button>
          </div>
          <span className="spacer"></span>
          <button className="filter-add" type="button" onClick={() => onAdd("meter")}>
            <IconF.Plus /> Log reading
          </button>
        </div>
        <div className="filter-list">
          {items.length === 0 ? (
            <div className="filter-empty">
              <div className="glyph">—</div>
              <div className="msg">No meters yet</div>
            </div>
          ) : (
            items.map(m => <FilterMeterRow key={m.id || m.name} meter={m} onEdit={onEdit} />)
          )}
        </div>
      </div>
    );
  }

  return null;
}

window.FilterView = FilterView;
window.CAT_CONFIG = CAT_CONFIG;
