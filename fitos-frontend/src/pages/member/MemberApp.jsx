import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../api/client';
import { useAuth } from '../../store/auth';
import { Field, useToast, fmtDate, fmtMoney, Spinner } from '../../components/ui';

export default function MemberApp() {
  const { token, user, setAuth, logout } = useAuth();
  const isMember = token && user?.role === 'member';
  return isMember ? <MemberHome /> : <MemberLogin onDone={() => {}} />;
}

function MemberLogin() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone');
  const [busy, setBusy] = useState(false);
  const { setAuth } = useAuth();
  const toast = useToast();

  const send = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/auth/send-otp', { phone });
      if (data.role !== 'member') { toast('This app is for members. Owners: use /login', 'error'); setBusy(false); return; }
      setStep('otp');
      if (data.dev_otp) setOtp(data.dev_otp);
    } catch (e) { toast(e.response?.data?.error || 'Failed', 'error'); }
    setBusy(false);
  };
  const verify = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, otp });
      setAuth(data.token, data.user);
    } catch (e) { toast(e.response?.data?.error || 'Invalid OTP', 'error'); }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-xs text-center">
        <div className="text-gd-green font-bold text-2xl mb-1">FitOS</div>
        <div className="text-xs text-gd-sub mb-5">Member app</div>
        {step === 'phone' ? <>
          <input className="input mb-3 text-center" placeholder="Your phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button className="btn-green w-full" disabled={busy || phone.length < 10} onClick={send}>Get OTP</button>
        </> : <>
          <input className="input mb-3 text-center tracking-[0.4em]" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} />
          <button className="btn-green w-full" disabled={busy || otp.length !== 6} onClick={verify}>Login</button>
        </>}
      </div>
    </div>
  );
}

function MemberHome() {
  const [tab, setTab] = useState('qr');
  const [me, setMe] = useState(null);
  const [att, setAtt] = useState(null);
  const [pays, setPays] = useState(null);
  const [refInfo, setRefInfo] = useState(null);
  const { logout } = useAuth();
  const toast = useToast();

  useEffect(() => {
    api.get('/member/me').then((r) => setMe(r.data.member));
    api.get('/member/attendance').then((r) => setAtt(r.data));
    api.get('/member/payments').then((r) => setPays(r.data.payments));
    api.get('/member/referral').then((r) => setRefInfo(r.data)).catch(() => {});
  }, []);

  if (!me) return <Spinner />;

  return (
    <div className="min-h-screen pb-20 max-w-md mx-auto">
      <div className="bg-[#0B0F18] border-b border-gd-border px-4 py-3 flex justify-between items-center">
        <div>
          <div className="text-gd-green font-bold">FitOS · {me.gym_name}</div>
          <div className="text-[10px] text-gd-sub">{me.name}</div>
        </div>
        <button className="text-xs text-gd-sub" onClick={logout}>Logout</button>
      </div>

      <div className="p-4">
        {tab === 'qr' && (
          <div className="card text-center">
            <div className="text-sm text-gd-head font-medium mb-1">{me.name}</div>
            <div className="text-xs text-gd-sub mb-4">{me.plan} · expires {fmtDate(me.expires_at)} · <span className={me.days_remaining <= 7 ? 'text-gd-red' : 'text-gd-green'}>{me.days_remaining}d left</span></div>
            <div className="bg-white p-4 rounded-xl inline-block mb-3">
              <QRCodeSVG value={me.qr_token || 'no-token'} size={190} />
            </div>
            <div className="text-xs text-gd-sub">Show this QR at the gym entrance to check in</div>
            {refInfo && (
              <div className="mt-4 p-3 bg-gd-blue/10 border border-gd-blue/30 rounded-lg">
                <div className="text-xs text-gd-blue font-medium mb-1">🎁 Share & earn — {refInfo.referral_count} referred</div>
                <button className="btn-outline !py-1 text-xs w-full" onClick={() => { navigator.clipboard.writeText(refInfo.referral_link); toast('Referral link copied!'); }}>Copy my referral link</button>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-3">
            <div className="card">
              <div className="text-sm font-medium text-gd-head mb-2">Check-ins — {att?.this_month ?? 0} this month</div>
              {(att?.check_ins || []).slice(0, 15).map((c, i) => (
                <div key={i} className="flex justify-between text-xs py-1.5 border-b border-gd-border/30 last:border-0">
                  <span>{fmtDate(c.checked_in_at)}</span>
                  <span className="text-gd-sub">{new Date(c.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="text-sm font-medium text-gd-head mb-2">Payments</div>
              {(pays || []).map((p) => (
                <div key={p.id} className="flex justify-between text-xs py-1.5 border-b border-gd-border/30 last:border-0">
                  <span>{fmtDate(p.paid_at)} · {p.invoice_number}</span>
                  <span className="text-gd-green">{fmtMoney(p.total_amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'plan' && <MemberPlans />}
      </div>

      <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto bg-[#0B0F18] border-t border-gd-border flex">
        {[['qr', '🎫', 'QR Code'], ['plan', '📋', 'My Plan'], ['history', '📅', 'History']].map(([k, ic, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex-1 py-3 text-center ${tab === k ? 'text-gd-green' : 'text-gd-sub'}`}>
            <div>{ic}</div><div className="text-[10px]">{l}</div>
          </button>
        ))}
      </nav>
    </div>
  );
}

function MemberPlans() {
  const [plans, setPlans] = useState(null);
  useEffect(() => { api.get('/member/plans').then((r) => setPlans(r.data.plans)); }, []);
  if (!plans) return <Spinner />;
  if (!plans.length) return <div className="card text-center text-xs text-gd-sub py-8">No workout plan yet.<br />Ask your trainer to generate one!</div>;
  const p = plans[0];
  const wp = p.plan_data?.weekly_plan;
  const diet = p.diet_data;
  return (
    <div className="space-y-3">
      {wp && (
        <div className="card">
          <div className="text-sm font-medium text-gd-purple mb-2">⚡ My workout plan</div>
          {wp.map((d) => (
            <details key={d.day} className="bg-gd-bg rounded-lg p-2.5 mb-1.5">
              <summary className="text-xs cursor-pointer"><span className="text-gd-purple font-medium">{d.day}</span> — {d.focus}</summary>
              <div className="mt-1.5 space-y-1">
                {d.exercises?.map((ex, i) => <div key={i} className="text-[11px] text-gd-text">{ex.name} — {ex.sets}×{ex.reps}</div>)}
              </div>
            </details>
          ))}
        </div>
      )}
      {diet?.meals && (
        <div className="card">
          <div className="text-sm font-medium text-gd-green mb-2">🍛 My diet plan</div>
          {diet.meals.map((m, i) => (
            <div key={i} className="bg-gd-bg rounded-lg p-2.5 mb-1.5 text-[11px]">
              <div className="text-gd-green font-medium">{m.time} · {m.meal}</div>
              <div className="text-gd-text">🌱 {m.veg_option}</div>
              <div className="text-gd-text">🍗 {m.nonveg_option}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
