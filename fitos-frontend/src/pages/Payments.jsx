import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client';
import { useAuth } from '../store/auth';
import { Tabs, Field, useToast, StatusBadge, StatCard, Spinner, fmtDate, fmtMoney } from '../components/ui';

export default function Payments() {
  const { user } = useAuth();
  if (user?.role !== 'gym_admin') return <Navigate to="/dashboard" replace />;
  return <PaymentsInner />;
}

function PaymentsInner() {
  const [tab, setTab] = useState('Record');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [member, setMember] = useState(null);
  const [method, setMethod] = useState('cash');
  const [amount, setAmount] = useState('');
  const [months, setMonths] = useState(1);
  const [history, setHistory] = useState(null);
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const t = setTimeout(() => api.get('/members', { params: { search } }).then((r) => setResults(r.data.members.slice(0, 5))), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (tab === 'History') api.get('/payments').then((r) => setHistory(r.data.payments));
    if (tab === 'Stats') api.get('/payments/stats').then((r) => setStats(r.data));
  }, [tab]);

  const gst = Math.round(Number(amount || 0) * 0.18 * 100) / 100;
  const total = Math.round((Number(amount || 0) + gst) * 100) / 100;

  const record = async () => {
    setBusy(true);
    try {
      if (method === 'razorpay') {
        const { data } = await api.post('/payments/razorpay/order', { amount: Number(amount) });
        const rz = new window.Razorpay({
          key: data.key_id, order_id: data.order.id, amount: data.order.amount, currency: 'INR',
          name: 'FitOS', description: `Membership — ${member.name}`,
          handler: async (resp) => {
            await api.post('/payments/razorpay/verify', { ...resp, member_id: member.id, amount: Number(amount), plan_months: months });
            toast('Payment verified ✅'); setMember(null); setAmount('');
          },
        });
        rz.open();
      } else {
        await api.post('/payments/record', { member_id: member.id, amount: Number(amount), method, plan_months: months });
        toast('Payment recorded! Expiry extended + WA sent ✅');
        setMember(null); setAmount(''); setSearch('');
      }
    } catch (e) { toast(e.response?.data?.error || 'Payment failed', 'error'); }
    setBusy(false);
  };

  const downloadInvoice = async (id) => {
    try {
      const res = await api.get(`/payments/${id}/invoice`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `invoice-${id.slice(0, 8)}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast('Invoice download failed', 'error'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-gd-head font-semibold text-lg">Payments</h1>
        <span className="badge-red">Admin only</span>
      </div>
      <Tabs tabs={['Record', 'History', 'Stats']} active={tab} onChange={setTab} />

      {tab === 'Record' && (
        <div className="card max-w-md">
          {!member ? <>
            <Field label="Search member"><input className="input" placeholder="Name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus /></Field>
            {results.map((m) => (
              <button key={m.id} onClick={() => setMember(m)} className="w-full flex justify-between p-3 mb-2 bg-gd-bg border border-gd-border rounded-lg hover:border-gd-green text-left">
                <div><div className="text-sm font-medium">{m.name}</div><div className="text-xs text-gd-sub">{m.phone} · expires {fmtDate(m.expires_at)}</div></div>
              </button>
            ))}
          </> : <>
            <div className="p-3 bg-gd-bg border border-gd-green rounded-lg mb-4 flex justify-between items-center">
              <div><div className="text-sm font-medium">{member.name}</div><div className="text-xs text-gd-sub">Expires {fmtDate(member.expires_at)}</div></div>
              <button className="text-xs text-gd-sub" onClick={() => setMember(null)}>Change</button>
            </div>
            <div className="flex gap-2 mb-4">
              {[['cash','💵 Cash'],['upi','📱 UPI'],['razorpay','💳 Razorpay']].map(([v, l]) => (
                <button key={v} onClick={() => setMethod(v)}
                  className={`flex-1 py-2 rounded-lg text-sm border ${method === v ? 'bg-gd-green/15 border-gd-green text-gd-green' : 'bg-gd-border border-gd-border text-gd-sub'}`}>{l}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹)"><input type="number" className="input text-lg font-bold" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
              <Field label="Plan months"><input type="number" min="1" className="input text-lg font-bold" value={months} onChange={(e) => setMonths(e.target.value)} /></Field>
            </div>
            <div className="p-3 bg-gd-bg rounded-lg text-sm mb-4">
              <div className="flex justify-between text-gd-sub"><span>Subtotal</span><span>{fmtMoney(amount)}</span></div>
              <div className="flex justify-between text-gd-sub"><span>GST (18%)</span><span>{fmtMoney(gst)}</span></div>
              <div className="flex justify-between font-bold text-gd-head border-t border-gd-border mt-1 pt-1"><span>Total</span><span className="text-gd-green">{fmtMoney(total)}</span></div>
            </div>
            <button className="btn-green w-full" disabled={busy || !amount} onClick={record}>
              {method === 'razorpay' ? 'Open Razorpay checkout →' : 'Record payment + Extend expiry'}
            </button>
          </>}
        </div>
      )}

      {tab === 'History' && (!history ? <Spinner /> : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full min-w-[650px]">
            <thead><tr><th className="th">Date</th><th className="th">Member</th><th className="th">Amount</th><th className="th">Method</th><th className="th">Invoice</th></tr></thead>
            <tbody>{history.map((p) => (
              <tr key={p.id}>
                <td className="td">{fmtDate(p.paid_at)}</td>
                <td className="td font-medium text-gd-head">{p.member_name}</td>
                <td className="td text-gd-green font-medium">{fmtMoney(p.total_amount)}</td>
                <td className="td"><StatusBadge status={p.method === 'razorpay' ? 'confirmed' : 'paid'} /> <span className="text-xs text-gd-sub">{p.method}</span></td>
                <td className="td"><button className="text-gd-blue text-xs hover:underline" onClick={() => downloadInvoice(p.id)}>⬇ {p.invoice_number}</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ))}

      {tab === 'Stats' && (!stats ? <Spinner /> : <>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatCard label="This month" value={fmtMoney(stats.this_month)} color="text-gd-green" />
          <StatCard label="Pending renewals" value={stats.pending_renewals} color="text-gd-amber" />
          <StatCard label="Avg payment" value={fmtMoney(Math.round(stats.avg_payment))} />
        </div>
        {stats.monthly.length > 0 && (
          <div className="card">
            <div className="text-sm font-medium text-gd-head mb-2">Monthly revenue</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.monthly}>
                <XAxis dataKey="month" tick={{ fill: '#718096', fontSize: 10 }} />
                <YAxis tick={{ fill: '#718096', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#161B27', border: '1px solid #1E2A3A', borderRadius: 8 }} />
                <Bar dataKey="total" fill="#00C896" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </>)}
    </div>
  );
}
