import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../components/ui';

export default function Enroll() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const ref = params.get('ref') || '';
  const [gym, setGym] = useState(null);
  const [plans, setPlans] = useState([]);
  const [sel, setSel] = useState(null);
  const [f, setF] = useState({ name: '', phone: '', goal: 'fitness', gender: 'male' });
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get(`/enrollment/${slug}`)
      .then((r) => { setGym(r.data.gym); setPlans(r.data.plans); setSel(r.data.plans[0]); })
      .catch(() => setNotFound(true));
  }, [slug]);

  const pay = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/enrollment/${slug}/order`, { plan_id: sel.id, ...f, ref });
      const rz = new window.Razorpay({
        key: data.key_id, order_id: data.order.id, amount: data.order.amount, currency: 'INR',
        name: gym.name, description: `${sel.name} membership`,
        prefill: { name: f.name, contact: f.phone },
        theme: { color: '#00C896' },
        handler: async (resp) => {
          await api.post('/enrollment/verify', resp);
          setDone(true);
        },
      });
      rz.open();
    } catch (e) { toast(e.response?.data?.error || 'Payment setup failed', 'error'); }
    setBusy(false);
  };

  if (notFound) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">Gym not found</div>;
  if (!gym) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">Loading…</div>;

  if (done) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-sm text-center">
        <div className="text-4xl mb-3">🎉</div>
        <div className="text-lg font-bold text-slate-800 mb-1">Welcome to {gym.name}!</div>
        <div className="text-sm text-slate-500 mb-4">Your membership is active. Check WhatsApp for your welcome message and QR code link.</div>
        <a href="/member" className="inline-block bg-[#00C896] text-white font-semibold px-6 py-2.5 rounded-lg text-sm">Open member app →</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-6">
        <div className="text-2xl font-extrabold text-[#00C896]">{gym.name}</div>
        <div className="text-sm text-slate-500 mb-5">{gym.address || ''} {gym.city} · Powered by FitOS</div>

        <div className="text-xs font-semibold text-slate-600 mb-2">CHOOSE YOUR PLAN</div>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {plans.map((p) => (
            <button key={p.id} onClick={() => setSel(p)}
              className={`rounded-xl p-3 text-center border-2 transition-colors ${sel?.id === p.id ? 'border-[#00C896] bg-emerald-50' : 'border-slate-200 bg-white'}`}>
              <div className={`text-xs font-semibold ${sel?.id === p.id ? 'text-emerald-800' : 'text-slate-700'}`}>{p.name}</div>
              <div className={`text-base font-bold ${sel?.id === p.id ? 'text-[#00C896]' : 'text-slate-500'}`}>₹{Number(p.price).toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-slate-400">{p.duration_months} month{p.duration_months > 1 ? 's' : ''}</div>
            </button>
          ))}
        </div>

        <input className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm mb-2 text-slate-800" placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm mb-2 text-slate-800" placeholder="Phone number (WhatsApp)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <div className="grid grid-cols-2 gap-2 mb-4">
          <select className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800" value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}>
            <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
          </select>
          <select className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800" value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })}>
            <option value="weight_loss">Weight loss</option><option value="muscle_gain">Muscle gain</option>
            <option value="toning">Toning</option><option value="fitness">General fitness</option>
          </select>
        </div>

        {sel && <div className="flex justify-between text-sm text-slate-600 mb-3 px-1">
          <span>{sel.name} + 18% GST</span>
          <span className="font-bold text-slate-800">₹{(Math.round(Number(sel.price) * 1.18 * 100) / 100).toLocaleString('en-IN')}</span>
        </div>}

        <button onClick={pay} disabled={busy || !f.name || f.phone.length < 10}
          className="w-full bg-[#00C896] text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50">
          Pay & Register →
        </button>
        {ref && <div className="text-[10px] text-emerald-600 text-center mt-2">🎁 Referral applied</div>}
        <div className="text-[10px] text-slate-400 text-center mt-3">Secure payment via Razorpay · fitos.in</div>
      </div>
    </div>
  );
}
