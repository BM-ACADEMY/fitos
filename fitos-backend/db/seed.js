/**
 * FitOS seed script — creates test gym + trainers + members + data.
 * Run: node db/seed.js  (or: railway run node db/seed.js)
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const db = require('./index');

async function seed() {
  console.log('[SEED] Starting...');

  // 1. Test gym (premium so all features testable)
  const gymQ = await db.query(
    `INSERT INTO gyms (slug, name, owner_name, phone, city, address, plan)
     VALUES ('iron-zone-test', 'Iron Zone Gym', 'Rajan Kumar', '9876543210', 'Pondicherry', '123 Beach Road', 'premium')
     ON CONFLICT (phone) DO UPDATE SET plan='premium'
     RETURNING id`);
  const gymId = gymQ.rows[0].id;
  console.log('[SEED] Gym:', gymId);

  // 2. Gym membership plans
  await db.query(`DELETE FROM gym_plans WHERE gym_id=$1`, [gymId]);
  await db.query(
    `INSERT INTO gym_plans (gym_id, name, duration_months, price) VALUES
     ($1,'Monthly',1,499), ($1,'Quarterly',3,1299), ($1,'Half-Yearly',6,2399), ($1,'Annual',12,4499)`,
    [gymId]);

  // 3. Trainers
  const t1 = await db.query(
    `INSERT INTO trainers (gym_id, name, phone, specialization, base_salary, pt_commission_pct)
     VALUES ($1,'Ravi Kumar','9876500001','Strength & Bodybuilding',18000,15) RETURNING id`, [gymId]);
  const t2 = await db.query(
    `INSERT INTO trainers (gym_id, name, phone, specialization, base_salary, pt_commission_pct)
     VALUES ($1,'Meena Devi','9876500002','Weight Loss & Toning',16000,12) RETURNING id`, [gymId]);
  const trainer1 = t1.rows[0].id, trainer2 = t2.rows[0].id;
  console.log('[SEED] Trainers:', trainer1, trainer2);

  // 4. Members (5 mixed)
  const memberDefs = [
    ['Arjun Kumar',    '9876511111', 'male',   '1998-03-15', 'muscle_gain', 'beginner',     trainer1, 2],
    ['Priya Lakshmi',  '9876511112', 'female', '1995-07-22', 'pcod',        'beginner',     trainer2, 1],
    ['Karthik Raj',    '9876511113', 'male',   '1992-11-08', 'strength',    'intermediate', trainer1, 3],
    ['Divya Nair',     '9876511114', 'female', '1999-01-30', 'weight_loss', 'beginner',     trainer2, 1],
    ['Vel Murugan',    '9876511115', 'male',   '1990-06-12', 'fitness',     'advanced',     trainer1, 6],
  ];

  const memberIds = [];
  for (const [name, phone, gender, dob, goal, level, trainerId, months] of memberDefs) {
    const refTok = Math.random().toString(36).slice(2, 8).toUpperCase();
    const mQ = await db.query(
      `INSERT INTO members (gym_id, trainer_id, name, phone, gender, dob, goal, fitness_level,
        plan, plan_duration, expires_at, referral_token, last_checkin_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'monthly',$9,
         CURRENT_DATE + ($9 || ' months')::interval, $10, CURRENT_DATE)
       RETURNING id`,
      [gymId, trainerId, name, phone, gender, dob, goal, level, months, refTok]);
    const mid = mQ.rows[0].id;
    const qrToken = jwt.sign({ member_id: mid, gym_id: gymId }, process.env.JWT_SECRET);
    await db.query('UPDATE members SET qr_token=$1 WHERE id=$2', [qrToken, mid]);
    memberIds.push(mid);
  }
  console.log('[SEED] Members:', memberIds.length);

  // 5. Payments
  for (let i = 0; i < 3; i++) {
    const amt = 499;
    const gst = Math.round(amt * 0.18 * 100) / 100;
    await db.query(
      `INSERT INTO payments (gym_id, member_id, amount, gst_amount, total_amount, method,
        plan_months, invoice_number, status, paid_at)
       VALUES ($1,$2,$3,$4,$5,$6,1,$7,'paid', NOW() - ($8 || ' days')::interval)`,
      [gymId, memberIds[i], amt, gst, Math.round((amt + gst) * 100) / 100, i === 0 ? 'cash' : 'upi',
       `FIT-${String(i + 1).padStart(5, '0')}`, i * 3]);
  }

  // 6. Check-ins (today + past days)
  for (let i = 0; i < 3; i++) {
    await db.query(
      `INSERT INTO check_ins (gym_id, member_id, method, checked_in_at)
       VALUES ($1,$2,$3, NOW() - ($4 || ' hours')::interval)`,
      [gymId, memberIds[i], i % 2 === 0 ? 'qr' : 'manual', i * 2]);
  }

  // 7. Expenses
  await db.query(
    `INSERT INTO expenses (gym_id, category, description, amount) VALUES
     ($1,'rent','Monthly gym rent',25000),
     ($1,'electricity','EB bill June',8000),
     ($1,'equipment','Dumbbell set replacement',4500)`, [gymId]);

  // 8. PT package + session
  const pkQ = await db.query(
    `INSERT INTO pt_packages (gym_id, member_id, trainer_id, total_sessions, price_per_session, total_price)
     VALUES ($1,$2,$3,10,1500,15000) RETURNING id`, [gymId, memberIds[0], trainer1]);
  await db.query(
    `INSERT INTO pt_sessions (package_id, gym_id, scheduled_at)
     VALUES ($1,$2, NOW() + INTERVAL '1 day')`, [pkQ.rows[0].id, gymId]);

  // 9. Trial booking
  await db.query(
    `INSERT INTO trial_bookings (gym_id, name, phone, gender, goal, preferred_date, source)
     VALUES ($1,'Meenakshi S','9876522222','female','weight_loss', CURRENT_DATE + 1, 'instagram')`,
    [gymId]);

  // 10. Trainer attendance (this month)
  for (let d = 1; d <= 5; d++) {
    await db.query(
      `INSERT INTO trainer_attendance (trainer_id, gym_id, date, status)
       VALUES ($1,$2, CURRENT_DATE - $3, 'present')
       ON CONFLICT (trainer_id, date) DO NOTHING`, [trainer1, gymId, d]);
  }

  console.log('\n[SEED] ✅ Done! Test logins:');
  console.log('  Gym Owner : 9876543210  → /login');
  console.log('  Trainer   : 9876500001  → /login');
  console.log('  Member    : 9876511111  → /member');
  console.log('  Master    : 9403892971  → /master  (Kamar, seeded in schema.sql)');
  process.exit(0);
}

seed().catch((e) => { console.error('[SEED] Failed:', e.message); process.exit(1); });
