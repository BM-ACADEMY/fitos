import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/client';
import { useAuth } from '../../store/auth';
import { Tabs, Modal, Field, useToast, StatusBadge, StatCard, Spinner, Empty, fmtMoney, fmtDate } from '../../components/ui';

export default function MasterApp() {
  const { token, user, logout } = useAuth();
  if (!token || !['master_admin', 'super_admin'].includes(user?.role)) return <Navigate to="/master" replace />;
  return <MasterPanel user={user} logout={logout} />;
}

function MasterPanel({ user, logout }) {
  const [tab, setTab] = useState('Overview');
  const isSuper = user.role === 'super_admin';

  return (
    <div className="min-h-screen bg-[#06090F] p-5">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-5">
          <div>
            <div className="text-gd-green font-bold text-lg">FitOS Master</div>
            <div className="text-[10px] text-gd-sub">{user.name} · {user.role}</div>
          </div>
          <button className="btn-ghost text-xs" onClick={logout}>Logout</button>
        </div>
        <Tabs tabs={['Overview', 'Subscribers', 'Revenue', 'WA Health', 'Coupons', 'Analytics']} active={tab} onChange={setTab} />
        {tab === 'Overview' && <Overview isSuper={isSuper} />}
        {tab === 'Subscribers' && <Subscribers isSuper={isSuper} />}
        {tab === 'Revenue' && <Revenue />}
        {tab === 'WA Health' && <WAHealth />}
        {tab === 'Coupons' && <Coupons />}
        {tab === 'Analytics' && <Analytics />}
      </div>
    </div>
  );
}

function Overview({ isSuper }) {
  const [d, setD] = useState(null);
  const [bc, setBc] = useState(false);
  const [msg, setMsg] = useState('');
  const toast = useToast();
  useEffect(() => { api.get('/master/overview').then((r) => setD(r.data)); }, []);
  if (!d) return <Spinner />;

  const broadcast = async () => {
    try { const { data } = await api.post('/master/broadcast', { message: msg }); toast(`Sent to ${data.sent}/${data.total} gyms`); setBc(false); }
    catch (e) { toast(e.response?.data?.error || 'Failed', 'error'); }
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <StatCard label="MRR" value={fmtMoney(d.mrr)} color="text-gd-green" />
        <StatCard label="ARR" value={fmtMoney(d.arr)} />
        <StatCard label="Total gyms" value={d.total_gyms} />
        <StatCard label="Active gyms" value={d.active_gyms} color="text-gd-green" />
        <StatCard label="Total members" value={d.total_members} color="text-gd-blue" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <div className="text-sm font-medium text-gd-head mb-3">Plan distribution</div>
          {Object.entries(d.plan_distribution).map(([plan, count]) => {
            const colors = { premium: '#8B5CF6', basic: '#00C896', starter: '#3B82F6', free: '#718096' };
            const pct = Math.round(count / d.total_gyms * 100);
            return (
              <div key={plan} className="mb-2">
                <div className="flex justify-between text-xs mb-0.5"><span style={{ color: colors[plan] }}>{plan}</span><span className="text-gd-sub">{count} ({pct}%)</span></div>
                <div className="h-1.5 bg-gd-border rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[plan] }} /></div>
              </div>
            );
          })}
          {isSuper && <button className="btn-green w-full mt-3" onClick={() => setBc(true)}>📢 Broadcast to all gym owners</button>}
        </div>
        <div className="card">
          <div className="text-sm font-medium text-gd-head mb-3">Recent signups</div>
          {d.recent_signups.map((g) => (
            <div key={g.id} className="flex justify-between text-sm py-1.5 border-b border-gd-border/30 last:border-0">
              <span>{g.name} <span className="text-xs text-gd-sub">· {g.city}</span></span>
              <span className="flex gap-2 items-center"><StatusBadge status={g.plan === 'free' ? 'pending' : 'active'} /><span className="text-xs text-gd-sub">{fmtDate(g.created_at)}</span></span>
            </div>
          ))}
        </div>
      </div>
      <Modal open={bc} onClose={() => setBc(false)} title="Broadcast WhatsApp to all gym owners">
        <Field label="Message"><textarea className="input min-h-[100px]" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="New feature announcement…" /></Field>
        <button className="btn-green w-full" disabled={!msg} onClick={broadcast}>Send to all active gyms</button>
      </Modal>
    </div>
  );
}

