// Live data store for Dinero — fetches a month at a time from the backend API
// and notifies subscribers (the React app) to re-render. The shape of ITEMS /
// LOANS / METERS matches what the components expect.
const CURRENCY = "Rs";

const fmt = (n) => CURRENCY + Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n) => CURRENCY + Math.round(Number(n || 0)).toLocaleString("en-LK");

const STATUS_LABEL = { paid: "Paid", due: "Due", over: "Overdue", na: "N/A" };

const dayOf = (iso) => iso ? new Date(iso).getUTCDate() : null;
const monthOf = (iso) => iso ? new Date(iso).getUTCMonth() : null;

// category <-> modal kind
const KIND_TO_CAT = { card: "Card", utility: "Utility", subscription: "Subscription" };
const KIND_TO_EP = { card: "bills", utility: "bills", subscription: "bills", meter: "meters", loan: "loans" };

const store = {
  fmt, fmtInt, CURRENCY, STATUS_LABEL, dayOf, monthOf,

  // live month data
  ITEMS: [], LOANS: [], METERS: [], NOTES: [],
  months: [], period: null, label: "",
  monthName: "", yearStr: "",
  TODAY: new Date(),
  monthState: "current", daysToStart: 0, daysSinceEnd: 0,
  trend: { months: [], average: 0, max: 0 },
  loading: true, error: null,

  // ── subscriptions / re-render plumbing ─────────────────────────
  _subs: new Set(),
  subscribe(fn) { this._subs.add(fn); return () => this._subs.delete(fn); },
  _notify() { this._subs.forEach((fn) => fn()); },

  // ── totals (reads current ITEMS) ───────────────────────────────
  totals(cat) {
    const items = this.ITEMS.filter((i) => i.cat === cat);
    const owed = items.reduce((s, i) => s + (i.status === "paid" ? 0 : i.amount), 0);
    const paid = items.reduce((s, i) => s + (i.status === "paid" ? i.amount : 0), 0);
    const total = items.reduce((s, i) => s + i.amount, 0);
    return { owed, paid, total, items };
  },

  // ── networking ─────────────────────────────────────────────────
  async _json(url, opts) {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opts });
    if (!res.ok) throw new Error(`${opts && opts.method || "GET"} ${url} → ${res.status}`);
    if (res.status === 204) return null;
    return res.json();
  },

  async init() {
    try {
      const m = await this._json("/api/months");
      this.months = m.months;
      await this.load(m.current);
    } catch (e) {
      this.error = String(e);
      this.loading = false;
      this._notify();
    }
  },

  async load(period) {
    this.loading = true; this._notify();
    const d = await this._json("/api/month/" + period);
    this.period = d.period;
    this.label = d.label;
    this.monthName = d.monthName;
    this.yearStr = d.year;
    this.TODAY = new Date(d.today + "T00:00:00");
    this.monthState = d.state || "current";
    this.daysToStart = d.daysToStart || 0;
    this.daysSinceEnd = d.daysSinceEnd || 0;
    this.trend = d.trend || { months: [], average: 0, max: 0 };
    this.ITEMS = d.items;
    this.LOANS = d.loans;
    this.METERS = d.meters;
    this.NOTES = d.notes || [];
    this.loading = false;
    this.error = null;
    this._notify();
  },

  // ── month navigation ───────────────────────────────────────────
  _idx() { return this.months.findIndex((x) => x.period === this.period); },
  hasPrev() { return this._idx() > 0; },
  hasNext() { const i = this._idx(); return i >= 0 && i < this.months.length - 1; },
  async goPrev() { if (this.hasPrev()) await this.load(this.months[this._idx() - 1].period); },
  async goNext() { if (this.hasNext()) await this.load(this.months[this._idx() + 1].period); },

  // label of the month that "add next month" would create (one after the latest)
  nextLabel() {
    if (!this.months.length) return "";
    const [y, m] = this.months[this.months.length - 1].period.split("-").map(Number);
    const d = new Date(y, m, 1); // m (1-based) as 0-based index = next month
    return d.toLocaleString("en", { month: "long", year: "numeric" });
  },

  async addNextMonth() {
    this.loading = true; this._notify();
    const r = await this._json("/api/months/next", { method: "POST" });
    this.months = r.months;
    await this.load(r.period);
  },

  // ── mutations ──────────────────────────────────────────────────
  async saveRecord(kind, payload, id) {
    const ep = KIND_TO_EP[kind];
    const body = { ...payload, period: this.period };
    if (KIND_TO_CAT[kind]) body.cat = KIND_TO_CAT[kind];
    if (id != null) {
      await this._json(`/api/${ep}/${id}`, { method: "PUT", body: JSON.stringify(body) });
    } else {
      await this._json(`/api/${ep}`, { method: "POST", body: JSON.stringify(body) });
    }
    await this._refreshMonthsIfNeeded();
    await this.load(this.period);
  },

  async deleteRecord(kind, id) {
    await this._json(`/api/${KIND_TO_EP[kind]}/${id}`, { method: "DELETE" });
    await this.load(this.period);
  },

  async markPaid(id) {
    await this._json(`/api/bills/${id}/mark-paid`, { method: "POST" });
    await this.load(this.period);
  },

  async saveNote(body, id) {
    if (id != null) {
      await this._json(`/api/notes/${id}`, { method: "PUT", body: JSON.stringify({ body }) });
    } else {
      await this._json("/api/notes", { method: "POST", body: JSON.stringify({ body, period: this.period }) });
    }
    await this.load(this.period);
  },

  async deleteNote(id) {
    await this._json(`/api/notes/${id}`, { method: "DELETE" });
    await this.load(this.period);
  },

  // ── loan plans (admin) ─────────────────────────────────────────
  loanPlans: [],
  async loadLoanPlans() {
    const r = await this._json("/api/loan-plans");
    this.loanPlans = r.plans || [];
    this._notify();
    return this.loanPlans;
  },
  async saveLoanPlan(payload, id) {
    if (id != null) await this._json(`/api/loan-plans/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    else await this._json("/api/loan-plans", { method: "POST", body: JSON.stringify(payload) });
    await this.loadLoanPlans();
    await this.load(this.period);   // installments may have changed
  },
  async deleteLoanPlan(id) {
    await this._json(`/api/loan-plans/${id}`, { method: "DELETE" });
    await this.loadLoanPlans();
    await this.load(this.period);
  },
  // mark this month's installment for a plan paid/unpaid
  async payInstallment(planId, paid) {
    await this._json(`/api/loan-plans/${planId}/installment`, {
      method: "POST", body: JSON.stringify({ period: this.period, paid }),
    });
    await this.load(this.period);
  },

  // search across every month (server-side)
  async search(q) {
    const r = await this._json("/api/search?q=" + encodeURIComponent(q));
    return r.results || [];
  },

  // find a freshly-loaded record by id in the current month
  findRecord(kind, id) {
    if (kind === "meter") return this.METERS.find((m) => m.id === id);
    if (kind === "loan") return this.LOANS.find((l) => l.id === id);
    return this.ITEMS.find((i) => i.id === id);
  },

  async _refreshMonthsIfNeeded() {
    if (!this.months.find((x) => x.period === this.period)) {
      const m = await this._json("/api/months");
      this.months = m.months;
    }
  },
};

window.DINERO = store;
