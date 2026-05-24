/* global React, ReactDOM */
const { useEffect: useEffectA, useState: useStateA } = React;
const DA = window.DINERO;
const IconA = window.Icon;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#2d5f4f",
  "density": "regular",
  "previewModal": "none",
  "showCards": true,
  "showUtilities": true,
  "showSubs": true,
  "showMeters": true,
  "showLoans": true,
  "showNotes": true,
  "showWeek": true,
  "weekDays": 7,
  "showTrend": true,
  "showMonthBar": true,
  "showOverdue": true
}/*EDITMODE-END*/;

// Each accent carries its rgb (for building translucent soft fills) and a dark-mode
// "ink" shade. The near-black "ink" accent also gets a light substitute for dark mode
// so it stays visible.
const ACCENTS = {
  "#2d5f4f": { rgb: "45, 95, 79",  ink: "#1f4337", inkDark: "#74b39c" },                                  // forest
  "#3a4a6b": { rgb: "58, 74, 107", ink: "#283454", inkDark: "#97a6cc" },                                  // indigo
  "#9a4a2b": { rgb: "154, 74, 43", ink: "#6f361f", inkDark: "#d68f6f" },                                  // terracotta
  "#5a3d6e": { rgb: "90, 61, 110", ink: "#3f2b50", inkDark: "#b095c9" },                                  // plum
  "#1a1814": { rgb: "26, 24, 20",  ink: "#000000", inkDark: "#1a1814", accentDark: "#d8d3c9", rgbDark: "216, 211, 201" }, // ink
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [openKind, setOpenKind] = useStateA(null);
  const [editingRecord, setEditingRecord] = useStateA(null);
  const [isPreview, setIsPreview] = useStateA(false);
  const [, forceRender] = useStateA(0);
  const [searchOpen, setSearchOpen] = useStateA(false);
  const [filter, setFilter] = useStateA("all");
  const [statusFilter, setStatusFilter] = useStateA("all");
  const [theme, setTheme] = useStateA(() =>
    document.documentElement.getAttribute("data-theme")
    || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

  // load data from the API and re-render whenever the store changes
  useEffectA(() => {
    const unsub = DA.subscribe(() => forceRender((x) => x + 1));
    DA.init();
    return unsub;
  }, []);

  // apply + persist the light/dark theme
  useEffectA(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("dinero-theme", theme); } catch (e) {}
  }, [theme]);

  // ⌘K / Ctrl-K (or "/") opens search
  useEffectA(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setSearchOpen(true);
      } else if (e.key === "/" && !/^(input|textarea|select)$/i.test(e.target.tagName) && !e.target.isContentEditable) {
        e.preventDefault(); setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSearchPick = async (entry) => {
    setSearchOpen(false);
    if (entry.period && entry.period !== DA.period) {
      await DA.load(entry.period);            // jump to the record's month
    }
    if (entry.kind === "note") return;        // note lives in that month's panel
    const fresh = DA.findRecord(entry.kind, entry.record.id) || entry.record;
    openModal(entry.kind, fresh);             // open the record's edit modal
  };

  // accent + density (accent vars are theme-aware)
  useEffectA(() => {
    const dark = theme === "dark";
    const a = ACCENTS[t.accent] || ACCENTS["#2d5f4f"];
    const accent = dark && a.accentDark ? a.accentDark : t.accent;
    const rgb = dark && a.rgbDark ? a.rgbDark : a.rgb;
    const root = document.documentElement.style;
    root.setProperty("--accent", accent);
    root.setProperty("--accent-ink", dark ? a.inkDark : a.ink);
    root.setProperty("--accent-soft", `rgba(${rgb}, ${dark ? 0.20 : 0.08})`);
    root.setProperty("--paid", accent);
    root.setProperty("--paid-soft", `rgba(${rgb}, ${dark ? 0.24 : 0.10})`);
    document.documentElement.setAttribute("data-density", t.density);
  }, [t.accent, t.density, theme]);

  // preview-driven modal
  useEffectA(() => {
    const pm = t.previewModal;
    if (pm && pm !== "none") {
      if (pm.startsWith("edit-")) {
        const kind = pm.slice(5);
        const sample = (
          kind === "card"         ? DA.ITEMS.find(i => i.cat === "Card" && i.status !== "na")
        : kind === "utility"      ? DA.ITEMS.find(i => i.cat === "Utility" && i.status === "over")
        : kind === "subscription" ? DA.ITEMS.find(i => i.cat === "Subscription")
        : kind === "meter"        ? DA.METERS[0]
        : kind === "loan"         ? DA.LOANS[0]
        : null);
        setOpenKind(kind);
        setEditingRecord(sample);
        setIsPreview(true);
      } else {
        setOpenKind(pm);
        setEditingRecord(null);
        setIsPreview(true);
      }
    } else if (isPreview) {
      setOpenKind(null);
      setEditingRecord(null);
      setIsPreview(false);
    }
  }, [t.previewModal]);

  const openModal = (kind, record = null) => {
    setIsPreview(false);
    setOpenKind(kind);
    setEditingRecord(record);
  };
  const editModal = (kind, record) => openModal(kind, record);
  const closeModal = () => {
    setOpenKind(null);
    setEditingRecord(null);
    setIsPreview(false);
    if (t.previewModal !== "none") setTweak("previewModal", "none");
  };

  // persist a record (create or update), unless this is a tweaks-driven preview
  const persistRecord = async (payload) => {
    if (isPreview) { closeModal(); return; }
    try {
      await DA.saveRecord(openKind, payload, editingRecord ? editingRecord.id : null);
    } catch (e) {
      alert("Save failed: " + e.message);
      return;
    }
    closeModal();
  };
  const handleDelete = async () => {
    if (isPreview || !editingRecord) { closeModal(); return; }
    try {
      await DA.deleteRecord(openKind, editingRecord.id);
    } catch (e) {
      alert("Delete failed: " + e.message);
      return;
    }
    closeModal();
  };
  const handleMarkPaid = async (item) => {
    try { await DA.markPaid(item.id); }
    catch (e) { alert("Mark paid failed: " + e.message); }
  };

  const sections = {
    cards: t.showCards, utilities: t.showUtilities, subs: t.showSubs,
    meters: t.showMeters, loans: t.showLoans
  };

  const cardT = DA.totals("Card");
  const utilT = DA.totals("Utility");
  const subT  = DA.totals("Subscription");

  // ── filters ───────────────────────────────────────────────
  // category filter picks which sections show; status filter narrows bill rows.
  const setCategory = (key) => {
    setFilter(key);
    if (key === "loans" || key === "meters") setStatusFilter("all"); // status doesn't apply
  };
  const matchStatus = (s) =>
    statusFilter === "all" ? true
    : statusFilter === "paid" ? s === "paid"
    : statusFilter === "over" ? s === "over"
    : statusFilter === "unpaid" ? (s === "due" || s === "over")
    : true;
  const cardF = cardT.items.filter((i) => matchStatus(i.status));
  const utilF = utilT.items.filter((i) => matchStatus(i.status));
  const subF  = subT.items.filter((i) => matchStatus(i.status));

  const catAllows = (key) => filter === "all" || filter === key;
  const showBill  = (key, items) => sections[key] && catAllows(key) && (statusFilter === "all" || items.length > 0);
  const showOther = (key) => sections[key] && catAllows(key) && statusFilter === "all";
  const showNotes = t.showNotes && filter === "all" && statusFilter === "all";
  const anyVisible = showBill("cards", cardF) || showBill("utilities", utilF) || showBill("subs", subF)
    || showOther("meters") || showOther("loans") || showNotes;
  const clearFilters = () => { setFilter("all"); setStatusFilter("all"); };

  const ModalEntry = openKind && window.MODAL_MAP[openKind];

  return (
    <div className="app">
      <header className="app-head">
        <div className="brand"><span className="brand-dot"></span>Dinero</div>
        <span className="breadcrumb">
          {DA.error ? "⚠ backend offline — run python backend/app.py"
            : DA.period ? `${DA.monthName} ${DA.yearStr}` : "Loading…"}
        </span>
        <span className="spacer"></span>
        <div className="head-actions">
          <button className="icon-btn" type="button" aria-label="Search" title="Search (⌘K)"
            onClick={() => setSearchOpen(true)}><IconA.Search /></button>
          <button className="icon-btn" type="button"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <IconA.Sun /> : <IconA.Moon />}
          </button>
        </div>
      </header>

      <Sidebar
        sections={sections}
        showTrend={t.showTrend}
        showMonthBar={t.showMonthBar}
        showOverdue={t.showOverdue}
        onAddBill={openModal}
        filter={filter}
        onFilter={setCategory}
        statusFilter={statusFilter}
        onStatus={setStatusFilter}
        onClear={clearFilters}
      />

      <main className="main" data-screen-label="Dashboard">
        {t.showWeek && <WeekStrip days={t.weekDays} />}

        {anyVisible ? (
          <div className="main-cols">
            <div>
              {showBill("cards", cardF) && (
                <BillSection
                  title="Cards"
                  subtitle={`${cardF.length} cards`}
                  kind="card"
                  items={cardF}
                  totalsLine={{ label: "Total outstanding", value: DA.fmtInt(cardT.owed) }}
                  onEdit={editModal}
                  onMarkPaid={handleMarkPaid}
                  onAdd={() => openModal("card")}
                />
              )}
              {showBill("utilities", utilF) && (
                <BillSection
                  title="Utilities"
                  subtitle={`${utilF.length} bills`}
                  kind="utility"
                  items={utilF}
                  totalsLine={{
                    label: "Outstanding · Paid",
                    value: <>{DA.fmtInt(utilT.owed)} <span className="muted">· </span><span className="accent">{DA.fmtInt(utilT.paid)}</span></>
                  }}
                  onEdit={editModal}
                  onMarkPaid={handleMarkPaid}
                  onAdd={() => openModal("utility")}
                />
              )}
              {showBill("subs", subF) && (
                <BillSection
                  title="Subscriptions"
                  subtitle={`${subF.length} recurring`}
                  kind="subscription"
                  items={subF}
                  totalsLine={{ label: "Monthly total", value: DA.fmtInt(subT.total) }}
                  onEdit={editModal}
                  onMarkPaid={handleMarkPaid}
                  onAdd={() => openModal("subscription")}
                />
              )}
            </div>

            <div>
              {showOther("meters") && <MetersSection onEdit={editModal} onAdd={() => openModal("meter")} />}
              {showOther("loans")  && <LoansSection  onEdit={editModal} onAdd={() => openModal("loan")} />}
              {showNotes && <NotesSection />}
            </div>
          </div>
        ) : (
          <div className="filter-empty">
            <div>No items match this filter.</div>
            <button className="btn btn-ghost" type="button" onClick={clearFilters}>Clear filters</button>
          </div>
        )}
      </main>

      <div className="foot">Dinero · personal expense tracker · {DA.monthName} {DA.yearStr}</div>

      {searchOpen && (
        <SearchPalette onClose={() => setSearchOpen(false)} onPick={handleSearchPick} />
      )}

      {ModalEntry && (
        <ModalEntry.Component
          onClose={closeModal}
          record={editingRecord}
          onSave={persistRecord}
          onDelete={handleDelete}
          previewLabel={isPreview ? (editingRecord ? `Edit ${ModalEntry.label.replace(/^Add /, "")}` : ModalEntry.label) : null}
        />
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme" />
        <TweakColor
          label="Accent"
          value={t.accent}
          options={["#2d5f4f", "#3a4a6b", "#9a4a2b", "#5a3d6e", "#1a1814"]}
          onChange={(v) => setTweak("accent", v)}
        />
        <TweakRadio
          label="Density"
          value={t.density}
          options={[
            { value: "compact", label: "Compact" },
            { value: "regular", label: "Regular" },
          ]}
          onChange={(v) => setTweak("density", v)}
        />

        <TweakSection label="Preview modals" />
        <TweakSelect
          label="Open modal"
          value={t.previewModal}
          options={[
            { value: "none",              label: "— closed —" },
            { value: "card",              label: "Add Card" },
            { value: "utility",           label: "Add Utility" },
            { value: "subscription",      label: "Add Subscription" },
            { value: "meter",             label: "Add Meter Reading" },
            { value: "loan",              label: "Add Loan" },
            { value: "edit-card",         label: "Edit Card (Commercial)" },
            { value: "edit-utility",      label: "Edit Utility (SLT)" },
            { value: "edit-subscription", label: "Edit Sub (WebStorm)" },
            { value: "edit-meter",        label: "Edit Meter (Electricity)" },
            { value: "edit-loan",         label: "Edit Loan (NTB)" },
          ]}
          onChange={(v) => setTweak("previewModal", v)}
        />

        <TweakSection label="Sidebar" />
        <TweakToggle label="Month progress" value={t.showMonthBar} onChange={(v) => setTweak("showMonthBar", v)} />
        <TweakToggle label="Overdue strip"  value={t.showOverdue}  onChange={(v) => setTweak("showOverdue", v)} />
        <TweakToggle label="6-month trend"  value={t.showTrend}    onChange={(v) => setTweak("showTrend", v)} />

        <TweakSection label="Main" />
        <TweakToggle label="Week strip"     value={t.showWeek}     onChange={(v) => setTweak("showWeek", v)} />
        <TweakSlider label="Strip length" value={t.weekDays} min={5} max={14} step={1} unit=" days"
                     onChange={(v) => setTweak("weekDays", v)} />
        <TweakToggle label="Notes"          value={t.showNotes}    onChange={(v) => setTweak("showNotes", v)} />

        <TweakSection label="Sections" />
        <TweakToggle label="Cards"          value={t.showCards}    onChange={(v) => setTweak("showCards", v)} />
        <TweakToggle label="Utilities"      value={t.showUtilities} onChange={(v) => setTweak("showUtilities", v)} />
        <TweakToggle label="Subscriptions"  value={t.showSubs}     onChange={(v) => setTweak("showSubs", v)} />
        <TweakToggle label="Meter readings" value={t.showMeters}   onChange={(v) => setTweak("showMeters", v)} />
        <TweakToggle label="Loans"          value={t.showLoans}    onChange={(v) => setTweak("showLoans", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
