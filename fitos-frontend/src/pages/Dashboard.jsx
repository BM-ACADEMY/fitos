import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../store/auth';
import { StatCard, Spinner, fmtDate, fmtMoney, StatusBadge } from '../components/ui';

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [today, setToday] = useState([]);
  const { user } = useAuth();

  const load = () => {
    api.get('/gym/dashboard').then((r) => setD(r.data));
    api.get('/attendance/today').then((r) => setToday(r.data.check_ins.slice(0, 8)));
  };
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  if (!d) return <Spinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-gd-head font-semibold text-lg">Dashboard</h1>
        <Link to="/members/add" className="btn-green">+ Add Member</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Active members" value={d.active_members} color="text-gd-green" />
        <StatCard label="Today check-ins" value={d.today_checkins} />
        {user.role === 'gym_admin' && <StatCard label="This month" value={fmtMoney(d.month_revenue)} color="text-gd-head" />}
        <StatCard label="Expiring in 7d" value={d.expiring_7d} color="text-gd-red" />
      </div>

      {d.forecast && (
        <div className="card mb-4 bg-gd-green/5 border-gd-green/30">
          <div className="text-xs text-gd-sub">📈 Projected revenue — next 30 days</div>
          <div className="text-2xl font-bold text-gd-green">{fmtMoney(d.forecast.projected_amount)}</div>
          <div className="text-xs text-gd-sub">{d.forecast.upcoming_renewals} renewals · {Math.round(d.forecast.renewal_rate * 100)}% renewal rate</div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <div className="text-sm font-medium text-gd-head mb-3">Today's check-ins</div>
          {today.length === 0 ? <div className="text-xs text-gd-sub">No check-ins yet today</div> :
            today.map((c) => (
              <div key={c.id} className="flex justify-between items-center py-1.5 border-b border-gd-border/30 last:border-0">
                <span className="text-sm">{c.member_name}</span>
                <span className="text-xs text-gd-sub">{new Date(c.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} <StatusBadge status={c.method === 'qr' ? 'active' : 'pending'} /></span>
              </div>
            ))}
        </div>
        <div className="card">
          <div className="text-sm font-medium text-gd-head mb-3">Renewal alerts</div>
          {d.expiring_members.length === 0 ? <div className="text-xs text-gd-sub">No renewals due this week 🎉</div> :
            d.expiring_members.map((m) => (
              <div key={m.id} className="flex justify-between items-center py-1.5 border-b border-gd-border/30 last:border-0">
                <Link to={`/members/${m.id}`} className="text-sm hover:text-gd-green">{m.name}</Link>
                <span className={`text-xs ${m.days_left <= 2 ? 'text-gd-red' : 'text-gd-amber'}`}>{m.days_left}d left</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
