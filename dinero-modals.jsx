/* global React */
// Dinero — Modals (Add + Edit) and supporting form primitives
const { useEffect: useEffectM, useState: useStateM } = React;
const Dm = window.DINERO;
const IconM = window.Icon;

const STATUS_OPTS = [
  { value: "paid", label: "Paid",    tone: "paid" },
  { value: "due",  label: "Due",     tone: "due" },
  { value: "over", label: "Overdue", tone: "over" },
  { value: "na",   label: "N/A",     tone: "na"  },
];
const METHOD_OPTS = ["Bank", "Credit", "Google Pay", "Cash", "Other"];

function Modal({ title, tag, sub, meta, children, footer, onClose, previewLabel }) {
  useEffectM(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}>
      {previewLabel && <div className="preview-label">preview · {previewLabel}</div>}
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-hd">
          <h2>{title}</h2>
          {tag && <span className="tag">{tag}</span>}
          <button className="x" onClick={onClose} aria-label="Close" type="button"><IconM.X /></button>
        </div>
        {sub && <div className="modal-sub">{sub}</div>}
        {meta}
        <div className="modal-body">{children}</div>
        {footer}
      </div>
    </div>
  );
}

function Field({ label, full, required, helper, error, prefix, children }) {
  return (
    <div className={"field" + (full ? " row-full" : "") + (prefix ? " has-prefix" : "") + (error ? " has-error" : "")}>
      <label>{label}{required && <span className="req">*</span>}</label>
      {prefix && <span className="prefix">{prefix}</span>}
      {children}
      {error ? <div className="helper field-error">{error}</div> : helper && <div className="helper">{helper}</div>}
    </div>
  );
}

// ── validation helpers (shared with the admin loan-plan form) ──
function reqText(v) {
  return String(v == null ? "" : v).trim() === "" ? "Required" : null;
}
function numCheck(v, { required = false, positive = false, integer = false, min } = {}) {
  const s = String(v == null ? "" : v).trim();
  if (s === "") return required ? "Required" : null;
  const n = Number(s);
  if (!isFinite(n)) return "Enter a number";
  if (integer && !Number.isInteger(n)) return "Whole number only";
  if (positive && n < 0) return "Must be 0 or more";
  if (min != null && n < min) return `Must be at least ${min}`;
  return null;
}

function Seg({ value, onChange, options }) {
  return (
    <div className="seg">
      {options.map(o => {
        const v = typeof o === "object" ? o.value : o;
        const l = typeof o === "object" ? o.label : o;
        const tone = typeof o === "object" ? o.tone : "";
        const on = v === value;
        return (
          <button key={v} type="button" className={"opt " + (tone || "") + (on ? " on" : "")} onClick={() => onChange(v)}>
            {tone && <span className="dot"></span>}{l}
          </button>
        );
      })}
    </div>
  );
}

function EditFooter({ editing, onClose, onSave, onDelete, saveLabel, ftnote }) {
  return (
    <div className="modal-foot">
      {editing
        ? <button className="btn btn-danger" type="button" onClick={onDelete}>Delete</button>
        : null}
      <span className="ftnote">{ftnote}</span>
      <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" type="button" onClick={onSave || onClose}>{saveLabel}</button>
    </div>
  );
}

function ModalMeta({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="modal-meta">
      {items.map((it, i) => (
        <span key={i}>{it.label} <b>{it.value}</b></span>
      ))}
    </div>
  );
}

const toIso = (d) => d || "";

