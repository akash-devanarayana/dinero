/* global React */
const { useState: useStateS } = React;
const Ds = window.DINERO;
const IconS = window.Icon;

function pipsFor(items) {
  const cap = 5;
  const active = items.filter(i => i.status !== "na");
  const slice = active.slice(0, cap);
  const extra = active.length - slice.length;
  return (
    <div className="pips">
      {slice.map((i, idx) => <span key={idx} className={"pip " + i.status}></span>)}
      {extra > 0 && <span className="pip na"></span>}
      {active.length === 0 && Array.from({ length: Math.min(3, items.length) }, (_, k) => (
        <span key={k} className="pip na"></span>
      ))}
    </div>
  );
}

function Sidebar({ sections, showTrend, showMonthBar, showOverdue, onAddBill }) {
  const cardT = Ds.totals("Card");
  const utilT = Ds.totals("Utility");
  const subT  = Ds.totals("Subscription");
  const owed  = cardT.owed + utilT.owed + subT.owed;
  const paid  = cardT.paid + utilT.paid + subT.paid;
  const total = cardT.total + utilT.total + subT.total;

  const overItems = Ds.ITEMS.filter(i => i.status === "over");
  const overCount = overItems.length;
  const overAmt = overItems.reduce((s, i) => s + i.amount, 0);

  const paidPct    = total > 0 ? (paid / total) * 100 : 0;
  const overPct    = total > 0 ? (overAmt / total) * 100 : 0;
  const otherOwed  = owed - overAmt;
  const otherOwedPct = total > 0 ? (otherOwed / total) * 100 : 0;

  const today = Ds.TODAY.getDate();
  const daysInMonth = new Date(Ds.TODAY.getFullYear(), Ds.TODAY.getMonth() + 1, 0).getDate();
  const monthState = Ds.monthState || "current";
  const plural = (n) => (n === 1 ? "" : "s");
  let monthPct, progressLeft, progressRight;
  if (monthState === "future") {
    monthPct = 0;
    progressLeft = "hasn’t started";
    progressRight = Ds.daysToStart > 0 ? `starts in ${Ds.daysToStart} day${plural(Ds.daysToStart)}` : "upcoming";
  } else if (monthState === "past") {
    monthPct = 100;
    progressLeft = "month complete";
    progressRight = Ds.daysSinceEnd > 0 ? `ended ${Ds.daysSinceEnd} day${plural(Ds.daysSinceEnd)} ago` : "ended";
  } else {
    monthPct = (today / daysInMonth) * 100;
    progressLeft = <>day <b>{today}</b> of {daysInMonth}</>;
    progressRight = `${daysInMonth - today} day${plural(daysInMonth - today)} left`;
  }

  const bars = [62, 58, 71, 49, 66, 73]; // mock 6 mo
  const allItems = [...cardT.items, ...utilT.items, ...subT.items];

  const [menuOpen, setMenuOpen] = useStateS(false);

  return (
    <aside className="sidebar">
      <div className="sb-month">
        <button className="nav" type="button" aria-label="Previous month"
          disabled={!Ds.hasPrev()} onClick={() => Ds.goPrev()}><IconS.ChevLeft /></button>
        <div className="lbl">
          <div className="m">{Ds.monthName}</div>
          <span className="y">{Ds.yearStr}</span>
        </div>
        {Ds.hasNext()
          ? <button className="nav" type="button" aria-label="Next month"
              onClick={() => Ds.goNext()}><IconS.ChevRight /></button>
          : <button className="nav add-next" type="button" aria-label="Add next month"
              title={"Add " + Ds.nextLabel()} onClick={() => Ds.addNextMonth()}><IconS.Plus /></button>}
      </div>

      {showMonthBar && (
        <div className="sb-progress" data-state={monthState}>
          <div className="track"><div className="fill" style={{ width: monthPct + "%" }}></div></div>
          <div className="day">
            <span>{progressLeft}</span>
            <span>{progressRight}</span>
          </div>
        </div>
      )}

      <section className="sb-hero">
        <div className="sb-label">
          <span>Outstanding</span>
          <span className="aside">this month</span>
        </div>
        <div className="big">
          <span className="cur">{Ds.CURRENCY}</span>{Math.round(owed).toLocaleString("en-LK")}
        </div>
        <div className="secondary">
          of <b>{Ds.fmtInt(total)}</b> total · <b>{Math.round(paidPct)}%</b> paid
        </div>
        <div className="pbar">
          <div className="ppaid" style={{ width: paidPct + "%" }}></div>
          <div className="pdue"  style={{ width: Math.max(0, otherOwedPct) + "%" }}></div>
          <div className="pover" style={{ width: overPct + "%" }}></div>
        </div>
        <div className="pbar-legend">
          <span>paid {Ds.fmtInt(paid)}</span>
          <span>owed {Ds.fmtInt(owed)}</span>
        </div>
      </section>

      {showOverdue && overCount > 0 && (
        <div className="sb-overdue">
          <span className="ic">!</span>
          <div className="txt">
            <b>{overCount} overdue</b>
            <small>{Ds.fmtInt(overAmt)} · handle today</small>
          </div>
        </div>
      )}

      <section className="sb-cats">
        <div className="sb-label">
          <span>Categories</span>
          <span className="aside">filter</span>
        </div>
        <ul>
          <li className="c-all active">
            <span className="dot"></span>
            <span className="name">All</span>
            <span className="ct">{allItems.length}</span>
            {pipsFor(allItems)}
          </li>
          {sections.cards && (
            <li className="c-cards">
              <span className="dot"></span>
              <span className="name">Cards</span>
              <span className="ct">{cardT.items.length}</span>
              {pipsFor(cardT.items)}
            </li>
          )}
          {sections.utilities && (
            <li className="c-utils">
              <span className="dot"></span>
              <span className="name">Utilities</span>
              <span className="ct">{utilT.items.length}</span>
              {pipsFor(utilT.items)}
            </li>
          )}
          {sections.subs && (
            <li className="c-subs">
              <span className="dot"></span>
              <span className="name">Subscriptions</span>
              <span className="ct">{subT.items.length}</span>
              {pipsFor(subT.items)}
            </li>
          )}
          {sections.loans && (
            <li className="c-loans">
              <span className="dot"></span>
              <span className="name">Loans</span>
              <span className="ct">{Ds.LOANS.length}</span>
              <div className="pips">{Ds.LOANS.map((l, i) => <span key={i} className="pip paid"></span>)}</div>
            </li>
          )}
          {sections.meters && (
            <li className="c-meter">
              <span className="dot"></span>
              <span className="name">Meters</span>
              <span className="ct">{Ds.METERS.length}</span>
              <div className="pips">{Ds.METERS.map((m, i) => <span key={i} className="pip na"></span>)}</div>
            </li>
          )}
        </ul>
      </section>

      {showTrend && (
        <section>
          <div className="sb-label">
            <span>6-month trend</span>
            <span className="aside">total spent</span>
          </div>
          <div className="sb-trend">
            <div className="spk">
              {bars.map((b, i) => (
                <i key={i} className={i === bars.length - 1 ? "now" : ""} style={{ height: b + "%" }}></i>
              ))}
            </div>
            <div className="avg">avg<b>{Ds.fmtInt(64000)}</b></div>
          </div>
        </section>
      )}

      <section className="sb-add">
        <button className={"main" + (menuOpen ? " open" : "")} type="button" onClick={() => setMenuOpen(o => !o)}>
          {menuOpen ? <IconS.X /> : <IconS.Plus />}
          {menuOpen ? "Pick a type" : "Add record"}
        </button>
        {menuOpen && (
          <div className="menu">
            <button className="opt" type="button" onClick={() => { setMenuOpen(false); onAddBill("card"); }}>
              <IconS.Card />Card
            </button>
            <button className="opt" type="button" onClick={() => { setMenuOpen(false); onAddBill("utility"); }}>
              <IconS.Bolt />Utility
            </button>
            <button className="opt" type="button" onClick={() => { setMenuOpen(false); onAddBill("subscription"); }}>
              <IconS.Loop />Sub
            </button>
            <button className="opt" type="button" onClick={() => { setMenuOpen(false); onAddBill("meter"); }}>
              <IconS.Gauge />Meter
            </button>
            <button className="opt full" type="button" onClick={() => { setMenuOpen(false); onAddBill("loan"); }}>
              <IconS.Bank />Loan payment
            </button>
          </div>
        )}
      </section>
    </aside>
  );
}

window.Sidebar = Sidebar;
