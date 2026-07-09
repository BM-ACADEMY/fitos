import { useEffect, useState } from 'react';
import api from '../api/client';
import { useToast, Spinner, fmtMoney } from '../components/ui';

const FEATURES = {
  free:    ['5 members', 'Manual attendance', 'Cash payments'],
  starter: ['50 members', 'QR attendance', 'WhatsApp alerts', 'Reports'],
  basic:   ['150 members', 'Razorpay online payments', 'Invoices + GST', 'Accounts / P&L', 'PT sessions', 'Multi staff'],
  premium: ['Unlimited members', 'AI workout + diet plans', 'ChurnShield retention', 'Revenue Oracle forecast', 'Referral engine', 'Everything in Basic'],
};
const COLORS = { free: 'text-gd-sub', starter: 'text-gd-blue', basic: 'text-gd-green', premium: 'text-gd-purple' };

export default function Upgrade() {
  const [plans, setPlans] = useState(null);
  const [current, setCurrent] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get('/subscription/plans').then((r) => setPlans(r.data.plans));
    api.get('/subscription/current').then((r) => setCurrent(r.data));
  }, []);

  const subscribe = async (key) => {
    setBusy(true);
    try {
      const { data } = await api.post('/subscription/subscribe', { plan_key: key });
      if (data.short_url) window.open(data.short_url, '_blank');
      toast('Complete payment in the Razorpay tab. Plan activates automatically.');
    } catch (e) { toast(e.response?.data?.error || 'Subscription failed', 'error'); }
    setBusy(false);
  };

  if (!plans) return <Spinner />;
  const trialDays = current?.trial_ends_at ? Math.max(0, Math.ceil((new Date(current.trial_ends_at) - Date.now()) / 86400000)) : 0;

  return (
    <div>
      <h1 className="text-gd-head font-semibold text-lg mb-1">Choose your plan</h1>
      <div className="text-xs text-gd-sub mb-5">
        Current: <span className="text-gd-green font-medium">{current?.plan}</span>
        {current?.plan === 'free' && trialDays > 0 && ` · trial ends in ${trialDays} days`}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        {plans.map((p) => {
          const popular = p.key === 'basic';
          const isCurrent = current?.plan === p.key;
          return (
            <div key={p.key} className={`card relative ${popular ? 'border-gd-green border-2' : ''}`}>
              {popular && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gd-green text-gd-bg text-[10px] font-bold px-2.5 py-0.5 rounded-full">POPULAR</div>}
              <div className={`text-xs font-bold mb-1 ${COLORS[p.key]}`}>{p.name}</div>
              <div className="text-2xl font-extrabold text-gd-head">{p.price > 0 ? fmtMoney(p.price) : '₹0'}<span className="text-xs text-gd-sub font-normal">{p.price > 0 ? '/mo' : ' · 14 days'}</span></div>
              <ul className="text-xs text-gd-text space-y-1.5 my-4">
                {FEATURES[p.key].map((f) => <li key={f}>✓ {f}</li>)}
              </ul>
              {isCurrent ? <div className="btn-ghost w-full text-center text-xs">Current plan</div> :
                p.key === 'free' ? null :
                <button className={popular ? 'btn-green w-full' : 'btn-outline w-full'} disabled={busy} onClick={() => subscribe(p.key)}>Upgrade →</button>}
            </div>
          );
        })}
      </div>
      <div className="text-xs text-gd-sub mt-4">Subscriptions renew monthly via Razorpay. Cancel anytime from Settings → Billing.</div>
    </div>
  );
}
