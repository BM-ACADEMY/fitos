import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import AddMember from './pages/AddMember';
import MemberDetail from './pages/MemberDetail';
import Attendance from './pages/Attendance';
import Payments from './pages/Payments';
import Trainers from './pages/Trainers';
import Earnings from './pages/Earnings';
import PTSessions from './pages/PTSessions';
import Trials from './pages/Trials';
import Plans from './pages/Plans';
import Accounts from './pages/Accounts';
import Upgrade from './pages/Upgrade';
import Settings from './pages/Settings';
import AIPlan from './pages/AIPlan';
import Enroll from './pages/Enroll';
import MemberApp from './pages/member/MemberApp';
import MasterApp from './pages/master/MasterApp';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/master" element={<Login master />} />
        <Route path="/join/:slug" element={<Enroll />} />
        {/* Member PWA */}
        <Route path="/member" element={<MemberApp />} />
        {/* Master panel */}
        <Route path="/master/panel" element={<MasterApp />} />
        {/* Gym app (auth) */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/members/add" element={<AddMember />} />
          <Route path="/members/:id" element={<MemberDetail />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/trainers" element={<Trainers />} />
          <Route path="/earnings" element={<Earnings />} />
          <Route path="/pt" element={<PTSessions />} />
          <Route path="/trials" element={<Trials />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/upgrade" element={<Upgrade />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/ai" element={<AIPlan />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ToastProvider>
  );
}
