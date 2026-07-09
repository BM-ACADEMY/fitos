import { useEffect, useState } from 'react';
import api from '../api/client';
import { Modal, Field, useToast, StatusBadge, Spinner, Empty } from '../components/ui';

export default function Trainers() {
  const [trainers, setTrainers] = useState(null);
  const [add, setAdd] = useState(false);
  const [f, setF] = useState({ name: '', phone: '', specialization: '', base_salary: '', pt_commission_pct: 10 });
  const toast = useToast();

  const load = () => api.get('/trainers').then((r) => setTrainers(r.data.trainers));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try { await api.post('/trainers', f); toast('Trainer added'); setAdd(false); setF({ name: '', phone: '', specialization: '', base_salary: '', pt_commission_pct: 10 }); load(); }
    catch (e) { toast(e.response?.data?.error || 'Failed', 'error'); }
  };

  const mark = async (id, status) => {
    try { await api.post(`/trainers/${id}/attendance`, { status }); toast(`Marked ${status}`); }
    catch { toast('Failed', 'error'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-gd-head font-semibold text-lg">Trainers</h1>
        <button className="btn-green" onClick={() => setAdd(true)}>+ Add Trainer</button>
      </div>

      {!trainers ? <Spinner /> : trainers.length === 0 ? <Empty msg="No trainers yet" /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {trainers.map((t) => (
            <div key={t.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <div><div className="font-semibold text-gd-head">{t.name}</div><div className="text-xs text-gd-sub">{t.specialization || '—'}</div></div>
                <StatusBadge status={t.is_active ? 'active' : 'suspended'} />
              </div>
              {[['Phone', t.phone],['Base salary', `₹${Number(t.base_salary).toLocaleString('en-IN')}`],['PT commission', `${t.pt_commission_pct}%`],['Active members', t.member_count]].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm py-1 border-b border-gd-border/30 last:border-0"><span className="text-gd-sub">{l}</span><span>{v}</span></div>
              ))}
              <div className="flex gap-2 mt-3">
                <button className="btn-green flex-1 !py-1.5 text-xs" onClick={() => mark(t.id, 'present')}>Present ✓</button>
                <button className="btn-ghost flex-1 !py-1.5 text-xs" onClick={() => mark(t.id, 'absent')}>Absent</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={add} onClose={() => setAdd(false)} title="Add trainer">
        <Field label="Name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Phone"><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Specialization"><input className="input" value={f.specialization} onChange={(e) => setF({ ...f, specialization: e.target.value })} placeholder="Strength, Toning…" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Base salary (₹)"><input type="number" className="input" value={f.base_salary} onChange={(e) => setF({ ...f, base_salary: e.target.value })} /></Field>
          <Field label="PT commission %"><input type="number" className="input" value={f.pt_commission_pct} onChange={(e) => setF({ ...f, pt_commission_pct: e.target.value })} /></Field>
        </div>
        <button className="btn-green w-full" disabled={!f.name || !f.phone} onClick={save}>Add trainer</button>
      </Modal>
    </div>
  );
}
