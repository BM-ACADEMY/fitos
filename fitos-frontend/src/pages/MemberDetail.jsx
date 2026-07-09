import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client';
import { Tabs, Spinner, StatusBadge, Modal, Field, useToast, fmtDate, fmtMoney, StatCard } from '../components/ui';

export default function MemberDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({});
  const [meas, setMeas] = useState({ weight_kg: '' });
  const toast = useToast();

  const load = () => api.get(`/members/${id}`).then((r) => { setData(r.data); setF(r.data.member); });
  useEffect(() => { load(); }, [id]);

  if (!data) return <Spinner />;
  const m = data.member;

  const saveEdit = async () => {
    try {
      await api.patch(`/members/${id}`, { name: f.name, phone: f.phone, goal: f.goal, trainer_id: f.trainer_id, health_notes: f.health_notes, status: f.status });
      toast('Member updated'); setEdit(false); load();
    } catch (e) { toast(e.response?.data?.error || 'Update failed', 'error'); }
  };

  const logMeasurement = async () => {
    try {
      await api.post('/trainer-os/measurements', { member_id: id, ...meas });
      toast('Measurement logged'); setMeas({ weight_kg: '' }); load();
    } catch (e) { toast('Failed to log', 'error'); }
  };

  const daysLeft = m.expires_at ? Math.ceil((new Date(m.expires_at) - Date.now()) / 86400000) : 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="w-11 h-11 rounded-full bg-gd-green/20 flex items-center justify-center text-gd-green font-bold">
          {m.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
        </div>
        <div className="flex-1">
          <div className="text-gd-head font-semibold">{m.name}</div>
          <div className="text-xs text-gd-sub">{m.phone} · {m.goal} · {m.fitness_level}</div>
        </div>
        <StatusBadge status={m.status} />
        <span className={`text-xs px-2 py-1 rounded bg-gd-border ${daysLeft <= 7 ? 'text-gd-red' : 'text-gd-text'}`}>Expires {fmtDate(m.expires_at)}</span>
        <button className="btn-outline" onClick={() => setEdit(true)}>Edit</button>
      </div>

      <Tabs tabs={['Overview', 'Attendance', 'Payments', 'Progress']} active={tab} onChange={setTab} />

      {tab === 'Overview' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <div className="text-sm font-medium text-gd-head mb-3">Details</div>
            {[['Trainer', m.trainer_name || '—'],['Plan', m.plan],['Source', m.enrollment_source],['Joined', fmtDate(m.joined_at)],['Health notes', m.health_notes || 'None'],['DOB', fmtDate(m.dob)]].map(([l, v]) => (
              <div key={l} className="flex justify-between text-sm py-1.5 border-b border-gd-border/30 last:border-0"><span className="text-gd-sub">{l}</span><span>{v}</span></div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 content-start">
            <StatCard label="Check-ins (30d)" value={data.check_ins.length} color="text-gd-green" />
            <StatCard label="Days left" value={daysLeft} color={daysLeft <= 7 ? 'text-gd-red' : 'text-gd-head'} />
            <StatCard label="Payments" value={data.payments.length} />
            <StatCard label="PT packages" value={data.pt_packages.length} color="text-gd-blue" />
          </div>
        </div>
      )}

      {tab === 'Attendance' && (
        <div className="card">
          {data.check_ins.length === 0 ? <div className="text-sm text-gd-sub">No check-ins yet</div> :
            data.check_ins.map((c) => (
              <div key={c.id} className="flex justify-between text-sm py-1.5 border-b border-gd-border/30 last:border-0">
                <span>{fmtDate(c.checked_in_at)}</span>
                <span className="text-gd-sub">{new Date(c.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · <StatusBadge status={c.method === 'qr' ? 'active' : 'pending'} /></span>
              </div>
            ))}
        </div>
      )}

      {tab === 'Payments' && (
        <div className="card">
          {data.payments.length === 0 ? <div className="text-sm text-gd-sub">No payments yet</div> :
            data.payments.map((p) => (
              <div key={p.id} className="flex justify-between items-center text-sm py-1.5 border-b border-gd-border/30 last:border-0">
                <span>{fmtDate(p.paid_at)} · {p.invoice_number}</span>
                <span className="flex items-center gap-2">{fmtMoney(p.total_amount)} <StatusBadge status={p.status} /></span>
              </div>
            ))}
        </div>
      )}

      {tab === 'Progress' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <div className="text-sm font-medium text-gd-head mb-3">Log measurement</div>
            <div className="grid grid-cols-2 gap-2">
              {[['weight_kg','Weight (kg)'],['chest_cm','Chest (cm)'],['waist_cm','Waist (cm)'],['body_fat_pct','Body fat %']].map(([k, l]) => (
                <Field key={k} label={l}><input type="number" className="input" value={meas[k] || ''} onChange={(e) => setMeas({ ...meas, [k]: e.target.value })} /></Field>
              ))}
            </div>
            <button className="btn-green w-full" onClick={logMeasurement}>Save</button>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gd-head mb-3">Weight trend</div>
            {data.measurements.length < 2 ? <div className="text-xs text-gd-sub">Log 2+ measurements to see trend</div> : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={[...data.measurements].reverse()}>
                  <XAxis dataKey="date" tick={{ fill: '#718096', fontSize: 10 }} tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} />
                  <YAxis tick={{ fill: '#718096', fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ background: '#161B27', border: '1px solid #1E2A3A', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="weight_kg" stroke="#00C896" strokeWidth={2} dot={{ fill: '#00C896' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      <Modal open={edit} onClose={() => setEdit(false)} title="Edit member">
        <Field label="Name"><input className="input" value={f.name || ''} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Phone"><input className="input" value={f.phone || ''} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Status"><select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option>active</option><option>expired</option><option>suspended</option></select></Field>
        <Field label="Health notes"><input className="input" value={f.health_notes || ''} onChange={(e) => setF({ ...f, health_notes: e.target.value })} /></Field>
        <button className="btn-green w-full" onClick={saveEdit}>Save changes</button>
      </Modal>
    </div>
  );
}
