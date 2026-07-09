import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../store/auth';
import { Spinner, Empty, fmtMoney } from '../components/ui';

export default function Earnings() {
  const { user } = useAuth();
  const [trainers, setTrainers] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.role === 'trainer') {
      api.get(`/trainers/${user.id}/earnings`, { params: { month } })
        .then((r) => setData({ [user.id]: r.data }))
        .finally(() => setLoading(false));
    } else {
      api.get('/trainers').then(async (r) => {
        setTrainers(r.data.trainers);
        const all = {};
        for (const t of r.data.trainers) {
          try { const e = await api.get(`/trainers/${t.id}/earnings`, { params: { month } }); all[t.id] = e.data; } catch {}
        }
        setData(all); setLoading(false);
      });
    }
  }, [month, user]);

  if (loading) return <Spinner />;
  const cards = Object.values(data);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-gd-head font-semibold text-lg">Trainer earnings</h1>
        <input type="month" className="input !w-auto" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      {cards.length === 0 ? <Empty msg="No trainers" /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {cards.map((e) => (
            <div key={e.trainer} className="card">
              <div className="flex justify-between items-center mb-3">
                <div><div className="font-semibold text-gd-head">{e.trainer}</div><div className="text-xs text-gd-sub">{e.month}</div></div>
                <div className="text-right"><div className="text-xl font-bold text-gd-green">{fmtMoney(e.net_pay)}</div><div className="text-[10px] text-gd-sub">Net pay</div></div>
              </div>
              <div className="bg-gd-bg rounded-lg p-3 text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-gd-sub">Base salary</span><span>{fmtMoney(e.base_salary)}</span></div>
                <div className="flex justify-between"><span className="text-gd-sub">Present / Absent</span><span>{e.present}d / <span className="text-gd-red">{e.absent}d</span></span></div>
                <div className="flex justify-between text-gd-red"><span>Deductions</span><span>−{fmtMoney(e.deductions)}</span></div>
                <div className="flex justify-between"><span className="text-gd-sub">PT sessions done</span><span>{e.pt_sessions_completed}</span></div>
                <div className="flex justify-between text-gd-green"><span>PT commission ({e.pt_commission_pct}%)</span><span>+{fmtMoney(e.commission)}</span></div>
                <div className="flex justify-between font-bold text-gd-head border-t border-gd-border pt-1.5"><span>Net pay</span><span>{fmtMoney(e.net_pay)}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