function Subscribers({ isSuper }) {
  const [gyms, setGyms] = useState(null);
  const [filter, setFilter] = useState('');
  const toast = useToast();
  const load = () => api.get('/master/gyms', { params: filter ? { plan: filter } : {} }).then((r) => setGyms(r.data.gyms));
  useEffect(() => { load(); }, [filter]);

  const suspend = async (g) => {
    if (!confirm(`${g.is_active ? 'Suspend' : 'Reactivate'} ${g.name}?`)) return;
    try { await api.patch(`/master/gyms/${g.id}/suspend`, { active: !g.is_active }); toast('Updated'); load(); }
    catch { toast('Failed', 'error'); }
  };
  const changePlan = async (g) => {
    const plan = prompt('New plan (free/starter/basic/premium):', g.plan);
    if (!plan) return;
    try { await api.patch(`/master/gyms/${g.id}/plan`, { plan }); toast('Plan updated'); load(); }
    catch (e) { toast(e.response?.data?.error || 'Failed (super_admin only)', 'error'); }
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {['', 'free', 'starter', 'basic', 'premium'].map((p) => (
          <button key={p} onClick={() => setFilter(p)} className={`px-3 py-1 rounded text-xs ${filter === p ? 'bg-gd-green/15 text-gd-green' : 'bg-gd-border text-gd-sub'}`}>{p || 'All'}</button>
        ))}
      </div>
      {!gyms ? <Spinner /> : gyms.length === 0 ? <Empty /> : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead><tr><th className="th">Gym</th><th className="th">City</th><th className="th">Plan</th><th className="th">Members</th><th className="th">Status</th><th className="th">Joined</th><th className="th"></th></tr></thead>
            <tbody>{gyms.map((g) => (
              <tr key={g.id}>
                <td className="td font-medium text-gd-head">{g.name}<div className="text-[10px] text-gd-sub">{g.phone}</div></td>
                <td className="td text-gd-sub">{g.city}</td>
                <td className="td"><StatusBadge status={g.plan === 'premium' ? 'attended' : g.plan === 'free' ? 'pending' : 'active'} /> <span className="text-xs">{g.plan}</span></td>
                <td className="td">{g.member_count}</td>
                <td className="td"><StatusBadge status={g.is_active ? 'active' : 'suspended'} /></td>
                <td className="td text-xs text-gd-sub">{fmtDate(g.created_at)}</td>
                <td className="td">
                  <div className="flex gap-1">
                    {isSuper && <button className="text-xs text-gd-blue hover:underline" onClick={() => changePlan(g)}>Plan</button>}
                    <button className="text-xs text-gd-red hover:underline" onClick={() => suspend(g)}>{g.is_active ? 'Suspend' : 'Activate'}</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Revenue() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/master/revenue').then((r) => setD(r.data)); }, []);
  if (!d) return <Spinner />;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card">
        <div className="text-sm font-medium text-gd-head mb-2">New gym signups</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={d.signups_trend}>
            <XAxis dataKey="month" tick={{ fill: '#718096', fontSize: 10 }} />
            <YAxis tick={{ fill: '#718096', fontSize: 10 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#161B27', border: '1px solid #1E2A3A', borderRadius: 8 }} />
            <Bar dataKey="new_gyms" fill="#00C896" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card">
        <div className="text-sm font-medium text-gd-head mb-2">Top gyms by members</div>
        {d.top_gyms.map((g, i) => (
          <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gd-border/30 last:border-0">
            <span>{g.name} <span className="text-xs text-gd-sub">· {g.city}</span></span>
            <span className="text-gd-green">{g.member_count} members</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WAHealth() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/master/wa-health').then((r) => setD(r.data)); }, []);
  if (!d) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="card p-0 overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead><tr><th className="th">Template</th><th className="th">Sent</th><th className="th">Failed</th><th className="th">Success rate</th></tr></thead>
          <tbody>{d.templates.map((t) => {
            const rate = t.total ? Math.round(t.sent / t.total * 100) : 0;
            return (
              <tr key={t.template_name}>
                <td className="td font-mono text-xs">{t.template_name}</td>
                <td className="td text-gd-green">{t.sent}</td>
                <td className="td text-gd-red">{t.failed}</td>
                <td className="td"><span className={rate > 90 ? 'text-gd-green' : 'text-gd-amber'}>{rate}%</span></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      {d.recent_failures.length > 0 && (
        <div className="card">
          <div className="text-sm font-medium text-gd-red mb-2">Recent failures</div>
          {d.recent_failures.slice(0, 8).map((f, i) => (
            <div key={i} className="text-xs py-1.5 border-b border-gd-border/30 last:border-0">
              <span className="font-mono">{f.template_name}</span> → {f.recipient_phone}
              <div className="text-gd-sub">{f.error_detail?.slice(0, 90)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Coupons() {
  const [coupons, setCoupons] = useState(null);
  const [add, setAdd] = useState(false);
  const [f, setF] = useState({ code: '', discount_pct: 20, max_uses: 100 });
  const toast = useToast();
  const load = () => api.get('/master/coupons').then((r) => setCoupons(r.data.coupons));
  useEffect(() => { load(); }, []);

  const create = async () => {
    try { await api.post('/master/coupons', f); toast('Coupon created'); setAdd(false); load(); }
    catch (e) { toast(e.response?.data?.error || 'Failed', 'error'); }
  };

  return (
    <div>
      <button className="btn-green mb-3" onClick={() => setAdd(true)}>+ New Coupon</button>
      {!coupons ? <Spinner /> : coupons.length === 0 ? <Empty msg="No coupons" /> : (
        <div className="grid md:grid-cols-3 gap-3">
          {coupons.map((c) => (
            <div key={c.id} className={`card ${!c.is_active && 'opacity-50'}`}>
              <div className="flex justify-between mb-1">
                <code className="text-gd-green font-bold">{c.code}</code>
                <StatusBadge status={c.is_active ? 'active' : 'suspended'} />
              </div>
              <div className="text-xs text-gd-sub">{c.discount_pct}% off · {c.uses}/{c.max_uses} used{c.expires_at ? ` · expires ${fmtDate(c.expires_at)}` : ''}</div>
            </div>
          ))}
        </div>
      )}
      <Modal open={add} onClose={() => setAdd(false)} title="New coupon">
        <Field label="Code"><input className="input uppercase" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="LAUNCH20" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Discount %"><input type="number" className="input" value={f.discount_pct} onChange={(e) => setF({ ...f, discount_pct: e.target.value })} /></Field>
          <Field label="Max uses"><input type="number" className="input" value={f.max_uses} onChange={(e) => setF({ ...f, max_uses: e.target.value })} /></Field>
        </div>
        <button className="btn-green w-full" disabled={!f.code} onClick={create}>Create</button>
      </Modal>
    </div>
  );
}

function Analytics() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/master/analytics').then((r) => setD(r.data)); }, []);
  if (!d) return <Spinner />;
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard label="Cancellations (90d)" value={d.cancelled_90d} color="text-gd-red" />
        <StatCard label="AI plans this month" value={d.ai_plans_this_month} color="text-gd-purple" />
        <StatCard label="Est. AI cost" value={fmtMoney(d.ai_cost_estimate)} color="text-gd-amber" />
      </div>
      <div className="card">
        <div className="text-sm font-medium text-gd-head mb-2">Top AI-usage gyms</div>
        {d.top_ai_gyms.length === 0 ? <div className="text-xs text-gd-sub">No AI plans generated yet</div> :
          d.top_ai_gyms.map((g, i) => (
            <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gd-border/30 last:border-0">
              <span>{g.name}</span><span className="text-gd-purple">{g.plans} plans</span>
            </div>
          ))}
      </div>
    </div>
  );
}
