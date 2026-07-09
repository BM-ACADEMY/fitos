import { useEffect, useState } from 'react';
import api from '../api/client';
import { Modal, Field, useToast, Spinner, fmtDate } from '../components/ui';

const COLS = [
  ['pending', 'Pending', 'text-gd-amber border-gd-amber/40'],
  ['confirmed', 'Confirmed', 'text-gd-blue border-gd-blue/40'],
  ['attended', 'Attended', 'text-gd-purple border-gd-purple/40'],
  ['converted', 'Converted', 'text-gd-green border-gd-green/40'],
];

export default function Trials() {
  const [trials, setTrials] = useState(null);
  const [add, setAdd] = useState(false);
  const [conv, setConv] = useState(null);
  const [plans, setPlans] = useState([]);
  const [f, setF] = useState({ name: '', phone: '', goal: 'fitness', preferred_date: '', preferred_time: '' });
  const [cf, setCf] = useState({ plan: '', plan_duration: 1 });
  const toast = useToast();

  const load = () => api.get('/trials').then((r) => setTrials(r.data.trials));
  useEffect(() => { load(); api.get('/gym-plans').then((r) => setPlans(r.data.plans)); }, []);

  const create = async () => {
    try { await api.post('/trials', f); toast('Trial booked'); setAdd(false); load(); }
    catch (e) { toast(e.response?.data?.error || 'Failed', 'error'); }
  };
  const confirm = async (id) => {
    try { await api.patch(`/trials/${id}/confirm`); toast('Confirmed! WA sent ✅'); load(); }
    catch { toast('Failed', 'error'); }
  };
  const markAttended = async (id) => {
    try { await api.patch(`/trials/${id}/status`, { status: 'attended' }); load(); } catch { toast('Failed', 'error'); }
  };
  const convert = async () => {
    try {
      const p = plans.find((x) => x.name === cf.plan) || plans[0];
      await api.patch(`/trials/${conv.id}/convert`, { plan: p?.name, plan_duration: p?.duration_months || 1 });
      toast('Converted to member! 🎉'); setConv(null); load();
    } catch (e) { toast(e.response?.data?.error || 'Failed', 'error'); }
  };

  if (!trials) return <Spinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-gd-head font-semibold text-lg">Trial bookings</h1>
        <button className="btn-green" onClick={() => setAdd(true)}>+ New Trial</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {COLS.map(([key, label, cls]) => {
          const items = trials.filter((t) => t.status === key);
          return (
            <div key={key}>
              <div className={`text-xs font-semibold pb-2 mb-2 border-b-2 ${cls}`}>{label} ({items.length})</div>
              {items.map((t) => (
                <div key={t.id} className="card !p-3 mb-2">
                  <div className="text-sm font-medium text-gd-head">{t.name}</div>
                  <div className="text-xs text-gd-sub mb-2">{t.goal} · {t.source}<br />{fmtDate(t.preferred_date)} {t.preferred_time || ''}</div>
                  {key === 'pending' && <button className="btn-green !py-1 !px-2.5 text-xs w-full" onClick={() => confirm(t.id)}>Confirm + WA</button>}
                  {key === 'confirmed' && <button className="btn-outline !py-1 !px-2.5 text-xs w-full" onClick={() => markAttended(t.id)}>Mark attended</button>}
                  {key === 'attended' && <button className="btn-green !py-1 !px-2.5 text-xs w-full" onClick={() => { setConv(t); setCf({ plan: plans[0]?.name, plan_duration: plans[0]?.duration_months || 1 }); }}>Convert →</button>}
                  {key === 'converted' && <div className="text-xs text-gd-green">✓ Member created</div>}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <Modal open={add} onClose={() => setAdd(false)} title="New trial booking">
        <Field label="Name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Phone"><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input type="date" className="input" value={f.preferred_date} onChange={(e) => setF({ ...f, preferred_date: e.target.value })} /></Field>
          <Field label="Time"><input className="input" placeholder="6 PM" value={f.preferred_time} onChange={(e) => setF({ ...f, preferred_time: e.target.value })} /></Field>
        </div>
        <button className="btn-green w-full" disabled={!f.name || !f.phone || !f.preferred_date} onClick={create}>Book trial</button>
      </Modal>

      <Modal open={!!conv} onClose={() => setConv(null)} title={`Convert ${conv?.name} to member`}>
        <Field label="Plan"><select className="input" value={cf.plan} onChange={(e) => setCf({ ...cf, plan: e.target.value })}>{plans.map((p) => <option key={p.id} value={p.name}>{p.name} — ₹{p.price}</option>)}</select></Field>
        <button className="btn-green w-full" onClick={convert}>Convert & send welcome WA</button>
      </Modal>
    </div>
  );
}