// ─── Card ──────────────────────────────────────────────────────
function CardModal({ onClose, previewLabel, record, onSave, onDelete }) {
  const editing = !!record;
  const [s, setS] = useStateM({
    name:   record?.name   || "",
    amount: record ? String(record.amount || "") : "",
    min:    record ? String(record.min    || "") : "",
    due:    toIso(record?.due),
    status: record?.status  || "due",
    method: record?.paidVia || "Bank",
  });
  const payload = {
    name: s.name, amount: s.amount, min: s.min, due: s.due || null,
    status: s.status, paidVia: s.method,
    paidOn: record?.paidOn || null, paidAmt: record?.paidAmt ?? null,
  };
  const errs = {
    name: reqText(s.name),
    amount: numCheck(s.amount, { required: true, positive: true }),
    min: numCheck(s.min, { positive: true }),
  };
  const [showErr, setShowErr] = useStateM(false);
  const submit = () => { if (Object.values(errs).some(Boolean)) return setShowErr(true); onSave(payload); };
  return (
    <Modal
      title={editing ? "Edit card" : "Add card"}
      tag={editing ? "editing" : "credit card"}
      sub={editing ? `Updating ${record.name}.` : "A monthly credit-card statement to track."}
      onClose={onClose}
      previewLabel={previewLabel}
      meta={editing && <ModalMeta items={[
        { label: "id",       value: record.id },
        { label: "category", value: record.cat },
        record.paidOn ? { label: "paid on", value: record.paidOn } : null,
      ].filter(Boolean)} />}
      footer={
        <EditFooter editing={editing} onClose={onClose} onSave={submit} onDelete={onDelete}
          saveLabel={editing ? "Save changes" : "Save card"}
          ftnote={editing ? "Last edited just now." : "Outstanding rolls over month-to-month."} />
      }
    >
      <Field label="Card name" required error={showErr ? errs.name : null}>
        <input value={s.name} onChange={e => setS({ ...s, name: e.target.value })} placeholder="e.g. NTB Mastercard" />
      </Field>
      <Field label="Outstanding amount" prefix={Dm.CURRENCY} required error={showErr ? errs.amount : null}>
        <input inputMode="decimal" value={s.amount} onChange={e => setS({ ...s, amount: e.target.value })} placeholder="0.00" />
      </Field>
      <Field label="Minimum payment" prefix={Dm.CURRENCY} error={showErr ? errs.min : null}>
        <input inputMode="decimal" value={s.min} onChange={e => setS({ ...s, min: e.target.value })} placeholder="0.00" />
      </Field>
      <Field label="Due date">
        <input type="date" value={s.due} onChange={e => setS({ ...s, due: e.target.value })} />
      </Field>
      <Field label="Status" full>
        <Seg value={s.status} onChange={v => setS({ ...s, status: v })} options={STATUS_OPTS} />
      </Field>
      <Field label="Payment method" full>
        <Seg value={s.method} onChange={v => setS({ ...s, method: v })} options={METHOD_OPTS} />
      </Field>
    </Modal>
  );
}

// ─── Utility ───────────────────────────────────────────────────
function UtilityModal({ onClose, previewLabel, record, onSave, onDelete }) {
  const editing = !!record;
  const [s, setS] = useStateM({
    name:   record?.name   || "",
    amount: record ? String(record.amount || "") : "",
    due:    toIso(record?.due),
    status: record?.status  || "due",
    method: record?.paidVia || "Credit",
    paidOn: toIso(record?.paidOn),
  });
  const payload = {
    name: s.name, amount: s.amount, due: s.due || null, status: s.status,
    paidVia: s.method, paidOn: s.paidOn || null, paidAmt: record?.paidAmt ?? null,
  };
  const errs = {
    name: reqText(s.name),
    amount: numCheck(s.amount, { required: true, positive: true }),
  };
  const [showErr, setShowErr] = useStateM(false);
  const submit = () => { if (Object.values(errs).some(Boolean)) return setShowErr(true); onSave(payload); };
  return (
    <Modal
      title={editing ? "Edit utility" : "Add utility"}
      tag={editing ? "editing" : "bill"}
      sub={editing ? `Updating ${record.name}.` : "Electricity, water, internet, TV…"}
      onClose={onClose}
      previewLabel={previewLabel}
      meta={editing && <ModalMeta items={[
        { label: "id",       value: record.id },
        { label: "category", value: record.cat },
        record.paidOn ? { label: "paid on", value: record.paidOn } : null,
      ].filter(Boolean)} />}
      footer={
        <EditFooter editing={editing} onClose={onClose} onSave={submit} onDelete={onDelete}
          saveLabel={editing ? "Save changes" : "Save utility"}
          ftnote={editing ? "Last edited just now." : "Tip — link a meter to auto-fill the amount."} />
      }
    >
      <Field label="Utility name" required error={showErr ? errs.name : null}>
        <input value={s.name} onChange={e => setS({ ...s, name: e.target.value })} placeholder="e.g. SLT, Water…" />
      </Field>
      <Field label="Amount" prefix={Dm.CURRENCY} required error={showErr ? errs.amount : null}>
        <input inputMode="decimal" value={s.amount} onChange={e => setS({ ...s, amount: e.target.value })} placeholder="0.00" />
      </Field>
      <Field label="Due date">
        <input type="date" value={s.due} onChange={e => setS({ ...s, due: e.target.value })} />
      </Field>
      <Field label="Paid on">
        <input type="date" value={s.paidOn} onChange={e => setS({ ...s, paidOn: e.target.value })} />
      </Field>
      <Field label="Status" full>
        <Seg value={s.status} onChange={v => setS({ ...s, status: v })} options={STATUS_OPTS} />
      </Field>
      <Field label="Payment method" full>
        <Seg value={s.method} onChange={v => setS({ ...s, method: v })} options={METHOD_OPTS} />
      </Field>
    </Modal>
  );
}

