import { useEffect, useState } from 'react';
import api from '../api/client';
import { Modal, Field, useToast, Spinner, StatusBadge, fmtMoney } from '../components/ui';

export default function Plans() {
  const [plans, setPlans] = useState(null);
  const [modal, setModal] = useState(null); // null | 'add' | plan object
  const [f, setF] = useState({ name: '', duration_months: 1, price: '' });
  const toast = useToast();

  const load = () => api.get('/gym-plans').then((r) => setPlans(r.data.plans));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (modal === 'add') await api.post('/gym-plans', f);
      else await api.patch(`/gym-plans/${modal.id}`, f);
      toast('Saved'); setModal(null); load();
    } catch (e) { toast(e.response?.data?.error || 'Failed', 'error'); }
  };
  const toggle = async (p) => {
    try { await api.patch(`/gym-plans/${p.id}`, { is_active: !p.is_active }); load(); } catch { toast('Failed', 'error'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-gd-head font-semibold text-lg">Membership plans</h1>
        <button className="btn-green" onClick={() => { setF({ name: '', duration_months: 1, price: '' }); setModal('add'); }}>+ New Plan</button>
      </div>
      <div className="text-xs text-gd-sub mb-4">These plans appear on your public enrollment page (/join link in Settings).</div>

      {!plans ? <Spinner /> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {plans.map((p) => (
            <div key={p.id} className={`card ${!p.is_active && 'opacity-50'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="font-semibold text-gd-head">{p.name}</div>
                <StatusBadge status={p.is_active ? 'active' : 'suspended'} />
              </div>
              <div className="text-2xl font-bold text-gd-green mb-1">{fmtMoney(p.price)}</div>
              <div className="text-xs text-gd-sub mb-3">{p.duration_months} month{p.duration_months > 1 ? 's' : ''}</div>
              <div className="flex gap-2">
                <button className="btn-outline flex-1 !py-1 text-xs" onClick={() => { setF({ name: p.name, duration_months: p.duration_months, price: p.price }); setModal(p); }}>Edit</button>
                <button className="btn-ghost flex-1 !py-1 text-xs" onClick={() => toggle(p)}>{p.is_active ? 'Disable' : 'Enable'}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'add' ? 'New plan' : 'Edit plan'}>
        <Field label="Plan name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Monthly" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration (months)"><input type="number" min="1" className="input" value={f.duration_months} onChange={(e) => setF({ ...f, duration_months: e.target.value })} /></Field>
          <Field label="Price (₹)"><input type="number" className="input" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field>
        </div>
        <button className="btn-green w-full" disabled={!f.name || !f.price} onClick={save}>Save</button>
      </Modal>
    </div>
  );
}
