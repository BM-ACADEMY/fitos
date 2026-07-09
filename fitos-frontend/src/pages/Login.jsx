import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../store/auth';
import { useToast, Field } from '../components/ui';

export default function Login({ master = false }) {
  const [mode, setMode] = useState('login'); // login | register
  const [step, setStep] = useState('phone'); // phone | otp
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [reg, setReg] = useState({ gym_name: '', owner_name: '', city: 'Pondicherry' });
  const [busy, setBusy] = useState(false);
  const { setAuth } = useAuth();
  const toast = useToast();
  const nav = useNavigate();

  const sendOtp = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/auth/send-otp', { phone });
      setStep('otp');
      if (data.dev_otp) { setOtp(data.dev_otp); toast(`Dev OTP: ${data.dev_otp}`); }
      else toast('OTP sent via WhatsApp');
    } catch (e) { toast(e.response?.data?.error || 'Failed to send OTP', 'error'); }
    setBusy(false);
  };

  const verify = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, otp });
      setAuth(data.token, data.user);
      const r = data.user.role;
      if (master && !['master_admin', 'super_admin'].includes(r)) { toast('Not a master admin', 'error'); setBusy(false); return; }
      nav(r === 'member' ? '/member' : ['master_admin', 'super_admin'].includes(r) ? '/master/panel' : '/dashboard');
    } catch (e) { toast(e.response?.data?.error || 'Invalid OTP', 'error'); }
    setBusy(false);
  };

  const register = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/auth/register-gym', { ...reg, phone });
      setAuth(data.token, { role: 'gym_admin', id: data.gym.id, gym_id: data.gym.id, name: reg.owner_name });
      toast('Gym registered! 14-day free trial started 🎉');
      nav('/dashboard');
    } catch (e) { toast(e.response?.data?.error || 'Registration failed', 'error'); }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <div className="text-center mb-5">
          <div className="text-gd-green font-bold text-2xl">FitOS</div>
          <div className="text-xs text-gd-sub">{master ? 'Master Admin' : mode === 'register' ? 'Register your gym — 14-day free trial' : 'Gym management, simplified'}</div>
        </div>

        {mode === 'register' && !master ? (
          <>
            <Field label="Gym name"><input className="input" value={reg.gym_name} onChange={(e) => setReg({ ...reg, gym_name: e.target.value })} placeholder="Iron Zone Gym" /></Field>
            <Field label="Owner name"><input className="input" value={reg.owner_name} onChange={(e) => setReg({ ...reg, owner_name: e.target.value })} placeholder="Your name" /></Field>
            <Field label="Phone"><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" /></Field>
            <Field label="City"><input className="input" value={reg.city} onChange={(e) => setReg({ ...reg, city: e.target.value })} /></Field>
            <button className="btn-green w-full" disabled={busy || !reg.gym_name || !phone} onClick={register}>Start free trial →</button>
            <div className="text-center text-xs text-gd-sub mt-3">Already registered? <button className="text-gd-green" onClick={() => setMode('login')}>Login</button></div>
          </>
        ) : step === 'phone' ? (
          <>
            <Field label="Phone number"><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" onKeyDown={(e) => e.key === 'Enter' && sendOtp()} /></Field>
            <button className="btn-green w-full" disabled={busy || phone.length < 10} onClick={sendOtp}>Get OTP via WhatsApp</button>
            {!master && <div className="text-center text-xs text-gd-sub mt-3">New gym? <button className="text-gd-green" onClick={() => setMode('register')}>Register free →</button></div>}
          </>
        ) : (
          <>
            <Field label={`OTP sent to ${phone}`}><input className="input text-center tracking-[0.5em] text-lg" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && verify()} /></Field>
            <button className="btn-green w-full" disabled={busy || otp.length !== 6} onClick={verify}>Verify & Login</button>
            <button className="btn-ghost w-full mt-2" onClick={() => setStep('phone')}>← Change number</button>
          </>
        )}
      </div>
    </div>
  );
}