// ─── Subscription ──────────────────────────────────────────────
function SubscriptionModal({ onClose, previewLabel, record, onSave, onDelete }) {
  const editing = !!record;
  const [s, setS] = useStateM({
    name:    record?.name    || "",
    amount:  record ? String(record.amount || "") : "",
    due:     toIso(record?.due),
    method:  record?.paidVia || "Credit",
    cadence: record?.cadence || "monthly",
  });
  const payload = {
    name: s.name, amount: s.amount, due: s.due || null, paidVia: s.method,
    cadence: s.cadence, status: record?.status || "due",
    paidOn: record?.paidOn || null, paidAmt: record?.paidAmt ?? null,
  };
  const errs = {
    name: reqText(s.name),
    amount: numCheck(s.amount, { required: true, positive: true }),
  };
  const [showErr, setShowErr] = useStateM(false);
  const submit = () => { if (Object.values(errs).some(Boolean)) return setShowErr(true); onSave(payload); };
  return (
    <Modal
      title={editing ? "Edit subscription" : "Add subscription"}
      tag={editing ? "editing" : "recurring"}
      sub={editing ? `Updating ${record.name}.` : "A bill that repeats on a schedule."}
      onClose={onClose}
      previewLabel={previewLabel}
      meta={editing && <ModalMeta items={[
        { label: "id",       value: record.id },
        { label: "category", value: record.cat },
      ]} />}
      footer={
        <EditFooter editing={editing} onClose={onClose} onSave={submit} onDelete={onDelete}
          saveLabel={editing ? "Save changes" : "Save subscription"}
          ftnote={editing ? "Last edited just now." : "Auto-rolls every cycle."} />
      }
    >
      <Field label="Service name" required error={showErr ? errs.name : null}>
        <input value={s.name} onChange={e => setS({ ...s, name: e.target.value })} placeholder="e.g. Spotify, Netflix…" />
      </Field>
      <Field label="Amount" prefix={Dm.CURRENCY} required error={showErr ? errs.amount : null}>
        <input inputMode="decimal" value={s.amount} onChange={e => setS({ ...s, amount: e.target.value })} placeholder="0.00" />
      </Field>
      <Field label="Renews on">
        <input type="date" value={s.due} onChange={e => setS({ ...s, due: e.target.value })} />
      </Field>
      <Field label="Cadence">
        <select value={s.cadence} onChange={e => setS({ ...s, cadence: e.target.value })}>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
      </Field>
      <Field label="Payment method" full>
        <Seg value={s.method} onChange={v => setS({ ...s, method: v })} options={METHOD_OPTS} />
      </Field>
    </Modal>
  );
}

