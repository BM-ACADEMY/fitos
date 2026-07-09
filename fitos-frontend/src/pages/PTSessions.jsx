import { useEffect, useState } from 'react';
import api from '../api/client';
import { Tabs, Modal, Field, useToast, StatusBadge, Spinner, Empty, fmtMoney, fmtDate } from '../components/ui';

export default function PTSessions() {
  const [tab, setTab] = useState('Packages');
  const [packages, setPackages] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [add, setAdd] = useState(false);
  const [book, setBook] = useState(null);
  const [members, setMembers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [f, setF] = useState({ member_id: '', trainer_id: '', total_sessions: 10, price_per_session: 1000 });
  const [when, setWhen] = useState('');
  const toast = useToast();

  const load = () => {
    api.get('/pt/packages').then((r) => setPackages(r.data.packages));
    api.get('/pt/sessions').then((r) => setSessions(r.data.sessions));
  };
  useEffect(() => {
    load();
    api.get('/members', { params: { status: 'active' } }).then((r) => setMembers(r.data.members));
    api.get('/trainers').then((r) => setTrainers(r.data.trainers)).catch(() => {});
  }, []);

  const createPkg = async () => {
    try { await api.post('/pt/packages', f); toast('PT package created'); setAdd(false); load(); }
    catch (e) { toast(e.response?.data?.error || 'Failed (needs Basic plan+)', 'error'); }
  };
  const bookSession = async () => {
    try { await api.post('/pt/sessions', { package_id: book.id, scheduled_at: when }); toast('Session booked'); setBook(null); load(); }
    catch (e) { toast(e.response?.data?.error || 'Failed', 'error'); }
  };
  const complete = async (id) => {
    try { await api.patch(`/pt/sessions/${id}/complete`); toast('Session completed ✓'); load(); }
    catch (e) { toast(e.response?.data?.error || 'Failed', 'error'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-gd-head font-semibold text-lg">PT Sessions</h1>
        <button className="btn-green" onClick={() => setAdd(true)}>+ New Package</button>
      </div>
      <Tabs tabs={['Packages', 'Sessions']} active={tab} onChange={setTab} />

      {tab === 'Packages' && (!packages ? <Spinner /> : packages.length === 0 ? <Empty msg="No PT packages yet" /> : (
        <div className="space-y-3">
          {packages.map((p) => (
            <div key={p.id} className="card">
              <div className="flex justify-between items-center mb-2">
                <div><div className="font-medium text-gd-head">{p.member_name}</div><div className="text-xs text-gd-sub">Trainer: {p.trainer_name} · ₹{p.price_per_session}/session</div></div>
                <div className="text-right"><div className="text-gd-green font-bold">{fmtMoney(p.total_price)}</div>
                  <button className="text-xs text-gd-blue hover:underline" onClick={() => { setBook(p); setWhen(''); }}>+ Book session</button></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gd-border rounded-full overflow-hidden">
                  <div className="h-full bg-gd-green rounded-full" style={{ width: `${Math.round(p.used_sessions / p.total_sessions * 100)}%` }} />
                </div>
                <span className="text-xs text-gd-text">{p.used_sessions}/{p.total_sessions} used</span>
              </div>
            </div>
          ))}
        </div>
      ))}

      {tab === 'Sessions' && (!sessions ? <Spinner /> : sessions.length === 0 ? <Empty msg="No sessions scheduled" /> : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full min-w-[550px]">
            <thead><tr><th className="th">Member</th><th className="th">Trainer</th><th className="th">Scheduled</th><th className="th">Status</th><th className="th"></th></tr></thead>
            <tbody>{sessions.map((s) => (
              <tr key={s.id}>
                <td className="td font-medium text-gd-head">{s.member_name}</td>
                <td className="td text-gd-sub">{s.trainer_name}</td>
                <td className="td">{new Date(s.scheduled_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="td"><StatusBadge status={s.status} /></td>
                <td className="td">{s.status === 'scheduled' && <button className="btn-green !py-1 !px-2.5 text-xs" onClick={() => complete(s.id)}>Complete ✓</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ))}

      <Modal open={add} onClose={() => setAdd(false)} title="New PT package">
        <Field label="Member"><select className="input" value={f.member_id} onChange={(e) => setF({ ...f, member_id: e.target.value })}><option value="">Select…</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
        <Field label="Trainer"><select className="input" value={f.trainer_id} onChange={(e) => setF({ ...f, trainer_id: e.target.value })}><option value="">Select…</option>{trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Total sessions"><input type="number" className="input" value={f.total_sessions} onChange={(e) => setF({ ...f, total_sessions: e.target.value })} /></Field>
          <Field label="Price / session (₹)"><input type="number" className="input" value={f.price_per_session} onChange={(e) => setF({ ...f, price_per_session: e.target.value })} /></Field>
        </div>
        <div className="text-sm text-gd-sub mb-3">Total: <span className="text-gd-green font-bold">{fmtMoney(f.total_sessions * f.price_per_session)}</span></div>
        <button className="btn-green w-full" disabled={!f.member_id || !f.trainer_id} onClick={createPkg}>Create package</button>
      </Modal>

      <Modal open={!!book} onClose={() => setBook(null)} title={`Book session — ${book?.member_name}`}>
        <Field label="Date & time"><input type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
        <button className="btn-green w-full" disabled={!when} onClick={bookSession}>Book</button>
      </Modal>
    </div>
  );
}
