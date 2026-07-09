import { useEffect, useState } from 'react';
import api from '../api/client';
import { Tabs, Modal, Field, useToast, Spinner, Empty, StatCard, fmtMoney, fmtDate } from '../components/ui';

const CATS = ['rent', 'salary', 'electricity', 'equipment', 'maintenance', 'marketing', 'other'];

export default function Accounts() {
  const [tab, setTab] = useState('P&L');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [pl, setPl] = useState(null);
  const [expenses, setExpenses] = useState(null);
  const [add, setAdd] = useState(false);
  const [gated, setGated] = useState(false);
  const [f, setF] = useState({ category: 'rent', description: '', amount: '' });
  const toast = useToast();

  const load = () => {
    api.get('/accounts/pl', { params: { month } }).then((r) => { setPl(r.data); setGated(false); })
      .catch((e) => { if (e.response?.status === 403) setGated(true); });
    api.get('/accounts/expenses', { params: { month } }).then((r) => setExpenses(r.data.expenses)).catch(() => {});
  };
  useEffect(() => { load(); }, [month]);

  const save = async () => {
    try { await api.post('/accounts/expenses', f); toast('Expense logged'); setAdd(false); setF({ category: 'rent', description: '', amount: '' }); load(); }
    catch (e) { toast(e.response?.data?.error || 'Failed', 'error'); }
  };
  const del = async (id) => {
    try { await api.delete(`/accounts/expenses/${id}`); load(); } catch { toast('Failed', 'error'); }
  };

  if (gated) return (
    <div className="card max-w-md mx-auto mt-16 text-center">
      <div className="text-2xl mb-2">🔒</div>
      <div className="text-gd-head font-semibold mb-1">Accounts needs Basic plan</div>
      <div className="text-xs text-gd-sub mb-4">Expenses, P&L and GST tracking unlock on Basic (₹349/mo) and above.</div>
      <a href="/upgrade" className="btn-green inline-block">Upgrade →</a>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-gd-head font-semibold text-lg">Accounts</h1>
        <div className="flex gap-2">
          <input type="month" className="input !w-auto" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button className="btn-green" onClick={() => setAdd(true)}>+ Expense</button>
        </div>
      </div>
      <Tabs tabs={['P&L', 'Expenses']} active={tab} onChange={setTab} />

      {tab === 'P&L' && (!pl ? <Spinner /> : <>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatCard label="Revenue" value={fmtMoney(pl.revenue)} color="text-gd-green" />
          <StatCard label="Expenses" value={fmtMoney(pl.expenses)} color="text-gd-red" />
          <StatCard label="Net profit" value={fmtMoney(pl.net_profit)} color={pl.net_profit >= 0 ? 'text-gd-head' : 'text-gd-red'} />
        </div>
        <div className="card mb-4">
          <div className="text-sm font-medium text-gd-head mb-2">Expense breakdown</div>
          {(pl.expense_breakdown || []).filter(Boolean).map((c) => (
            <div key={c.category} className="flex justify-between text-sm py-1 border-b border-gd-border/30 last:border-0">
              <span className="badge-blue">{c.category}</span><span>{fmtMoney(c.total)}</span>
            </div>
          ))}
        </div>
        <div className="card bg-gd-amber/5 border-gd-amber/30 text-xs text-gd-amber">
          GST collected this month: {fmtMoney(pl.gst_collected)} — consult your CA for GSTR filing.
        </div>
      </>)}

      {tab === 'Expenses' && (!expenses ? <Spinner /> : expenses.length === 0 ? <Empty msg="No expenses this month" /> : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full min-w-[550px]">
            <thead><tr><th className="th">Date</th><th className="th">Category</th><th className="th">Description</th><th className="th">Amount</th><th className="th"></th></tr></thead>
            <tbody>{expenses.map((e) => (
              <tr key={e.id}>
                <td className="td">{fmtDate(e.date)}</td>
                <td className="td"><span className="badge-blue">{e.category}</span></td>
                <td className="td">{e.description}</td>
                <td className="td text-gd-red font-medium">{fmtMoney(e.amount)}</td>
                <td className="td"><button className="text-gd-sub hover:text-gd-red text-xs" onClick={() => del(e.id)}>✕</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ))}

      <Modal open={add} onClose={() => setAdd(false)} title="Log expense">
        <Field label="Category"><select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Description"><input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="Amount (₹)"><input type="number" className="input" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        <button className="btn-green w-full" disabled={!f.description || !f.amount} onClick={save}>Save expense</button>
      </Modal>
    </div>
  );
}
