import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Field, useToast } from '../components/ui';

const GOALS = [['weight_loss','Weight loss / எடை குறைப்பு'],['muscle_gain','Muscle gain'],['toning','Toning'],['strength','Strength'],['fitness','General fitness'],['pcod','PCOD-friendly']];
const SOURCES = ['walk_in','instagram','whatsapp','referral','meta_ad','google','online'];

export default function AddMember() {
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ name:'', phone:'', gender:'male', dob:'', goal:'fitness', fitness_level:'beginner',
    health_notes:'', enrollment_source:'walk_in', plan:'', plan_duration:1, trainer_id:'' });
  const [plans, setPlans] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const nav = useNavigate();

  useEffect(() => {
    api.get('/gym-plans').then((r) => { setPlans(r.data.plans); if (r.data.plans[0]) setF((x) => ({ ...x, plan: r.data.plans[0].name, plan_duration: r.data.plans[0].duration_months })); });
    api.get('/trainers').then((r) => setTrainers(r.data.trainers)).catch(() => {});
  }, []);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const pickPlan = (e) => {
    const p = plans.find((x) => x.name === e.target.value);
    setF({ ...f, plan: p.name, plan_duration: p.duration_months });
  };

  const save = async () => {
    setBusy(true);
    try {
      await api.post('/members', f);
      toast('Member added! WhatsApp sent ✅');
      nav('/members');
    } catch (e) { toast(e.response?.data?.error || 'Failed to add member', 'error'); }
    setBusy(false);
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-gd-head font-semibold text-lg mb-4">Add new member</h1>
      <div className="flex items-center gap-2 mb-5">
        {[1,2,3].map((n, i) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            {i > 0 && <div className={`h-0.5 flex-1 ${step >= n ? 'bg-gd-green' : 'bg-gd-border'}`} />}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= n ? 'bg-gd-green text-gd-bg' : 'bg-gd-border text-gd-sub'}`}>{n}</div>
            <span className={`text-xs ${step >= n ? 'text-gd-head' : 'text-gd-sub'}`}>{['Profile','Plan','Review'][n-1]}</span>
          </div>
        ))}
      </div>

      <div className="card">
        {step === 1 && <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full name *"><input className="input" value={f.name} onChange={set('name')} /></Field>
            <Field label="Phone *"><input className="input" value={f.phone} onChange={set('phone')} /></Field>
            <Field label="Gender"><select className="input" value={f.gender} onChange={set('gender')}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></Field>
            <Field label="Date of birth"><input type="date" className="input" value={f.dob} onChange={set('dob')} /></Field>
            <Field label="Goal"><select className="input" value={f.goal} onChange={set('goal')}>{GOALS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Fitness level"><select className="input" value={f.fitness_level} onChange={set('fitness_level')}><option>beginner</option><option>intermediate</option><option>advanced</option></select></Field>
            <Field label="Source"><select className="input" value={f.enrollment_source} onChange={set('enrollment_source')}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Health notes"><input className="input" value={f.health_notes} onChange={set('health_notes')} placeholder="Injuries, conditions…" /></Field>
          </div>
          <button className="btn-green w-full mt-2" disabled={!f.name || f.phone.length < 10} onClick={() => setStep(2)}>Continue →</button>
        </>}

        {step === 2 && <>
          <Field label="Membership plan"><select className="input" value={f.plan} onChange={pickPlan}>{plans.map((p) => <option key={p.id} value={p.name}>{p.name} — ₹{p.price} / {p.duration_months}mo</option>)}</select></Field>
          <Field label="Assign trainer"><select className="input" value={f.trainer_id} onChange={set('trainer_id')}><option value="">— None —</option>{trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
          <div className="flex gap-2 mt-2">
            <button className="btn-ghost flex-1" onClick={() => setStep(1)}>← Back</button>
            <button className="btn-green flex-1" onClick={() => setStep(3)}>Review →</button>
          </div>
        </>}

        {step === 3 && <>
          <div className="space-y-2 text-sm mb-4">
            {[['Name', f.name],['Phone', f.phone],['Gender', f.gender],['Goal', f.goal],['Level', f.fitness_level],['Plan', `${f.plan} (${f.plan_duration} months)`],['Trainer', trainers.find((t) => t.id === f.trainer_id)?.name || 'None'],['Source', f.enrollment_source]].map(([l, v]) => (
              <div key={l} className="flex justify-between border-b border-gd-border/30 pb-1.5"><span className="text-gd-sub">{l}</span><span className="text-gd-head">{v}</span></div>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => setStep(2)}>← Back</button>
            <button className="btn-green flex-1" disabled={busy} onClick={save}>Confirm & Save ✓</button>
          </div>
        </>}
      </div>
    </div>
  );
}
