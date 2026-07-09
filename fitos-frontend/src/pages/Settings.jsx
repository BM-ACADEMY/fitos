import { useEffect, useState } from 'react';
import api from '../api/client';
import { Tabs, Field, useToast, Spinner, fmtDate } from '../components/ui';
import { useAuth } from '../store/auth';

export default function Settings() {
  const [tab, setTab] = useState('Profile');
  const [gym, setGym] = useState(null);
  const [sub, setSub] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'gym_admin';

  useEffect(() => {
    api.get('/gym/profile').then((r) => setGym(r.data.gym));
    if (isAdmin) {
      api.get('/subscription/current').then((r) => setSub(r.data)).catch(() => {});
      api.get('/trainers').then((r) => setTrainers(r.data.trainers)).catch(() => {});
    }
  }, []);

  const save = async () => {
    try {
      await api.patch('/gym/profile', { name: gym.name, owner_name: gym.owner_name, email: gym.email, address: gym.address, city: gym.city, gstin: gym.gstin });
      toast('Profile saved');
    } catch (e) { toast(e.response?.data?.error || 'Save failed', 'error'); }
  };

  const cancelSub = async () => {
    if (!confirm('Cancel subscription and downgrade to Free?')) return;
    try { await api.post('/subscription/cancel'); toast('Subscription cancelled'); }
    catch { toast('Failed', 'error'); }
  };

  if (!gym) return <Spinner />;
  const enrollUrl = `${location.origin}/join/${gym.slug}`;

  return (
    <div className="max-w-2xl">
      <h1 className="text-gd-head font-semibold text-lg mb-4">Settings</h1>
      <Tabs tabs={isAdmin ? ['Profile', 'WhatsApp', 'Billing', 'Staff', 'Design'] : ['Profile']} active={tab} onChange={setTab} />

      {tab === 'Profile' && (
        <div className="card">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gym name"><input className="input" value={gym.name || ''} onChange={(e) => setGym({ ...gym, name: e.target.value })} disabled={!isAdmin} /></Field>
            <Field label="Owner name"><input className="input" value={gym.owner_name || ''} onChange={(e) => setGym({ ...gym, owner_name: e.target.value })} disabled={!isAdmin} /></Field>
            <Field label="Phone (login)"><input className="input opacity-60" value={gym.phone || ''} disabled /></Field>
            <Field label="Email"><input className="input" value={gym.email || ''} onChange={(e) => setGym({ ...gym, email: e.target.value })} disabled={!isAdmin} /></Field>
            <Field label="City"><input className="input" value={gym.city || ''} onChange={(e) => setGym({ ...gym, city: e.target.value })} disabled={!isAdmin} /></Field>
            <Field label="GSTIN (optional)"><input className="input" value={gym.gstin || ''} onChange={(e) => setGym({ ...gym, gstin: e.target.value })} disabled={!isAdmin} /></Field>
          </div>
          <Field label="Address"><input className="input" value={gym.address || ''} onChange={(e) => setGym({ ...gym, address: e.target.value })} disabled={!isAdmin} /></Field>
          {isAdmin && <button className="btn-green" onClick={save}>Save changes</button>}
          <div className="mt-4 p-3 bg-gd-bg rounded-lg">
            <div className="text-xs text-gd-sub mb-1">Public enrollment link</div>
            <div className="flex gap-2 items-center">
              <code className="text-xs text-gd-green flex-1 truncate">{enrollUrl}</code>
              <button className="btn-outline !py-1 !px-2.5 text-xs" onClick={() => { navigator.clipboard.writeText(enrollUrl); toast('Copied!'); }}>Copy</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'WhatsApp' && (
        <div className="card text-sm space-y-3">
          <div className="text-gd-head font-medium">WhatsApp automation status</div>
          <div className="text-xs text-gd-sub">Messages send automatically from the FitOS platform number. Templates active:</div>
          {['Welcome on member add', 'Renewal reminder — 7 days before', 'Urgent renewal — 3 days before', 'Payment receipt with invoice number', 'Trial booking confirmation', 'Birthday wishes — 8AM', 'Workout plan ready (Premium)'].map((t) => (
            <div key={t} className="flex items-center gap-2 text-xs"><span className="text-gd-green">✓</span>{t}</div>
          ))}
          <div className="text-xs text-gd-sub pt-2 border-t border-gd-border">Delivery logs visible to platform admin. Issues? Contact BM TechX support.</div>
        </div>
      )}

      {tab === 'Billing' && (
        <div className="card text-sm">
          <div className="flex justify-between py-2 border-b border-gd-border/30"><span className="text-gd-sub">Current plan</span><span className="text-gd-green font-medium capitalize">{sub?.plan}</span></div>
          {sub?.trial_ends_at && sub?.plan === 'free' && <div className="flex justify-between py-2 border-b border-gd-border/30"><span className="text-gd-sub">Trial ends</span><span>{fmtDate(sub.trial_ends_at)}</span></div>}
          {sub?.razorpay_sub_id && <div className="flex justify-between py-2 border-b border-gd-border/30"><span className="text-gd-sub">Subscription ID</span><code className="text-xs">{sub.razorpay_sub_id}</code></div>}
          <div className="flex gap-2 mt-4">
            <a href="/upgrade" className="btn-green flex-1 text-center">Change plan</a>
            {sub?.plan !== 'free' && <button className="btn-ghost flex-1" onClick={cancelSub}>Cancel subscription</button>}
          </div>
        </div>
      )}

      {tab === 'Staff' && (
        <div className="card">
          <div className="text-sm text-gd-head font-medium mb-3">Trainer accounts</div>
          {trainers.length === 0 ? <div className="text-xs text-gd-sub">No trainers. Add them from the Trainers page — they login with their phone via OTP.</div> :
            trainers.map((t) => (
              <div key={t.id} className="flex justify-between text-sm py-2 border-b border-gd-border/30 last:border-0">
                <span>{t.name}</span><span className="text-gd-sub text-xs">{t.phone} · logs in at /login</span>
              </div>
            ))}
          <div className="text-xs text-gd-sub mt-3 p-2 bg-gd-bg rounded">🔒 Trainers can never see Payments or Accounts — enforced at API level.</div>
        </div>
      )}

      {tab === 'Design' && (
        <div className="card text-sm">
          <div className="text-gd-head font-medium mb-2">Branding</div>
          <div className="text-xs text-gd-sub mb-3">Your gym name shows on the enrollment page, invoices, and WhatsApp messages. Logo upload comes in the next update.</div>
          <div className="flex items-center gap-3 p-3 bg-gd-bg rounded-lg">
            <div className="w-12 h-12 rounded-lg bg-gd-green/20 flex items-center justify-center text-gd-green font-bold text-lg">
              {gym.name?.split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </div>
            <div className="text-xs text-gd-sub">Auto-generated initials shown until logo upload is available</div>
          </div>
        </div>
      )}
    </div>
  );
}
