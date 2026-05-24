/* global React */
// Dinero — separate Admin section (loan-plan management) behind a simple login.
// NOTE: the admin/admin check is a client-side placeholder only — it is NOT real
// security (the API stays open and the credentials live in this file). Replace
// with server-side auth before relying on it.
const { useState: useStateAd, useEffect: useEffectAd } = React;
const DAdmin = window.DINERO;
const IconAd = window.Icon;

function AdminSection({ authed, onLogin, onExit, onLogout }) {
  // skip the login form if a valid session cookie already exists
  useEffectAd(() => {
    if (!authed) DAdmin.checkAdmin().then((ok) => { if (ok) onLogin(); });
  }, []);
  return (
    <div className="admin">
      <header className="admin-head">
        <div className="brand"><span className="brand-dot"></span>Dinero <span className="admin-tag">admin</span></div>
        <span className="spacer"></span>
        {authed && <button className="btn btn-ghost" type="button" onClick={onLogout}>Sign out</button>}
        <button className="btn btn-ghost" type="button" onClick={onExit}>← Back to app</button>
      </header>
      {authed ? <LoanPlansAdmin /> : <AdminLogin onLogin={onLogin} />}
    </div>
  );
}

function AdminLogin({ onLogin }) {
  const [u, setU] = useStateAd("");
  const [p, setP] = useStateAd("");
  const [err, setErr] = useStateAd("");
  const [busy, setBusy] = useStateAd(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await DAdmin.adminLogin(u.trim(), p);
    setBusy(false);
    if (ok) onLogin();
    else setErr("Invalid credentials — try admin / admin.");
  };
  return (
    <div className="admin-login">
      <form className="login-card" onSubmit={submit}>
        <h2>Admin sign in</h2>
        <p className="login-hint">Demo credentials: <b>admin</b> / <b>admin</b></p>
        <label>Username
          <input value={u} autoFocus onChange={(e) => setU(e.target.value)} />
        </label>
        <label>Password
          <input type="password" value={p} onChange={(e) => setP(e.target.value)} />
        </label>
        {err && <div className="login-err">{err}</div>}
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}

function LoanPlansAdmin() {
  const [, force] = useStateAd(0);
  const [editing, setEditing] = useStateAd(null); // a plan, or {} for new, or null
  useEffectAd(() => {
    const unsub = DAdmin.subscribe(() => force((x) => x + 1));
    DAdmin.loadLoanPlans();
    return unsub;
  }, []);
  const plans = DAdmin.loanPlans || [];

  const remove = (p) => {
    if (window.confirm(`Delete loan plan “${p.name}”? Its installments will disappear from the dashboard.`)) {
      DAdmin.deleteLoanPlan(p.id);
    }
  };

  return (
    <div className="admin-body">
      <div className="admin-section-head">
        <h1>Loan plans</h1>
        <button className="btn btn-primary" type="button" onClick={() => setEditing({})}>+ New loan plan</button>
      </div>
      <p className="admin-sub">
        Recurring loans. Each plan auto-creates a monthly installment in the dashboard’s
        Loans section for every month of its tenure — including months you create later.
      </p>

      {plans.length === 0 ? (
        <div className="admin-empty">No loan plans yet. Create one to start tracking installments.</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Total</th><th>Tenure</th><th>Monthly</th><th>Starts</th><th>Paid</th><th></th></tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id}>
                <td className="t-name">{p.name}</td>
                <td className="t-num">{DAdmin.fmtInt(p.totalAmount)}</td>
                <td className="t-num">{p.tenure} mo</td>
                <td className="t-num">{DAdmin.fmtInt(p.monthly)}</td>
                <td className="t-num">{p.startPeriod}</td>
                <td className="t-num">{p.paidCount}/{p.tenure}</td>
                <td className="t-actions">
                  <button className="btn-icon" type="button" title="Edit" aria-label="Edit" onClick={() => setEditing(p)}><IconAd.Pencil /></button>
                  <button className="btn-icon danger" type="button" title="Delete" aria-label="Delete" onClick={() => remove(p)}><IconAd.X /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && <LoanPlanForm plan={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function LoanPlanForm({ plan, onClose }) {
  const editing = !!plan.id;
  const [s, setS] = useStateAd({
    name:        plan.name || "",
    totalAmount: plan.totalAmount != null ? String(plan.totalAmount) : "",
    tenure:      plan.tenure != null ? String(plan.tenure) : "",
    monthly:     plan.monthly != null ? String(plan.monthly) : "",
    startPeriod: plan.startPeriod || DAdmin.period || "",
  });
  const errs = {
    name: reqText(s.name),
    tenure: numCheck(s.tenure, { required: true, integer: true, min: 1 }),
    monthly: numCheck(s.monthly, { required: true, positive: true }),
    totalAmount: numCheck(s.totalAmount, { positive: true }),
  };
  const [showErr, setShowErr] = useStateAd(false);
  const save = async () => {
    if (Object.values(errs).some(Boolean)) return setShowErr(true);
    await DAdmin.saveLoanPlan({
      name: s.name.trim(),
      totalAmount: Number(s.totalAmount) || 0,
      tenure: parseInt(s.tenure, 10) || 1,
      monthly: Number(s.monthly) || 0,
      startPeriod: s.startPeriod,
    }, plan.id);
    onClose();
  };
  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-hd">
          <h2>{editing ? "Edit loan plan" : "New loan plan"}</h2>
          <span className="tag">{editing ? "editing" : "recurring loan"}</span>
          <button className="x" type="button" onClick={onClose} aria-label="Close"><IconAd.X /></button>
        </div>
        <div className="modal-body">
          <Field label="Plan name" required error={showErr ? errs.name : null}>
            <input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} placeholder="e.g. NTB, LOLC…" />
          </Field>
          <Field label="Total amount" prefix={DAdmin.CURRENCY} error={showErr ? errs.totalAmount : null}>
            <input inputMode="decimal" value={s.totalAmount} onChange={(e) => setS({ ...s, totalAmount: e.target.value })} placeholder="0.00" />
          </Field>
          <Field label="Tenure (months)" required error={showErr ? errs.tenure : null}>
            <input inputMode="numeric" value={s.tenure} onChange={(e) => setS({ ...s, tenure: e.target.value })} placeholder="12" />
          </Field>
          <Field label="Monthly installment" prefix={DAdmin.CURRENCY} required error={showErr ? errs.monthly : null}>
            <input inputMode="decimal" value={s.monthly} onChange={(e) => setS({ ...s, monthly: e.target.value })} placeholder="0.00" />
          </Field>
          <Field label="Start month">
            <input type="month" value={s.startPeriod} onChange={(e) => setS({ ...s, startPeriod: e.target.value })} />
          </Field>
        </div>
        <div className="modal-foot">
          <span className="ftnote">Installments fill the Loans section across the tenure.</span>
          <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="button" onClick={save}>{editing ? "Save plan" : "Create plan"}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AdminSection });
