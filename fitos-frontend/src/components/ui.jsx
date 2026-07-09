import { useEffect, useState, createContext, useContext } from 'react';

/* ═══ Toast ═══ */
const ToastCtx = createContext(null);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = (msg, type = 'success') => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg ${
            t.type === 'error' ? 'bg-gd-red text-white' : 'bg-gd-green text-gd-bg'}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ═══ StatCard ═══ */
export function StatCard({ label, value, color = 'text-gd-head' }) {
  return (
    <div className="card text-center">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gd-sub mt-0.5">{label}</div>
    </div>
  );
}

/* ═══ Modal ═══ */
export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-gd-card border border-gd-border rounded-xl p-5 w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[85vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-gd-head font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gd-sub hover:text-gd-text">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ═══ Field ═══ */
export function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-gd-sub mb-1">{label}</label>
      {children}
    </div>
  );
}

/* ═══ Tabs ═══ */
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {tabs.map((t) => (
        <button key={t} onClick={() => onChange(t)}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            active === t ? 'bg-gd-green/15 text-gd-green' : 'bg-gd-border text-gd-sub hover:text-gd-text'}`}>
          {t}
        </button>
      ))}
    </div>
  );
}

/* ═══ Spinner + Empty ═══ */
export const Spinner = () => <div className="text-center py-10 text-gd-sub text-sm">Loading…</div>;
export const Empty = ({ msg = 'No data yet' }) => <div className="text-center py-10 text-gd-sub text-sm">{msg}</div>;

/* ═══ Status badge helper ═══ */
export function StatusBadge({ status }) {
  const map = {
    active: 'badge-green', paid: 'badge-green', confirmed: 'badge-blue', converted: 'badge-green',
    completed: 'badge-green', present: 'badge-green', scheduled: 'badge-blue',
    expired: 'badge-red', suspended: 'badge-red', failed: 'badge-red', no_show: 'badge-red', absent: 'badge-red',
    pending: 'badge-amber', expiring: 'badge-amber', attended: 'badge-purple', halted: 'badge-amber',
  };
  return <span className={map[status] || 'badge bg-gd-border text-gd-sub'}>{status}</span>;
}

export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