// ─── Meter ────────────────────────────────────────────────────
function MeterModal({ onClose, previewLabel, record, onSave, onDelete }) {
  // A record without an id is a "log this standard meter" preset → add mode.
  const editing = !!(record && record.id);
  const [s, setS] = useStateM({
    kind:    record?.name    || "Electricity",
    reading: editing ? String(record.last || "") : "",
    date:    "",
    unit:    record?.unit    || "kWh",
    note:    record?.note || "",
  });
  const payload = { name: s.kind, reading: s.reading, unit: s.unit, date: s.date || null, note: s.note || null };
  const errs = { reading: numCheck(s.reading, { required: true, positive: true }) };
  const [showErr, setShowErr] = useStateM(false);
  const submit = () => { if (Object.values(errs).some(Boolean)) return setShowErr(true); onSave(payload); };
  return (
    <Modal
      title={editing ? "Edit meter reading" : "Add meter reading"}
      tag={editing ? "editing" : "reading"}
      sub={editing ? `Updating ${record.name} reading.` : "Log a new usage reading for tracking."}
      onClose={onClose}
      previewLabel={previewLabel}
      meta={editing && record && <ModalMeta items={[
        { label: "previous", value: `${record.prev}${record.unit}` },
        { label: "delta",    value: `+${record.last - record.prev}` },
      ]} />}
      footer={
        <EditFooter editing={editing} onClose={onClose} onSave={submit} onDelete={onDelete}
          saveLabel={editing ? "Save changes" : "Save reading"}
          ftnote={editing ? `Previous ${record.name}: ${record.prev}${record.unit}` : "Logs build the consumption trend."} />
      }
    >
      <Field label="Meter" full>
        <Seg value={s.kind}
             onChange={v => setS({ ...s, kind: v, unit: v === "Water" ? "m³" : "kWh" })}
             options={["Electricity", "Water", "Other"]} />
      </Field>
      <Field label={`Current reading (${s.unit})`} required error={showErr ? errs.reading : null}>
        <input inputMode="decimal" value={s.reading} onChange={e => setS({ ...s, reading: e.target.value })} placeholder="0" />
      </Field>
      <Field label="Reading date">
        <input type="date" value={s.date} onChange={e => setS({ ...s, date: e.target.value })} />
      </Field>
      <Field label="Note" full>
        <input value={s.note} onChange={e => setS({ ...s, note: e.target.value })} placeholder="anything to remember…" />
      </Field>
    </Modal>
  );
}

// ─── Loan ─────────────────────────────────────────────────────
function LoanModal({ onClose, previewLabel, record, onSave, onDelete }) {
  const editing = !!record;
  const [s, setS] = useStateM({
    name:   record?.name   || "",
    amount: record ? String(record.amount || "") : "",
    status: record?.status || "ongoing",
    paidOn: "",
  });
  const payload = { name: s.name, amount: s.amount, status: s.status, paidOn: s.paidOn || null };
  const errs = {
    name: reqText(s.name),
    amount: numCheck(s.amount, { required: true, positive: true }),
  };
  const [showErr, setShowErr] = useStateM(false);
  const submit = () => { if (Object.values(errs).some(Boolean)) return setShowErr(true); onSave(payload); };
  return (
    <Modal
      title={editing ? "Edit loan" : "Add loan payment"}
      tag={editing ? "editing" : "loan"}
      sub={editing ? `Updating ${record.name}.` : "A loan installment or repayment."}
      onClose={onClose}
      previewLabel={previewLabel}
      meta={editing && record && <ModalMeta items={[
        { label: "id",     value: record.id },
        { label: "status", value: record.status },
      ]} />}
      footer={
        <EditFooter editing={editing} onClose={onClose} onSave={submit} onDelete={onDelete}
          saveLabel={editing ? "Save changes" : "Save loan"}
          ftnote={editing ? "Last edited just now." : "Mark done once cleared."} />
      }
    >
      <Field label="Loan name" required error={showErr ? errs.name : null}>
        <input value={s.name} onChange={e => setS({ ...s, name: e.target.value })} placeholder="e.g. NTB, LOLC…" />
      </Field>
      <Field label="Amount" prefix={Dm.CURRENCY} required error={showErr ? errs.amount : null}>
        <input inputMode="decimal" value={s.amount} onChange={e => setS({ ...s, amount: e.target.value })} placeholder="0" />
      </Field>
      <Field label="Status" full>
        <Seg value={s.status} onChange={v => setS({ ...s, status: v })}
             options={[
               { value: "ongoing", label: "Ongoing", tone: "due" },
               { value: "done",    label: "Done",    tone: "paid" },
             ]} />
      </Field>
      <Field label="Paid on">
        <input type="date" value={s.paidOn} onChange={e => setS({ ...s, paidOn: e.target.value })} />
      </Field>
    </Modal>
  );
}

const MODAL_MAP = {
  card:         { Component: CardModal,         label: "Add card" },
  utility:      { Component: UtilityModal,      label: "Add utility" },
  subscription: { Component: SubscriptionModal, label: "Add subscription" },
  meter:        { Component: MeterModal,        label: "Add meter reading" },
  loan:         { Component: LoanModal,         label: "Add loan" },
};

// reqText/numCheck are shared with dinero-admin.jsx — under the old in-browser
// Babel they leaked into the global scope implicitly; as bundled modules they
// must be exported explicitly.
Object.assign(window, { Modal, Field, Seg, EditFooter, ModalMeta, MODAL_MAP, reqText, numCheck });
