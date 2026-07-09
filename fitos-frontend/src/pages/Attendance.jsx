import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client';
import { Tabs, useToast, StatusBadge, Spinner } from '../components/ui';
import QRScanner from '../components/QRScanner';

export default function Attendance() {
  const [tab, setTab] = useState('Today');
  const [today, setToday] = useState(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const toast = useToast();

  const load = () => api.get('/attendance/today').then((r) => setToday(r.data));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (tab !== 'Manual' || search.length < 2) { setResults([]); return; }
    const t = setTimeout(() => api.get('/members', { params: { search, status: 'active' } }).then((r) => setResults(r.data.members.slice(0, 6))), 300);
    return () => clearTimeout(t);
  }, [search, tab]);

  const markManual = async (id, name) => {
    try { await api.post('/attendance/manual', { member_id: id }); toast(`✅ ${name} checked in`); setSearch(''); load(); }
    catch (e) { toast(e.response?.data?.error || 'Failed', 'error'); }
  };

  const onScan = async (text) => {
    try { const { data } = await api.post('/attendance/qr', { qr_token: text }); toast(`✅ ${data.member} checked in via QR`); load(); }
    catch (e) { toast(e.response?.data?.error || 'Scan failed', 'error'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-gd-head font-semibold text-lg">Attendance</h1>
        <span className="text-xs text-gd-sub">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>
      <Tabs tabs={[`Today (${today?.total ?? '…'})`, 'Manual', 'QR Scan']} active={tab.startsWith('Today') ? `Today (${today?.total ?? '…'})` : tab} onChange={(t) => setTab(t.startsWith('Today') ? 'Today' : t)} />

      {tab === 'Today' && (!today ? <Spinner /> : <>
        {today.hourly.length > 0 && (
          <div className="card mb-4">
            <div className="text-sm font-medium text-gd-head mb-2">Peak hours</div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={today.hourly}>
                <XAxis dataKey="hour" tick={{ fill: '#718096', fontSize: 10 }} tickFormatter={(h) => `${h}:00`} />
                <YAxis hide /><Tooltip contentStyle={{ background: '#161B27', border: '1px solid #1E2A3A', borderRadius: 8 }} />
                <Bar dataKey="count" fill="#00C896" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="card">
          {today.check_ins.length === 0 ? <div className="text-sm text-gd-sub">No check-ins yet today</div> :
            today.check_ins.map((c) => (
              <div key={c.id} className="flex justify-between items-center py-1.5 border-b border-gd-border/30 last:border-0">
                <span className="text-sm font-medium">{c.member_name}</span>
                <span className="text-xs text-gd-sub">{new Date(c.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} <StatusBadge status={c.method === 'qr' ? 'active' : 'pending'} /></span>
              </div>
            ))}
        </div>
      </>)}

      {tab === 'Manual' && (
        <div className="card max-w-md">
          <input className="input mb-3" placeholder="Search member by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          {results.map((m) => (
            <button key={m.id} onClick={() => markManual(m.id, m.name)}
              className="w-full flex justify-between items-center p-3 mb-2 bg-gd-bg border border-gd-border rounded-lg hover:border-gd-green text-left">
              <div><div className="text-sm font-medium">{m.name}</div><div className="text-xs text-gd-sub">{m.phone}</div></div>
              <span className="text-gd-green text-sm">Mark ✓</span>
            </button>
          ))}
        </div>
      )}

      {tab === 'QR Scan' && (
        <div>
          <QRScanner active={tab === 'QR Scan'} onScan={onScan} />
          <div className="text-center text-xs text-gd-sub mt-3">Point camera at member's QR code</div>
        </div>
      )}
    </div>
  );
}
