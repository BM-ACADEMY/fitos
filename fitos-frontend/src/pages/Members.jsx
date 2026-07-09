import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Tabs, Spinner, Empty, StatusBadge, fmtDate } from '../components/ui';

export default function Members() {
  const [members, setMembers] = useState(null);
  const [tab, setTab] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const status = tab === 'All' ? '' : tab.toLowerCase();
    const t = setTimeout(() => {
      api.get('/members', { params: { status, search } }).then((r) => setMembers(r.data.members));
    }, 300);
    return () => clearTimeout(t);
  }, [tab, search]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-gd-head font-semibold text-lg">Members</h1>
        <Link to="/members/add" className="btn-green">+ Add Member</Link>
      </div>
      <input className="input mb-3" placeholder="🔍 Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <Tabs tabs={['All', 'Active', 'Expired', 'Suspended']} active={tab} onChange={setTab} />

      {!members ? <Spinner /> : members.length === 0 ? <Empty msg="No members found" /> : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead><tr>
              <th className="th">Name</th><th className="th">Phone</th><th className="th">Plan</th>
              <th className="th">Expiry</th><th className="th">Status</th><th className="th">Trainer</th>
            </tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-gd-bg/50">
                  <td className="td"><Link to={`/members/${m.id}`} className="font-medium text-gd-head hover:text-gd-green">{m.name}</Link></td>
                  <td className="td text-gd-sub">{m.phone}</td>
                  <td className="td"><span className="badge-blue">{m.plan}</span></td>
                  <td className="td">{fmtDate(m.expires_at)}</td>
                  <td className="td"><StatusBadge status={m.status} /></td>
                  <td className="td text-gd-sub">{m.trainer_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
