import { useEffect, useState } from 'react';
import api from '../api/client';
import { Field, useToast, Spinner } from '../components/ui';

export default function AIPlan() {
  const [members, setMembers] = useState([]);
  const [sel, setSel] = useState('');
  const [plan, setPlan] = useState(null);
  const [diet, setDiet] = useState(null);
  const [planId, setPlanId] = useState(null);
  const [busy, setBusy] = useState('');
  const [gated, setGated] = useState(false);
  const toast = useToast();

  useEffect(() => { api.get('/members', { params: { status: 'active' } }).then((r) => setMembers(r.data.members)); }, []);
  const member = members.find((m) => m.id === sel);

  const genWorkout = async () => {
    setBusy('workout');
    try {
      const { data } = await api.post('/ai/workout-plan', { member_id: sel });
      setPlan(data.plan); setPlanId(data.plan_id); setGated(false);
      toast('Workout plan generated ⚡');
    } catch (e) {
      if (e.response?.status === 403) setGated(true);
      else toast(e.response?.data?.error || 'Generation failed', 'error');
    }
    setBusy('');
  };

  const genDiet = async () => {
    setBusy('diet');
    try {
      const { data } = await api.post('/ai/diet-plan', { member_id: sel, plan_id: planId });
      setDiet(data.diet); toast('Diet plan generated 🍛');
    } catch (e) { toast(e.response?.data?.error || 'Failed', 'error'); }
    setBusy('');
  };

  const sendWA = async () => {
    try { await api.post('/ai/send-plan', { plan_id: planId }); toast('Sent to member via WhatsApp 📱'); }
    catch { toast('Send failed', 'error'); }
  };

  if (gated) return (
    <div className="card max-w-md mx-auto mt-16 text-center">
      <div className="text-2xl mb-2">⚡</div>
      <div className="text-gd-head font-semibold mb-1">AI Plans need Premium</div>
      <div className="text-xs text-gd-sub mb-4">Claude-powered workout + Tamil diet plans unlock on AI Premium (₹799/mo).</div>
      <a href="/upgrade" className="btn-green inline-block">Upgrade →</a>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-gd-head font-semibold text-lg">AI Plans</h1>
        <span className="badge-purple">Premium · Claude AI</span>
      </div>

      <div className="card mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Field label="Select member"><select className="input" value={sel} onChange={(e) => { setSel(e.target.value); setPlan(null); setDiet(null); }}>
            <option value="">Choose…</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.goal}</option>)}
          </select></Field>
        </div>
        {member && <div className="flex gap-1 pb-3">
          <span className="badge-blue">{member.gender}</span>
          <span className="badge-blue">{member.goal}</span>
          <span className="badge-blue">{member.fitness_level}</span>
        </div>}
        <div className="flex gap-2 pb-3">
          <button className="btn bg-gd-purple text-white" disabled={!sel || busy} onClick={genWorkout}>{busy === 'workout' ? 'Generating…' : '⚡ Workout plan'}</button>
          <button className="btn-green" disabled={!sel || busy} onClick={genDiet}>{busy === 'diet' ? 'Generating…' : '🍛 Diet plan'}</button>
        </div>
      </div>

      {plan && (
        <div className="card mb-4 border-gd-purple/40">
          <div className="text-sm font-semibold text-gd-purple mb-3">⚡ 7-Day Workout Plan</div>
          <div className="grid md:grid-cols-2 gap-2">
            {plan.weekly_plan?.map((d) => (
              <details key={d.day} className="bg-gd-bg rounded-lg p-3">
                <summary className="cursor-pointer text-sm"><span className="text-gd-purple font-medium">{d.day}</span> — {d.focus} <span className="text-xs text-gd-sub">({d.duration_mins}min)</span></summary>
                <div className="mt-2 space-y-1">
                  {d.cardio && <div className="text-xs text-gd-sub">Cardio: {d.cardio}</div>}
                  {d.exercises?.map((ex, i) => (
                    <div key={i} className="text-xs border-b border-gd-border/30 pb-1">
                      <span className="text-gd-text font-medium">{ex.name}</span> — {ex.sets}×{ex.reps} · rest {ex.rest_seconds}s
                      {ex.notes && <div className="text-gd-sub">{ex.notes}</div>}
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
          {plan.tips && <div className="text-xs text-gd-sub mt-3">💡 {plan.tips.join(' · ')}</div>}
        </div>
      )}

      {diet && (
        <div className="card mb-4 border-gd-green/40">
          <div className="text-sm font-semibold text-gd-green mb-1">🍛 Tamil Diet Plan</div>
          <div className="text-xs text-gd-sub mb-3">{diet.daily_calories_target} kcal · {diet.daily_protein_target_g}g protein daily</div>
          <div className="grid md:grid-cols-2 gap-2">
            {diet.meals?.map((m, i) => (
              <div key={i} className="bg-gd-bg rounded-lg p-3 text-xs">
                <div className="text-gd-green font-medium mb-1">{m.time} · {m.meal} <span className="text-gd-sub">({m.calories} kcal · {m.protein_g}g)</span></div>
                <div className="text-gd-text">🌱 {m.veg_option}</div>
                <div className="text-gd-text mt-0.5">🍗 {m.nonveg_option}</div>
              </div>
            ))}
          </div>
          {diet.hydration && <div className="text-xs text-gd-sub mt-2">💧 {diet.hydration}</div>}
        </div>
      )}

      {planId && (plan || diet) && <button className="btn bg-gd-purple text-white w-full max-w-md" onClick={sendWA}>📱 Send plan to member via WhatsApp</button>}
    </div>
  );
}
