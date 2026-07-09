import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', roles: ['gym_admin', 'trainer'] },
  { to: '/members', label: 'Members', roles: ['gym_admin', 'trainer'] },
  { to: '/attendance', label: 'Attendance', roles: ['gym_admin', 'trainer'] },
  { to: '/payments', label: 'Payments', roles: ['gym_admin'] },
  { to: '/trainers', label: 'Trainers', roles: ['gym_admin'] },
  { to: '/earnings', label: 'Earnings', roles: ['gym_admin', 'trainer'] },
  { to: '/pt', label: 'PT Sessions', roles: ['gym_admin', 'trainer'] },
  { to: '/trials', label: 'Trials', roles: ['gym_admin'] },
  { to: '/plans', label: 'Plans', roles: ['gym_admin'] },
  { to: '/accounts', label: 'Accounts', roles: ['gym_admin'] },
  { to: '/ai', label: 'AI Plans', roles: ['gym_admin', 'trainer'], badge: 'AI' },
  { to: '/upgrade', label: 'Upgrade', roles: ['gym_admin'] },
  { to: '/settings', label: 'Settings', roles: ['gym_admin', 'trainer'] },
];

export default function Layout() {
  const { token, user, logout } = useAuth();
  const nav = useNavigate();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role === 'member') return <Navigate to="/member" replace />;

  const items = NAV.filter((n) => n.roles.includes(user?.role));

  return (
    <div className="flex min-h-screen">
      <aside className="w-52 bg-[#0B0F18] border-r border-gd-border flex flex-col fixed inset-y-0">
        <div className="px-4 py-4 border-b border-gd-border">
          <div className="text-gd-green font-bold text-lg">FitOS</div>
          <div className="text-[10px] text-gd-sub truncate">{user?.name} · {user?.role === 'gym_admin' ? 'Owner' : 'Trainer'}</div>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {items.map((n) => (
            <NavLink key={n.to} to={n.to}
              className={({ isActive }) => `flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                isActive ? 'bg-gd-green/10 text-gd-green border-l-2 border-gd-green' : 'text-gd-sub hover:text-gd-text'}`}>
              {n.label}
              {n.badge && <span className="badge-purple text-[9px]">{n.badge}</span>}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => { logout(); nav('/login'); }}
          className="m-3 btn-ghost text-xs">Logout</button>
      </aside>
      <main className="flex-1 ml-52 p-5 max-w-6xl">
        <Outlet />
      </main>
    </div>
  );
}
