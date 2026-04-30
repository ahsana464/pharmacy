import { useState, useMemo, useEffect, useCallback } from "react";

const API = "https://satisfied-embrace-production-9c4e.up.railway.app/api";

const CATEGORIES = [
  "Analgesic", "Antibiotic", "Antiviral", "Antifungal",
  "Cardiovascular", "Diabetes", "Respiratory",
  "Gastrointestinal", "Vitamin / Supplement", "Other",
];

const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
const SOON_DAYS = 90;

function getStatus(expiry, qty, threshold) {
  const exp = new Date(expiry); exp.setHours(0, 0, 0, 0);
  const diff = Math.floor((exp - TODAY) / 86400000);
  if (diff < 0) return "expired";
  if (qty <= 0) return "out";
  if (qty <= threshold) return "low";
  if (diff <= SOON_DAYS) return "expiring";
  return "ok";
}

function daysLabel(expiry) {
  const exp = new Date(expiry); exp.setHours(0, 0, 0, 0);
  const diff = Math.floor((exp - TODAY) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  if (diff === 0) return "Today";
  return `${diff}d left`;
}

function fmtDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const STATUS_META = {
  expired:  { label: "Expired",        pill: "bg-red-100 text-red-700 border border-red-200" },
  expiring: { label: "Expiring Soon",  pill: "bg-amber-100 text-amber-700 border border-amber-200" },
  low:      { label: "Low Stock",      pill: "bg-orange-100 text-orange-700 border border-orange-200" },
  out:      { label: "Out of Stock",   pill: "bg-gray-100 text-gray-600 border border-gray-200" },
  ok:       { label: "Healthy",        pill: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
};

const STAT_CARDS = [
  { key: "total",    label: "Total Medicines", icon: "💊", color: "bg-blue-50 text-blue-600" },
  { key: "expired",  label: "Expired",         icon: "⛔", color: "bg-red-50 text-red-600" },
  { key: "expiring", label: "Expiring Soon",   icon: "⚠️", color: "bg-amber-50 text-amber-600" },
  { key: "low",      label: "Low Stock",       icon: "📉", color: "bg-orange-50 text-orange-600" },
  { key: "out",      label: "Out of Stock",    icon: "🚫", color: "bg-gray-50 text-gray-600" },
  { key: "ok",       label: "Healthy",         icon: "✅", color: "bg-emerald-50 text-emerald-600" },
];

const NAV = ["Dashboard", "Medicines", "Alerts", "Dispense Log"];

const EMPTY_FORM = { name: "", category: "Analgesic", batch: "", manufacturer: "", expiry: "", qty: "", price: "", threshold: "10" };

export default function PharmacyDashboard() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [apiError, setApiError]   = useState("");
  const [page, setPage]           = useState("Dashboard");
  const [search, setSearch]       = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState({});
  const [sortCol, setSortCol]     = useState("name");
  const [sortDir, setSortDir]     = useState("asc");
  const [deleteId, setDeleteId]   = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dispenseModal, setDispenseModal] = useState(null);
  const [dispenseQty, setDispenseQty]     = useState(1);
  const [dispenseLog, setDispenseLog]     = useState([]);
  const [saving, setSaving]       = useState(false);

  // ── Fetch all medicines from MongoDB ──────────────────────
  const fetchMedicines = useCallback(async () => {
    try {
      setLoading(true);
      setApiError("");
      const res = await fetch(`${API}/medicines`);
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      // MongoDB uses _id, map it to id for consistency
      setMedicines(data.map(m => ({ ...m, id: m._id })));
    } catch (err) {
      setApiError("Could not connect to server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch dispense logs ────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/dispense-logs`);
      if (!res.ok) return;
      const data = await res.json();
      setDispenseLog(data.map(l => ({ ...l, time: new Date(l.createdAt).toLocaleString("en-PK") })));
    } catch {}
  }, []);

  useEffect(() => {
    fetchMedicines();
    fetchLogs();
  }, [fetchMedicines, fetchLogs]);

  const stats = useMemo(() => {
    const s = { total: medicines.length, expired: 0, expiring: 0, low: 0, out: 0, ok: 0 };
    medicines.forEach(m => { s[getStatus(m.expiry, m.qty, m.threshold)]++; });
    return s;
  }, [medicines]);

  const filtered = useMemo(() => {
    return medicines
      .filter(m => {
        const st = getStatus(m.expiry, m.qty, m.threshold);
        const q = search.toLowerCase();
        return (
          (!q || m.name.toLowerCase().includes(q) || m.batch.toLowerCase().includes(q) || m.manufacturer.toLowerCase().includes(q)) &&
          (!filterCat || m.category === filterCat) &&
          (!filterStatus || st === filterStatus)
        );
      })
      .sort((a, b) => {
        let va = a[sortCol], vb = b[sortCol];
        if (sortCol === "expiry") { va = new Date(va); vb = new Date(vb); }
        if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
        return sortDir === "asc" ? va - vb : vb - va;
      });
  }, [medicines, search, filterCat, filterStatus, sortCol, sortDir]);

  const alerts = useMemo(() =>
    medicines.filter(m => getStatus(m.expiry, m.qty, m.threshold) !== "ok")
      .sort((a, b) => {
        const order = { expired: 0, out: 1, low: 2, expiring: 3 };
        return order[getStatus(a.expiry, a.qty, a.threshold)] - order[getStatus(b.expiry, b.qty, b.threshold)];
      }),
    [medicines]
  );

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  function SortIcon({ col }) {
    if (sortCol !== col) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1 text-blue-500">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.expiry) e.expiry = "Required";
    if (!form.qty || isNaN(form.qty) || Number(form.qty) < 0) e.qty = "Valid quantity required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Add medicine → POST to MongoDB ────────────────────────
  async function handleAdd() {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/medicines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:         form.name.trim(),
          category:     form.category,
          batch:        form.batch.trim() || "—",
          manufacturer: form.manufacturer.trim() || "—",
          expiry:       form.expiry,
          qty:          Number(form.qty),
          price:        Number(form.price) || 0,
          threshold:    Number(form.threshold) || 10,
        }),
      });
      if (!res.ok) throw new Error("Failed to add");
      const saved = await res.json();
      setMedicines(prev => [{ ...saved, id: saved._id }, ...prev]);
      setForm(EMPTY_FORM);
      setErrors({});
      setShowModal(false);
    } catch (err) {
      alert("Failed to add medicine. Is the server running?");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete medicine → DELETE from MongoDB ─────────────────
  async function handleDelete(id) {
    try {
      const res = await fetch(`${API}/medicines/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setMedicines(prev => prev.filter(m => m.id !== id));
      setDeleteId(null);
    } catch {
      alert("Failed to delete medicine.");
    }
  }

  // ── Dispense → PATCH qty in MongoDB ───────────────────────
  async function handleDispense() {
    const m = dispenseModal;
    if (!dispenseQty || dispenseQty < 1 || dispenseQty > m.qty) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/medicines/${m.id}/dispense`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty: dispenseQty }),
      });
      if (!res.ok) throw new Error("Dispense failed");
      const updated = await res.json();
      setMedicines(prev => prev.map(item => item.id === m.id ? { ...updated, id: updated._id } : item));

      // Save log to MongoDB
      const remaining = m.qty - dispenseQty;
      await fetch(`${API}/dispense-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicineId: m.id, name: m.name, batch: m.batch, qty: dispenseQty, remaining }),
      });
      setDispenseLog(prev => [{ id: Date.now(), name: m.name, batch: m.batch, qty: dispenseQty, remaining, time: new Date().toLocaleString("en-PK"), medicineId: m.id }, ...prev]);
      setDispenseModal(null);
      setDispenseQty(1);
    } catch {
      alert("Dispense failed. Is the server running?");
    } finally {
      setSaving(false);
    }
  }

  const totalValue = medicines.reduce((s, m) => s + m.price * m.qty, 0);


  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">

      {/* API Error Banner */}
      {apiError && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white text-sm text-center py-2 px-4">
          ⚠️ {apiError}
          <button onClick={fetchMedicines} className="ml-3 underline font-medium">Retry</button>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-56 bg-white border-r border-gray-100 flex flex-col transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0`}>
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">Rx</div>
            <div>
              <p className="text-sm font-semibold text-gray-800 leading-none">Doctors's Pharmacy</p>
              <p className="text-xs text-gray-400 mt-0.5">Inventory System</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(n => (
            <button
              key={n}
              onClick={() => { setPage(n); setSidebarOpen(false); setSearch(""); setFilterCat(""); setFilterStatus(""); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${page === n ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <span className="text-base">{n === "Dashboard" ? "🏠" : n === "Medicines" ? "💊" : n === "Alerts" ? "🔔" : "📋"}</span>
              {n}
              {n === "Alerts" && alerts.length > 0 && (
                <span className="ml-auto text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 font-semibold">{alerts.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">{new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "short", day: "numeric" })}</p>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top Bar */}
        <header className="bg-white border-b border-gray-100 px-5 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-gray-500 hover:text-gray-700" onClick={() => setSidebarOpen(true)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h1 className="text-base font-semibold text-gray-800">{page}</h1>
          </div>
          <button
            onClick={() => { setShowModal(true); setForm(EMPTY_FORM); setErrors({}); }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Add Medicine
          </button>
        </header>

        {/* Body */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading from MongoDB...</p>
            </div>
          ) : (<>

          {/* DASHBOARD */}
          {page === "Dashboard" && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                {STAT_CARDS.map(c => (
                  <div key={c.key} className="bg-white rounded-xl border border-gray-100 px-4 py-5 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 ${c.color}`}>{c.icon}</div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 truncate">{c.label}</p>
                      <p className="text-xl font-semibold text-gray-800 leading-tight">{stats[c.key]}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Inventory Value</p>
                  <p className="text-3xl font-semibold text-blue-600">Rs. {totalValue.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">Across {medicines.length} medicines</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Stock Health</p>
                  <div className="flex gap-1 h-4 rounded-full overflow-hidden">
                    {["ok","expiring","low","out","expired"].map(s => {
                      const pct = stats.total ? Math.round((stats[s] / stats.total) * 100) : 0;
                      const colors = { ok: "bg-emerald-400", expiring: "bg-amber-400", low: "bg-orange-400", out: "bg-gray-400", expired: "bg-red-400" };
                      return pct > 0 ? <div key={s} style={{ width: `${pct}%` }} className={`${colors[s]} transition-all`} title={`${STATUS_META[s].label}: ${stats[s]}`} /> : null;
                    })}
                  </div>
                  <div className="flex gap-3 mt-2 flex-wrap">
                    {["ok","expiring","low","out","expired"].map(s => (
                      <div key={s} className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${{ ok:"bg-emerald-400", expiring:"bg-amber-400", low:"bg-orange-400", out:"bg-gray-400", expired:"bg-red-400" }[s]}`} />
                        <span className="text-xs text-gray-500">{STATUS_META[s].label} ({stats[s]})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Recent Medicines</p>
                  <button onClick={() => setPage("Medicines")} className="text-xs text-blue-500 hover:underline">View all →</button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {["Name","Category","Expiry","Stock","Status"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs text-gray-400 font-medium uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {medicines.slice(0, 5).map(m => {
                      const s = getStatus(m.expiry, m.qty, m.threshold);
                      return (
                        <tr key={m.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{m.name}</td>
                          <td className="px-4 py-3 text-gray-500">{m.category}</td>
                          <td className="px-4 py-3 text-gray-600">{fmtDate(m.expiry)} <span className="text-xs text-gray-400">({daysLabel(m.expiry)})</span></td>
                          <td className="px-4 py-3 text-gray-600">{m.qty}</td>
                          <td className="px-4 py-3"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_META[s].pill}`}>{STATUS_META[s].label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MEDICINES */}
          {page === "Medicines" && (
            <div>
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 bg-white sm:flex-1 focus-within:border-blue-400 gap-2">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
                  <input
                    type="text"
                    placeholder="Search name, batch, manufacturer..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    autoComplete="off"
                    className="text-sm outline-none bg-transparent w-full text-gray-700 placeholder-gray-400"
                  />
                  {search && <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500 text-lg leading-none shrink-0">✕</button>}
                </div>
                <div className="flex gap-2">
                  <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="flex-1 sm:flex-none border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white text-gray-600 focus:border-blue-400">
                    <option value="">All Categories</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="flex-1 sm:flex-none border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white text-gray-600 focus:border-blue-400">
                    <option value="">All Status</option>
                    <option value="ok">Healthy</option>
                    <option value="expiring">Expiring Soon</option>
                    <option value="expired">Expired</option>
                    <option value="low">Low Stock</option>
                    <option value="out">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {[
                          { label: "Name", col: "name" }, { label: "Category", col: "category" },
                          { label: "Batch", col: "batch" }, { label: "Manufacturer", col: "manufacturer" },
                          { label: "Expiry", col: "expiry" }, { label: "Qty", col: "qty" },
                          { label: "Price (Rs.)", col: "price" }, { label: "Status", col: null },
                          { label: "Actions", col: null },
                        ].map(h => (
                          <th key={h.label} className={`px-4 py-3 text-left text-xs text-gray-400 font-medium uppercase tracking-wider ${h.col ? "cursor-pointer hover:text-gray-600 select-none" : ""}`}
                            onClick={() => h.col && handleSort(h.col)}>
                            {h.label}{h.col && <SortIcon col={h.col} />}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.length > 0 ? filtered.map(m => {
                        const s = getStatus(m.expiry, m.qty, m.threshold);
                        return (
                          <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{m.name}</td>
                            <td className="px-4 py-3 text-gray-500">{m.category}</td>
                            <td className="px-4 py-3 text-gray-500 font-mono text-xs">{m.batch}</td>
                            <td className="px-4 py-3 text-gray-500">{m.manufacturer}</td>
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                              {fmtDate(m.expiry)}
                              <span className="ml-1 text-xs text-gray-400">({daysLabel(m.expiry)})</span>
                            </td>
                            <td className="px-4 py-3 text-gray-700">{m.qty}</td>
                            <td className="px-4 py-3 text-gray-700">Rs. {m.price}</td>
                            <td className="px-4 py-3 whitespace-nowrap"><span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_META[s].pill}`}>{STATUS_META[s].label}</span></td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => { setDispenseModal(m); setDispenseQty(1); }}
                                  disabled={m.qty === 0}
                                  className="text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >Dispense</button>
                                <button onClick={() => setDeleteId(m.id)} className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors">Delete</button>
                              </div>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No medicines found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-400">{filtered.length} of {medicines.length} records</p>
                </div>
              </div>
            </div>
          )}

          {/* ALERTS */}
          {page === "Alerts" && (
            <div>
              {alerts.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                  <p className="text-4xl mb-3">✅</p>
                  <p className="text-gray-600 font-medium">All clear! No alerts at this time.</p>
                  <p className="text-gray-400 text-sm mt-1">All medicines are healthy and in stock.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map(m => {
                    const s = getStatus(m.expiry, m.qty, m.threshold);
                    const bg = { expired: "bg-red-50 border-red-200", expiring: "bg-amber-50 border-amber-200", low: "bg-orange-50 border-orange-200", out: "bg-gray-50 border-gray-200" }[s] || "bg-gray-50 border-gray-200";
                    return (
                      <div key={m.id} className={`rounded-xl border p-4 flex items-center justify-between gap-4 flex-wrap ${bg}`}>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_META[s].pill}`}>{STATUS_META[s].label}</span>
                            <span className="font-medium text-gray-800 text-sm">{m.name}</span>
                          </div>
                          <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                            <span>Batch: <span className="font-mono">{m.batch}</span></span>
                            <span>Expiry: {fmtDate(m.expiry)} ({daysLabel(m.expiry)})</span>
                            <span>Stock: {m.qty} units</span>
                            <span>Category: {m.category}</span>
                          </div>
                        </div>
                        <button onClick={() => setDeleteId(m.id)} className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">Remove</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {/* DISPENSE LOG */}
          {page === "Dispense Log" && (
            <div>
              {dispenseLog.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-gray-600 font-medium">No dispenses recorded yet.</p>
                  <p className="text-gray-400 text-sm mt-1">Use the Dispense button on the Medicines page to record a sale.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Dispense History</p>
                    <span className="text-xs text-gray-400">{dispenseLog.length} transaction(s)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[500px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          {["Medicine", "Batch", "Qty Dispensed", "Remaining Stock", "Status After", "Time"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-medium uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {dispenseLog.map(log => {
                          const med = medicines.find(m => m.id === log.medicineId);
                          const thresh = med ? med.threshold : 10;
                          const expiry = med ? med.expiry : null;
                          const s = expiry ? getStatus(expiry, log.remaining, thresh) : (log.remaining <= thresh ? "low" : "ok");
                          return (
                            <tr key={log.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-800">{log.name}</td>
                              <td className="px-4 py-3 text-gray-500 font-mono text-xs">{log.batch}</td>
                              <td className="px-4 py-3 text-blue-600 font-semibold">-{log.qty}</td>
                              <td className="px-4 py-3 text-gray-700">{log.remaining} units</td>
                              <td className="px-4 py-3"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_META[s].pill}`}>{STATUS_META[s].label}</span></td>
                              <td className="px-4 py-3 text-gray-400 text-xs">{log.time}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          </>)}
        </main>
      </div>

      {/* Saving overlay */}
      {saving && (
        <div className="fixed inset-0 z-50 bg-black/10 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-xl shadow-lg px-5 py-3 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <span className="text-sm text-gray-600">Saving to MongoDB...</span>
          </div>
        </div>
      )}

      {/* Dispense Modal */}
      {dispenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Dispense Medicine</h2>
              <button onClick={() => setDispenseModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1">
              <p className="text-sm font-medium text-gray-800">{dispenseModal.name}</p>
              <p className="text-xs text-gray-500">Batch: <span className="font-mono">{dispenseModal.batch}</span> · {dispenseModal.manufacturer}</p>
              <p className="text-xs text-gray-500">Current Stock: <span className="font-semibold text-gray-700">{dispenseModal.qty} units</span></p>
              <p className="text-xs text-gray-500">Low Stock Threshold: <span className="font-semibold text-gray-700">{dispenseModal.threshold} units</span></p>
            </div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Quantity to Dispense</label>
            <input
              type="number" min="1" max={dispenseModal.qty}
              value={dispenseQty}
              onChange={e => setDispenseQty(Math.max(1, Math.min(dispenseModal.qty, Number(e.target.value))))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 mb-3"
            />
            {dispenseQty > 0 && (
              <div className={`text-xs rounded-lg px-3 py-2 mb-4 font-medium ${
                dispenseModal.qty - dispenseQty <= 0
                  ? "bg-red-50 text-red-600"
                  : dispenseModal.qty - dispenseQty <= dispenseModal.threshold
                  ? "bg-orange-50 text-orange-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}>
                {dispenseModal.qty - dispenseQty <= 0
                  ? "⛔ Stock will reach 0 — out of stock!"
                  : dispenseModal.qty - dispenseQty <= dispenseModal.threshold
                  ? `⚠️ Stock will drop to ${dispenseModal.qty - dispenseQty} — below threshold! Will show as Low Stock.`
                  : `✅ Stock will remain at ${dispenseModal.qty - dispenseQty} units — healthy.`}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDispenseModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button
                onClick={handleDispense}
                disabled={!dispenseQty || dispenseQty < 1 || dispenseQty > dispenseModal.qty}
                className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >Confirm Dispense</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Add New Medicine</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {[
                { id: "name", label: "Medicine Name *", type: "text", placeholder: "e.g. Paracetamol 500mg", col: 2 },
                { id: "category", label: "Category", type: "select", col: 1 },
                { id: "batch", label: "Batch No.", type: "text", placeholder: "e.g. BT-2041", col: 1 },
                { id: "manufacturer", label: "Manufacturer", type: "text", placeholder: "e.g. PharmaCo", col: 1 },
                { id: "expiry", label: "Expiry Date *", type: "date", col: 1 },
                { id: "qty", label: "Quantity *", type: "number", placeholder: "0", col: 1 },
                { id: "price", label: "Price (Rs.)", type: "number", placeholder: "0.00", col: 1 },
                { id: "threshold", label: "Low Stock Threshold", type: "number", placeholder: "10", col: 2 },
              ].map(f => (
                <div key={f.id} className={f.col === 2 ? "sm:col-span-2" : ""}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                  {f.type === "select" ? (
                    <select value={form[f.id]} onChange={e => setForm(p => ({ ...p, [f.id]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white text-gray-700">
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input type={f.type} placeholder={f.placeholder} value={form[f.id]}
                      onChange={e => setForm(p => ({ ...p, [f.id]: e.target.value }))}
                      className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 ${errors[f.id] ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                    />
                  )}
                  {errors[f.id] && <p className="text-xs text-red-500 mt-0.5">{errors[f.id]}</p>}
                </div>
              ))}
            </div>
            <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleAdd} className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Add Medicine</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <p className="text-2xl mb-3">🗑️</p>
            <h2 className="font-semibold text-gray-800 mb-1">Delete Medicine?</h2>
            <p className="text-sm text-gray-500 mb-5">This will permanently remove the medicine from your inventory.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
